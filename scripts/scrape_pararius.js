// scripts/scrape_pararius.js
// Snelle, robuuste scraper met harde limieten en timeouts.
// - Bezoekt 1..N overzichtspagina's van Pararius per CITY
// - Haalt maximaal DETAIL_LIMIT detailpagina's op
// - Stuurt resultaten naar je INGEST_ENDPOINT met INGEST_SECRET
//
// Vereist: Playwright (chromium) en Node 20+ (fetch is native)

import { chromium } from 'playwright';

// ---------- Config uit ENV met veilige defaults ----------
const CITY = process.env.CITY || 'amsterdam';
const PAGE_LIST_LIMIT = parseInt(process.env.PAGE_LIST_LIMIT || '1', 10);     // hoeveel overzichtspagina’s
const DETAIL_LIMIT   = parseInt(process.env.DETAIL_LIMIT || '15', 10);       // max detailpagina’s
const NAV_TIMEOUT_MS = parseInt(process.env.NAV_TIMEOUT_MS || '12000', 10);  // 12s per navigatie
const HARD_DEADLINE_MS = parseInt(process.env.HARD_DEADLINE_MS || '2400000', 10); // 40 min absolute cap

const INGEST_ENDPOINT = process.env.INGEST_ENDPOINT;
const INGEST_SECRET   = process.env.INGEST_SECRET;

if (!INGEST_ENDPOINT || !INGEST_SECRET) {
  console.error('INGEST_ENDPOINT en/of INGEST_SECRET ontbreken in ENV.');
  process.exit(1);
}

// ---------- Helpers ----------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function unique(arr) {
  return [...new Set(arr)];
}

// Pararius URL voor stad. We pakken huurwoningen in <CITY>.
function buildCityUrl(city, page = 1) {
  // basis: https://www.pararius.nl/huurwoningen/<city>
  // Pararius werkt met pagination als /page-2
  if (page <= 1) return `https://www.pararius.nl/huurwoningen/${encodeURIComponent(city)}`;
  return `https://www.pararius.nl/huurwoningen/${encodeURIComponent(city)}/page-${page}`;
}

// Heel simple extractors – we vallen terug op undefined als selectors niet matchen.
// Pararius past soms classes aan, dus we houden het defensief.
async function scrapeDetail(page, url) {
  try {
    await page.goto(url, { timeout: NAV_TIMEOUT_MS, waitUntil: 'domcontentloaded' });

    // Probeer title
    const title = (await page.locator('h1, .listing-detail-summary__title, [data-testid="detail-title"]').first().textContent({ timeout: 1000 }).catch(() => null))?.trim() || null;

    // Probeer prijs (euro bedragen op detailpagina)
    const priceText = (await page.locator('text=€').first().textContent({ timeout: 1000 }).catch(() => null)) || null;
    const price = priceText ? Number((priceText.match(/[\d\.\,]+/) || [])[0]?.replace(/\./g, '').replace(',', '.')) : null;

    // Probeer adres / plaats
    const address = (await page.locator('[data-testid="address"], .listing-detail-summary__address, .address').first().textContent({ timeout: 1000 }).catch(() => null))?.trim() || null;

    // Korte beschrijving
    const description = (await page.locator('[data-testid="description"], .listing-detail-description, article').first().textContent({ timeout: 1000 }).catch(() => null))?.trim() || null;

    // Oppervlakte & kamers (heuristiek: zoek naar m² en kamers in kenmerkentabel)
    const factsText = (await page.locator('body').textContent({ timeout: 500 }).catch(() => null)) || '';
    const areaMatch = factsText.match(/(\d{2,4})\s?m²/i);
    const area_m2 = areaMatch ? Number(areaMatch[1]) : null;

    const roomsMatch = factsText.match(/(\d+)\s?(kamers|kamer)/i);
    const rooms = roomsMatch ? Number(roomsMatch[1]) : null;

    // Eerste beeld (optioneel)
    const imageUrl = await page.locator('img').first().getAttribute('src').catch(() => null);

    return {
      ok: true,
      data: {
        url,
        title,
        price,
        city: CITY,
        address,
        area_m2,
        rooms,
        description,
        image_url: imageUrl || null,
      },
    };
  } catch (err) {
    return { ok: false, error: String(err), url };
  }
}

