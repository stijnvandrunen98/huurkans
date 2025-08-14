// CommonJS versie (werkt zonder "type":"module")
const Parser = require('rss-parser');
const crypto = require('crypto');
const fetch = require('node-fetch'); // node-fetch staat al in je workflow install

// 1) Zet hier je FEEDS neer (voor test mag elk publieke RSS)
// LET OP: zet HIER de echte URLs neer; GEEN 'voorbeeld.nl'
const FEEDS = [
  // Voor test: HN feed (werkt altijd)
  'https://hnrss.org/newest?points=100',
  // Later vervang je deze door je echte woning-RSS bronnen
];

// 2) Endpoint + secret (uit Vercel Env)
const INGEST_URL = process.env.INGEST_URL || 'https://huurkans.vercel.app/api/ingest';
const INGEST_SECRET = process.env.INGEST_SECRET;

// Kleine helper: hash van URL
function urlHash(u) {
  return crypto.createHash('sha256').update(u).digest('hex').slice(0, 32);
}

async function run() {
  if (!INGEST_SECRET) {
    console.error('INGEST_SECRET ontbreekt (env var).');
    process.exit(1);
  }

  const parser = new Parser();

  for (const feedUrl of FEEDS) {
    console.log('Fetch feed:', feedUrl);

    let feed;
    try {
      feed = await parser.parseURL(feedUrl);
    } catch (e) {
      console.error('Feed ophalen mislukt:', feedUrl, e.message);
      continue;
    }

    console.log(`Items gevonden in ${feedUrl}:`, feed.items?.length ?? 0);

    for (const item of feed.items || []) {
      // Map basisvelden -> listings schema
      const url = item.link || item.guid || '';
      if (!url) continue;

      const mapped = {
        // id wordt server-side aangemaakt (supabase default)
        source_id: null,               // optioneel
        url,
        url_hash: urlHash(url),
        title: item.title || '',
        description: (item.contentSnippet || item.content || '').slice(0, 800),
        price: null,
        city: null,
        address: null,
        area_m2: null,
        rooms: null,
        available_from: null,
        posted_at: item.isoDate || item.pubDate || null,
        image_url: Array.isArray(item.enclosure) ? item.enclosure[0]?.url
                 : (item.enclosure && item.enclosure.url) || null,
        status: 'active',
      };

      try {
        const res = await fetch(INGEST_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-ingest-secret': INGEST_SECRET,
          },
          body: JSON.stringify(mapped),
        });

        if (!res.ok) {
          const txt = await res.text();
          console.error('Ingest failed', res.status, txt);
        } else {
          console.log('Ingest OK →', mapped.url);
        }
      } catch (err) {
        console.error('Ingest error:', err.message);
      }
    }
  }
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
