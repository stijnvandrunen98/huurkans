// pages/listings.js
import { useState } from 'react';

export default function Listings({ items }) {
  const [city, setCity] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  const filtered = items.filter((it) => {
    const okCity = city ? (it.city || '').toLowerCase().includes(city.toLowerCase()) : true;
    const okMin = min ? (it.price || 0) >= Number(min) : true;
    const okMax = max ? (it.price || 0) <= Number(max) : true;
    return okCity && okMin && okMax;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Listings</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-sm">Stad (bevat)</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="bijv. amsterdam"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm">Minimum prijs</label>
          <input
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder="€ min"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm">Maximum prijs</label>
          <input
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="€ max"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setCity(''); setMin(''); setMax(''); }}
            className="border px-3 py-2 rounded"
          >
            Wissen
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {filtered.map((it) => (
          <article key={it.id || it.url} className="border rounded-lg overflow-hidden shadow-sm">
            <div className="aspect-[16/9] bg-gray-100">
              {it.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image_url} alt={it.title || 'woning'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-gray-400">geen foto</div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <h2 className="font-semibold">{it.title || 'Woning'}</h2>
              <div className="text-sm text-gray-600">
                {(it.city || '').toLowerCase()} • {it.price ? `€${it.price}` : 'prijs onbekend'}
                {it.area_m2 ? ` • ${it.area_m2} m²` : ''}{it.bedrooms ? ` • ${it.bedrooms} kamers` : ''}
              </div>
              {it.description ? (
                <p className="text-sm text-gray-700 line-clamp-3">{it.description}</p>
              ) : null}
              <a
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-3 py-2 mt-1 rounded bg-black text-white"
              >
                Bekijk bron
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  // simpele fetch van jouw eigen API die uit Supabase leest
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://huurkans.vercel.app';
  const res = await fetch(`${base}/api/listings`);
  const items = await res.json().catch(() => []);
  return { props: { items } };
}
