// pages/listings.js
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

export default function ListingsPage({ items, filters }) {
  return (
    <>
      <Head>
        <title>Listings • Huurkans</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <a href="/" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 700 }}>Huurkans</a>
          <a href="/" style={{ textDecoration: 'underline' }}>Terug</a>
        </nav>

        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Listings</h1>
        <p style={{ color: '#6b7280', marginBottom: 16 }}>Filter op stad en prijs.</p>

        {/* FILTER FORM (stuurt als querystring via GET) */}
        <form
          method="GET"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 140px 120px',
            gap: 12,
            alignItems: 'end',
            marginBottom: 20,
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
              Stad (exact)
            </label>
            <input
              type="text"
              name="city"
              defaultValue={filters.city ?? ''}
              placeholder="bijv. Amsterdam"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
              Minimum prijs
            </label>
            <input
              type="number"
              name="min"
              defaultValue={filters.min ?? ''}
              placeholder="€ min"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
              Maximum prijs
            </label>
            <input
              type="number"
              name="max"
              defaultValue={filters.max ?? ''}
              placeholder="€ max"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '10px 12px',
                fontWeight: 600,
                border: '1px solid #000',
                borderRadius: 10,
                background: '#000',
                color: '#fff',
              }}
            >
              Filter
            </button>

            <a
              href="/listings"
              style={{
                flex: 1,
                padding: '10px 12px',
                fontWeight: 600,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                background: '#fff',
                color: '#111',
                textAlign: 'center',
                textDecoration: 'none',
                lineHeight: '36px',
              }}
            >
              Wissen
            </a>
          </div>
        </form>

        {items.length === 0 ? (
          <div style={{ padding: 24, border: '1px solid #e5e7eb', borderRadius: 12 }}>
            Geen resultaten. Pas je filters aan of stuur test items via <code>/admin/ingest-tester</code>.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {items.map((it) => (
              <article
                key={it.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#fff',
                }}
              >
                <div style={{ width: '100%', height: 160, background: '#f3f4f6' }}>
                  <img
                    src={it.image_url || 'https://picsum.photos/seed/huurkans/600/400'}
                    alt={it.title || 'Listing'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>

                <div style={{ padding: 16 }}>
                  <h2 style={{ fontSize: 16, margin: '0 0 6px' }}>
                    {it.title || 'Titel onbekend'}
                  </h2>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                    {it.city || 'Onbekende stad'}
                    {typeof it.price === 'number' ? ` • €${it.price}` : ''}
                  </div>

                  {it.description && (
                    <p style={{ fontSize: 14, lineHeight: 1.4, marginBottom: 12 }}>
                      {it.description.length > 140
                        ? it.description.slice(0, 140) + '…'
                        : it.description}
                    </p>
                  )}

                  <a
                    href={it.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px 12px',
                      fontWeight: 600,
                      border: '1px solid #000',
                      borderRadius: 10,
                      background: '#000',
                      color: '#fff',
                      textDecoration: 'none',
                    }}
                  >
                    Bekijk bron
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export async function getServerSideProps({ query }) {
  // Query-parameters uit de URL lezen
  const city = typeof query.city === 'string' && query.city.trim() ? query.city.trim() : null;
  const min = query.min ? Number(query.min) : null;
  const max = query.max ? Number(query.max) : null;

  // Basis select
  let q = supabase.from('listings').select('*').eq('status', 'active');

  // Filters toevoegen als ze zijn ingevuld
  if (city) q = q.eq('city', city);
  if (min !== null && !Number.isNaN(min)) q = q.gte('price', min);
  if (max !== null && !Number.isNaN(max)) q = q.lte('price', max);

  // Sorteer nieuwste eerst en limiet
  q = q.order('created_at', { ascending: false }).limit(24);

  const { data, error } = await q;

  if (error) {
    console.error('Supabase fetch error:', error);
    return { props: { items: [], filters: { city, min, max } } };
  }

  return { props: { items: data ?? [], filters: { city, min, max } } };
}
