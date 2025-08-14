/**
 * Lightweight RSS -> ingest script
 * - Geen extra npm dependencies
 * - Werkt met Node 18 (global fetch)
 * - FEED_URLS: komma-gescheiden lijst in een GitHub Secret
 * - INGEST_URL: jouw endpoint (in workflow vastgezet)
 * - INGEST_SECRET: geheime sleutel (moet 1-op-1 gelijk zijn aan Vercel's waarde)
 */

const INGEST_URL = process.env.INGEST_URL;
const INGEST_SECRET = process.env.INGEST_SECRET;
const FEED_URLS = (process.env.FEED_URLS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!INGEST_URL) {
  console.error("Misconfig: INGEST_URL ontbreekt (env).");
  process.exit(1);
}
if (!INGEST_SECRET) {
  console.error("Misconfig: INGEST_SECRET ontbreekt (env/secret).");
  process.exit(1);
}
if (FEED_URLS.length === 0) {
  console.error(
    "Misconfig: FEED_URLS ontbreekt (env/secret) — voeg een komma-gescheiden lijst toe."
  );
  process.exit(1);
}

// Heel simpele RSS parser (zonder externe lib).
// Pakt <item> blokken en daaruit <title>, <link>, <description>.
function parseRss(xml) {
  const items = [];
  const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
  const get = (block, tag) => {
    const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return m ? cleanup(m[1]) : null;
  };
  const cleanup = (s) =>
    s
      ?.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
      ?.replace(/<[^>]+>/g, "")
      ?.trim() ?? null;

  let match;
  while ((match = itemRegex.exec(xml))) {
    const block = match[0];
    const title = get(block, "title");
    const link = get(block, "link");
    const description = get(block, "description");
    if (link) {
      items.push({ title, url: link, description });
    }
  }
  return items;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      // Sommige sites blokkeren bots; dit kan helpen:
      "User-Agent":
        "Mozilla/5.0 (compatible; HuurkansBot/1.0; +https://huurkans.vercel.app)",
      Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch ${url} failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function postToIngest(item) {
  // We sturen secret zowel in header als in body voor maximale compatibiliteit.
  const payload = {
    secret: INGEST_SECRET,
    // Minimale velden; jouw ingest maakt zelf een url-hash
    url: item.url,
    title: item.title,
    description: item.description,
    // Je kunt hier extra velden mappen als je ingest dat slikt (price, city, etc.)
  };

  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ingest-secret": INGEST_SECRET,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Ingest failed (${res.status}): ${t}`);
  }
}

(async () => {
  console.log(`FEEDS: ${FEED_URLS.join(", ")}`);
  for (const feed of FEED_URLS) {
    try {
      console.log(`==> Haal feed op: ${feed}`);
      const xml = await fetchText(feed);
      const items = parseRss(xml);
      console.log(`   Gevonden items: ${items.length}`);

      for (const it of items) {
        try {
          await postToIngest(it);
          console.log(`   ✔ Ingest OK: ${it.url}`);
        } catch (e) {
          console.warn(`   ✖ Ingest fout voor ${it.url}: ${e.message}`);
        }
      }
    } catch (e) {
      console.warn(`Feed fout (${feed}): ${e.message}`);
    }
  }
  console.log("Klaar.");
})().catch((e) => {
  console.error("Onverwachte fout:", e);
  process.exit(1);
});
