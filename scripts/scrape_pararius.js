// scripts/scrape_pararius.js
// Scrape Pararius-stadspagina's -> detaildata per woning -> post in batches naar /api/ingest
// Houd rekening met sites/ToS; schroef limieten rustig op als alles werkt.

import fetch from "cross-fetch";
import * as cheerio from "cheerio";
import { chromium } from "playwright";

const START_URLS = [
  "https://www.pararius.nl/huurwoningen/amsterdam",
  // Voeg later toe:
  // "https://www.pararius.nl/huurwoningen/rotterdam",
  // "https://www.pararius.nl/huurwoningen/utrecht",
];

const MAX_LISTING_URLS_PER_CITY = 40;  // hou het even licht
const MAX_PAGES_PER_CITY = 2;

const INGEST_URL = process.env.INGEST_URL || "https://huurkans.vercel.app/api/ingest";
const INGEST_SECRET = process.env.INGEST_SECRET;

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

function extractCity(raw) {
  // Probeer stad uit locatietekst, bv. "Amsterdam - Centrum" -> "Amsterdam"
  if (!raw) return null;
  const t = raw.replace(/\s+/g, " ").trim();
  const parts = t.split(/[,-]/).map(s => s.trim()).filter(Boolean);
  return parts[0] || t || null;
}

async function findListingUrlsOnPage(url) {
  const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!resp.ok) throw new Error(`Fetch fail ${url}: ${resp.status}`);
  const html = await resp.text();
  const $ = cheerio.load(html);

  const urls = new Set();
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

    const title = (await page.locator("h1").first().textContent().catch(() => ""))?.trim() || "";
    const locationText =
      (await page.locator(".listing-detail-summary__location").first().textContent().catch(() => ""))?.trim() || "";

    const bodyText = (await page.locator("body").textContent().catch(() => "")) || "";

    const priceRaw =
      (await page.locator(".listing-detail-summary__price").first().textContent().catch(() => ""))?.trim() || "";
    const price = numberFrom(priceRaw);

    const m2Match = bodyText.match(/(\d{2,4})\s?m²|([0-9]{2,4})\s?m2/i);
    const area_m2 = m2Match ? parseInt((m2Match[1] || m2Match[2]).replace(/\D/g, ""), 10) : null;

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
    const og = await page.locator("meta[property='og:image']").getAttribute("content").catch(() => null);
    if (og) imgs.add(og);
    const imgEls = await page.locator("img").all();
    for (const el of imgEls) {
      const src =
        (await el.getAttribute("src").catch(() => null)) ||
        (await el.getAttribute("data-src").catch(() => null));
      if (src && !src.startsWith("data:")) imgs.add(src);
    }
    const images = unique(Array.from(imgs));
    const image_url = images[0] || null;

    // === BELANGRIJK: map naar jouw ingest/DB-schema ===
    const itemForIngest = {
      source: "pararius",
      source_id: url,          // uniek per bron
      url,
      title: title || null,
      description,
      price: price || null,    // jouw veldnaam = price
      city: extractCity(locationText),
      address: null,           // Pararius verbergt vaak exact adres -> laten we null
      area_m2,
      rooms,
      bedrooms,
      image_url,               // jouw veldnaam = image_url
      posted_at: null          // onbekend -> null
    };

    return itemForIngest;
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

      const detailUrls = Array.from(collected).slice(0, MAX_LISTING_URLS_PER_CITY);
      console.log("  Scraping detail pages:", detailUrls.length);

      for (const u of detailUrls) {
        const item = await scrapeDetail(browser, u);
        if (item) allItems.push(item);
        await sleep(400);
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  console.log("Total items scraped:", allItems.length);

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
    await sleep(400);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
