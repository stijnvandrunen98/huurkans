// pages/listings.js
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

export default function ListingsPage({ items }) {
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
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          Simpele lijst met de laatste items uit de database.
        </p>

        {items.length === 0 ? (
          <div style={{ padding: 24, border: '1px solid #e5e7eb', borderRadius: 12 }}>
            Nog niets gevonden. Stuur test items via <code>/admin/ingest-tester</code>.
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

// Server-side data ophalen uit Supabase
export async function getServerSideProps() {
  // Haal de 24 nieuwste "actieve" listings op
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(24);

  if (error) {
    console.error('Supabase fetch error:', error);
    return { props: { items: [] } };
  }

  return { props: { items: data ?? [] } };
}
