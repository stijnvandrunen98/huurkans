// scripts/scrape_pararius.js
// Doel: per stad Pararius-detailpagina's ophalen en rijk gevulde listings
// naar jouw /api/ingest sturen.
//
// Verwacht env variabelen (via GitHub Actions):
// - CITY             (bijv. "amsterdam", "rotterdam", "utrecht")
// - INGEST_URL       (bijv. https://huurkans.vercel.app/api/ingest)
// - INGEST_SECRET    (exact dezelfde als in je Ingest Tester)

import fetch from 'cross-fetch';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';

const CITY = (process.env.CITY || '').toLowerCase().trim();
const INGEST_URL = process.env.INGEST_URL;
const INGEST_SECRET = process.env.INGEST_SECRET;

if (!CITY) throw new Error('CITY ontbreekt');
if (!INGEST_URL) throw new Error('INGEST_URL ontbreekt');
if (!INGEST_SECRET) throw new Error('INGEST_SECRET ontbreekt');

const BASE = `https://www.pararius.nl/huurwoningen/${CITY}`;

// ——————————————————————————————————————————————————————
// Helpers
// ——————————————————————————————————————————————————————
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function cleanText(t) {
  return (t || '').replace(/\s+/g, ' ').trim();
}
function parsePrice(text) {
  // Zoekt "€ 1.499" of "€1.499" enz.
  const m = (text || '').match(/€\s?([\d\.\,]+)/);
  if (!m) return null;
  const raw = m[1].replace(/\./g, '').replace(',', '');
  const val = parseInt(raw, 10);
  return Number.isFinite(val) ? val : null;
}
function parseArea(text) {
  const m = (text || '').match(/(\d+)\s?m²/i);
  if (!m) return null;
  return parseInt(m[1], 10);
}
function parseBedrooms(text) {
  // pakt “2 kamers” of “3 slaapkamers”
  const m = (text || '').match(/(\d+)\s?(?:slaapkamers?|kamers?)/i);
  if (!m) return null;
  return parseInt(m[1], 10);
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
      'accept-language': 'nl-NL,nl;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`Fetch ${url} -> ${res.status}`);
  return await res.text();
}

// ——————————————————————————————————————————————————————
// Stap 1: verzamel detail-URL’s vanaf de stadspagina (paar pagina’s diep)
// ——————————————————————————————————————————————————————
async function collectDetailUrls(city, maxPages = 3) {
  const urls = new Set();

  for (let p = 1; p <= maxPages; p++) {
    const pageUrl = p === 1 ? BASE : `${BASE}/page-${p}`;
    try {
      const html = await fetchHtml(pageUrl);
      const $ = cheerio.load(html);

      // Ankers met detail-links. We gebruiken brede selector + filter op stad.
      $('a[href*="/huurwoningen/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (
          href.startsWith('/') &&
          href.includes(`/huurwoningen/${city}`) &&
          !href.includes('/kaart') &&
          !href.includes('/nieuwbouw') &&
          !href.includes('/project')
        ) {
          urls.add(`https://www.pararius.nl${href.split('?')[0]}`);
        }
      });
    } catch (e) {
      console.warn(`Pagina skip (${pageUrl}):`, e.message);
    }
    // klein pauze tussen pagina’s
    await sleep(500);
  }

  return [...urls];
}

// ——————————————————————————————————————————————————————
// Stap 2: detailpagina parsen
// ——————————————————————————————————————————————————————
function extractFromDetail(html) {
  const $ = cheerio.load(html);

  // Titels en beschrijving vaak ook als og:meta aanwezig.
  const title =
    cleanText($('h1').first().text()) ||
    cleanText($('meta[property="og:title"]').attr('content')) ||
    null;

  const description =
    cleanText($('.listing-detail-description, .description, [data-test="object-description"]').text()) ||
    cleanText($('meta[name="description"]').attr('content')) ||
    null;

  const image_url =
    $('meta[property="og:image"]').attr('content') ||
    $('img').first().attr('src') ||
    null;

  // Zoek in hele pagina naar prijs/m²/kamers, werkt robuust tegen layout-wijzigingen.
  const pageText = $('body').text();

  const price =
    parsePrice($('#price, .listing-detail-price, [data-test="price"]').text()) ||
    parsePrice(pageText);

  const area_m2 =
    parseArea($('.listing-features, .features, [data-test="features"]').text()) ||
    parseArea(pageText);

  const bedrooms =
    parseBedrooms($('.listing-features, .features, [data-test="features"]').text()) ||
    parseBedrooms(pageText);

  return { title, description, image_url, price, area_m2, bedrooms };
}

// ——————————————————————————————————————————————————————
// Stap 3: naar jouw ingest API sturen
// ——————————————————————————————————————————————————————
async function sendToIngest(payload) {
  const res = await fetch(INGEST_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // Zelfde headernaam als in je Ingest Tester:
      'x-ingest-secret': INGEST_SECRET,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Ingest ${res.status} ${t}`);
  }
}

// ——————————————————————————————————————————————————————
// Main
// ——————————————————————————————————————————————————————
(async () => {
  console.log(`Start scrape: ${CITY}`);
  const detailUrls = await collectDetailUrls(CITY, 3); // eerste 3 pagina’s
  console.log(`Gevonden detail-URL’s: ${detailUrls.length}`);

  // Beperk parallel requests zodat we binnen de GitHub Actions tijd blijven.
  const limit = pLimit(5);

  let success = 0;
  let fail = 0;

  await Promise.all(
    detailUrls.map((url) =>
      limit(async () => {
        try {
          const html = await fetchHtml(url);
          const fields = extractFromDetail(html);

          // Minimale set die jouw /api/ingest verwacht + extra velden.
          const payload = {
            url,
            title: fields.title,
            description: fields.description,
            city: CITY,
            price: fields.price ?? 0,
            area_m2: fields.area_m2,
            bedrooms: fields.bedrooms,
            image_url: fields.image_url,
            status: 'active',
          };

          await sendToIngest(payload);
          success++;
        } catch (e) {
          fail++;
          console.warn('Detail fout:', url, e.message);
        }
      })
    )
  );

  console.log(`Klaar. OK: ${success}  FOUT: ${fail}`);
})();
