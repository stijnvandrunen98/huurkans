// pages/api/ingest.js
import { supabaseAdmin } from '../../lib/supabaseAdmin'; // dit heb je al

export default async function handler(req, res) {
  // 1) Alleen POST accepteren
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2) Secret uit header lezen en vergelijken met Vercel ENV
  const provided = req.headers['x-ingest-secret'];
  const expected = process.env.INGEST_SECRET;

  if (!expected) {
    return res.status(500).json({ error: 'Server misconfig: INGEST_SECRET ontbreekt' });
  }
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Invalid ingest secret' });
  }

  // 3) Body lezen
  let item = {};
  try {
    item = req.body || {};
  } catch (e) {
    return res.status(400).json({ error: 'Bad JSON body' });
  }

  // 4) Dry-run optie (handshake testen zonder in DB te schrijven)
  const dry = req.query.dry === '1';
  if (dry) {
    return res.status(200).json({ ok: true, dry: true, received: item });
  }

  // 5) Minimalistische insert in de listings-tabel
  //    (vul alleen velden in die zeker bestaan; rest laat je weg)
  //    Past dit later aan als je extra kolommen verplicht maakt.
  const row = {
    title: item.title ?? null,
    description: item.description ?? null,
    price: item.price ?? null,
    city: item.city ?? null,
    url: item.url ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from('listings')
    .insert([row])
    .select()
    .limit(1)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true, inserted: data });
}