async function postIngest(item) {
  try {
    const res = await fetch(INGEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ingest-secret': INGEST_SECRET,
      },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ingest failed: ${res.status} ${text}`);
    }
    return true;
  } catch (e) {
    console.error('Ingest error:', e.message);
    return false;
  }
}

// ---------- Main ----------
(async () => {
  const t0 = Date.now();

  console.log(`City: ${CITY}`);
  console.log(`Limits: list pages=${PAGE_LIST_LIMIT}, detail=${DETAIL_LIMIT}, navTimeout=${NAV_TIMEOUT_MS}ms, hard cap=${HARD_DEADLINE_MS}ms`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.setDefaultTimeout(NAV_TIMEOUT_MS);

  const allDetailUrls = [];

  // 1) verzamel detail-urls vanaf overzichtspagina’s (met cap op pagina’s)
  for (let p = 1; p <= PAGE_LIST_LIMIT; p++) {
    const listUrl = buildCityUrl(CITY, p);
    const sinceStart = Date.now() - t0;
    if (sinceStart > HARD_DEADLINE_MS) {
      console.warn('Hard deadline bereikt tijdens lijst-collectie; stoppen.');
      break;
    }

    console.log(`List page: ${listUrl}`);
    try {
      await page.goto(listUrl, { timeout: NAV_TIMEOUT_MS, waitUntil: 'domcontentloaded' });

      // verzamel alle anchors met '/huurwoningen/' en niet de lijstpagina’s zelf
      const anchors = await page.locator('a').evaluateAll(nodes =>
        nodes
          .map(n => n.getAttribute('href'))
          .filter(Boolean)
      );

      const detail = anchors
        .filter(href => href && href.startsWith('/huurwoningen/') && !/\/page-\d+/.test(href))
        .map(href => (href.startsWith('http') ? href : `https://www.pararius.nl${href}`));

      const uniq = unique(detail);
      console.log(`  gevonden urls (uniq): ${uniq.length}`);

      allDetailUrls.push(...uniq);

      if (allDetailUrls.length >= DETAIL_LIMIT) break;
    } catch (e) {
      console.warn(`  list page error: ${e.message}`);
    }
    // kleine pauze om blokkade te voorkomen
    await sleep(300);
  }

  // beperken tot max DETAIL_LIMIT
  const targets = unique(allDetailUrls).slice(0, DETAIL_LIMIT);
  console.log(`Detail targets: ${targets.length}`);

  // 2) details scrapen met kleine concurrency (3)
  const results = [];
  const concurrency = 3;
  let i = 0;

  while (i < targets.length) {
    const sinceStart = Date.now() - t0;
    if (sinceStart > HARD_DEADLINE_MS) {
      console.warn('Hard deadline bereikt tijdens detail-scrape; stoppen.');
      break;
    }

    const chunk = targets.slice(i, i + concurrency);
    const pages = await Promise.all(chunk.map(() => context.newPage()));
    const settled = await Promise.allSettled(chunk.map((url, idx) => scrapeDetail(pages[idx], url)));
    await Promise.all(pages.map(p => p.close().catch(() => {})));

    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value?.ok) results.push(s.value.data);
    }

    i += concurrency;
  }

  console.log(`OK details: ${results.length}`);

  // 3) ingest posten (best-effort)
  let okCount = 0;
  for (const item of results) {
    const ok = await postIngest(item);
    if (ok) okCount++;
    await sleep(100);
  }
  console.log(`Ingest success: ${okCount}/${results.length}`);

  await browser.close();

  console.log('Done in', Math.round((Date.now() - t0) / 1000), 's');
  process.exit(0);
})();
