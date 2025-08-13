// pages/api/ingest.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  // 1) Alleen POST + simpele secret-check
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }
  const secret = req.headers['x-ingest-secret'];
  if (!secret || secret !== process.env.INGEST_SECRET) {
    return res.status(401).json({ error: 'Invalid ingest secret' });
  }

  // 2) Input normaliseren (we pakken de velden die jouw tabel heeft)
  const payload = req.body || {};
  const row = {
    url: payload.url,
    title: payload.title || null,
    description: payload.description || null,
    price: typeof payload.price === 'number' ? payload.price : null,
    city: payload.city || null,
    // optioneel extra’s als je kolommen hebt:
    // posted_at: payload.posted_at || null,
    // image_url: payload.img_url || null,
  };

  if (!row.url) {
    return res.status(400).json({ error: 'url is required' });
  }

  // 3) Upsert op url (dankzij de unique index)
  const { data, error } = await supabaseAdmin
    .from('listings')
    .upsert(row, { onConflict: 'url' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, listing: data });
}
