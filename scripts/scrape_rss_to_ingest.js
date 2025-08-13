// scripts/scrape_rss_to_ingest.js
// Doel: haal items uit een RSS feed en stuur ze naar jouw /api/ingest.
// Vereist ENV vars: FEED_URL, INGEST_ENDPOINT, INGEST_SECRET

import Parser from 'rss-parser';

const FEED_URL = process.env.FEED_URL;                // bv. https://example.com/feed.xml
const ENDPOINT = process.env.INGEST_ENDPOINT;         // bv. https://huurkans.vercel.app/api/ingest
const SECRET   = process.env.INGEST_SECRET;           // zelfde als in Vercel

if (!FEED_URL || !ENDPOINT || !SECRET) {
  console.error('Misconfig: zet FEED_URL, INGEST_ENDPOINT en INGEST_SECRET als environment variables.');
  process.exit(1);
}

function toPriceNumber(str = '') {
  // Haal cijfers uit bv. "€ 1.499 p/m" => 1499
  const n = parseInt(String(str).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function firstImage(html = '') {
  const match = String(html).match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : null;
}

function shortText(s = '', max = 280) {
  const t = String(s).replace(/<[^>]+>/g, '').trim();
  return t.length > max ? t.slice(0, max) + '…' : t;
}

async function main() {
  const parser = new Parser();
  const feed = await parser.parseURL(FEED_URL);

  // Zet RSS-items om naar jouw listing-model
  const items = (feed.items || []).map((it) => {
    const url   = it.link || it.guid || null;
    const title = it.title || '(zonder titel)';

    // Probeer simpele velden uit description/content te vissen
    const desc  = it.contentSnippet || it.content || it.summary || '';
    const img   = firstImage(it.content || it.summary || '');

    // Heel basic prijs/plaats detectie (optioneel, verschilt per feed)
    const price = toPriceNumber(desc);
    // Als feed geen city geeft, kun je hier een vaste waarde zetten of regex bouwen
    const city  = (it.categories && it.categories[0]) || null;

    return {
      url,
      title,
      description: shortText(desc, 400),
      price,
      city,
      image_url: img
    };
  })
  // filter junk/lege url’s
  .filter(x => x.url && x.title);

  if (!items.length) {
    console.log('Geen bruikbare items gevonden in feed.');
    return;
  }

  // POST naar je ingest endpoint (in één batch)
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ingest-secret': SECRET
    },
    body: JSON.stringify(items)
  });

  const json = await res.json();
  console.log('INGEST', res.status, json);
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
