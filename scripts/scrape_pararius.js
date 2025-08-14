// scripts/scrape_pararius.js
// Doel: enkele stadspagina's van Pararius ophalen, kaarten vinden, per detailpagina velden scrapen,
// en als batches posten naar jouw /api/ingest endpoint (met secret).
//
// Let op: altijd respecteer robots/voorwaarden van sites die je crawlt.

import fetch from "cross-fetch";
import * as cheerio from "cheerio";
import { chromium } from "playwright";

const START_URLS = [
  "https://www.pararius.nl/huurwoningen/amsterdam",
  // Voeg later evt. toe:
  // "https://www.pararius.nl/huurwoningen/rotterdam",
  // "https://www.pararius.nl/huurwoningen/utrecht",
];

// Limieten zodat je gratis minuten niet opbranden
const MAX_LISTING_URLS_PER_CITY = 50;   // per stad
const MAX_PAGES_PER_CITY = 2;           // aantal paginatiepagina’s per stad

// Ingest endpoint (van jouw live site)
const INGEST_URL = process.env.INGEST_URL || "https://huurkans.vercel.app/api/ingest";
// Secret voor je /api/ingest (zet je zo bij GitHub Secrets)
const INGEST_SECRET = process.env.INGEST_SECRET;

// Helper: wacht
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function numberFrom(str) {
  if (!str) return null;
  const m = String(str).match(/\d[\d.\s]*\d/);
  if (!m) return null;
  return parseInt(m[0].replace(/\D/g, ""), 10) || null;
}

function unique(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

async function findListingUrlsOnPage(url) {
  const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!resp.ok) throw new Error(`Fetch fail ${url}: ${resp.status}`);
  const html = await resp.text();
  const $ = cheerio.load(html);

  const urls = new Set();

  // Pararius kaartjes (a-tags naar detailpagina’s)
  $("a[href^='/huurwoningen/']").each((_, el) => {
    const href = $(el).attr("href");
    if (href && !href.includes("/project/") && !href.includes("/english")) {
      urls.add(new URL(href, "https://www.pararius.nl").toString());
    }
  });

  return Array.from(urls);
}

async function scrapeDetail(browser, url) {
  const page = await browser.newPage({ userAgent: "Mozilla/5.0" });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

    // Probeer content: titel, locatie
    const title = (await page.locator("h1").first().textContent().catch(() => ""))?.trim() || "";
    const location =
      (await page.locator(".listing-detail-summary__location").first().textContent().catch(() => ""))?.trim() || "";

    // Hele body text voor regex (m², kamers)
    const bodyText = (await page.locator("body").textContent().catch(() => "")) || "";

    const priceRaw =
      (await page.locator(".listing-detail-summary__price").first().textContent().catch(() => ""))?.trim() || "";
    const price_month = numberFrom(priceRaw);

    const m2Match = bodyText.match(/(\d{2,4})\s?m²|([0-9]{2,4})\s?m2/i);
    const surface_m2 = m2Match ? parseInt((m2Match[1] || m2Match[2]).replace(/\D/g, ""), 10) : null;

    const roomsMatch = bodyText.match(/(\d+)\s*(?:kamer|kamers)/i);
    const bedroomsMatch = bodyText.match(/(\d+)\s*(?:slaapkamer|slaapkamers)/i);
    const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : null;
    const bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1], 10) : null;

    const description =
      (
        await page
          .locator(".listing-detail-description, [data-test*='description']")
          .first()
          .textContent()
          .catch(() => "")
      )?.trim() || "";

    // Afbeeldingen
    const imgs = new Set();
    // og:image
    const og = await page.locator("meta[property='og:image']").getAttribute("content").catch(() => null);
    if (og) imgs.add(og);
    // img tags
    const imgEls = await page.locator("img").all();
    for (const el of imgEls) {
      const src = (await el.getAttribute("src").catch(() => null)) || (await el.getAttribute("data-src").catch(() => null));
      if (src && !src.startsWith("data:")) imgs.add(src);
    }

    const item = {
      source: "pararius",
      url,
      title,
      location,
      price_month: price_month || null,
      surface_m2,
      rooms,
      bedrooms,
      description,
      images: unique(Array.from(imgs)),
    };

    return item;
  } catch (e) {
    console.error("Detail error:", url, e.message);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function run() {
  if (!INGEST_SECRET) {
    console.error("INGEST_SECRET ontbreekt. Zet die in GitHub Secrets.");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const allItems = [];

  try {
    for (const cityUrl of START_URLS) {
      console.log("City start:", cityUrl);
      let collected = new Set();
      let pageNum = 1;

      while (pageNum <= MAX_PAGES_PER_CITY) {
        const pagedUrl = pageNum === 1 ? cityUrl : `${cityUrl}/page-${pageNum}`;
        console.log("  Fetch:", pagedUrl);
        let urls = [];
        try {
          urls = await findListingUrlsOnPage(pagedUrl);
        } catch (e) {
          console.error("  List page error:", e.message);
          break;
        }

        urls.forEach(u => collected.add(u));
        console.log(`  found ${urls.length} links (total uniq: ${collected.size})`);

        if (collected.size >= MAX_LISTING_URLS_PER_CITY || urls.length === 0) break;
        pageNum++;
        await sleep(1000);
      }

      // Beperk en scrape details
      const detailUrls = Array.from(collected).slice(0, MAX_LISTING_URLS_PER_CITY);
      console.log("  Scraping detail pages:", detailUrls.length);

      for (const u of detailUrls) {
        const item = await scrapeDetail(browser, u);
        if (item) allItems.push(item);
        await sleep(500); // even lief zijn
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  console.log("Total items:", allItems.length);

  // Batch posten (per 25)
  const batchSize = 25;
  for (let i = 0; i < allItems.length; i += batchSize) {
    const batch = allItems.slice(i, i + batchSize);
    console.log(`POST batch ${i / batchSize + 1} (${batch.length} items) -> ${INGEST_URL}`);

    const resp = await fetch(INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-secret": INGEST_SECRET
      },
      body: JSON.stringify({ items: batch })
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Ingest error:", resp.status, t);
    } else {
      console.log("Ingest OK");
    }
    await sleep(500);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
