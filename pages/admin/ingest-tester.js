// pages/admin/ingest-tester.js
import { useState } from 'react';

export default function IngestTester() {
  const [secure, setSecure] = useState('');
  const [out, setOut] = useState(null);

  const sample = {
    // voorbeelditem
    url: 'https://example.com/ad/123',
    title: 'Testappartement in Amsterdam',
    description: 'Schone, lichte woning met balkon.',
    price: 1499,
    city: 'Amsterdam',
  };

  async function send(dry = false) {
    setOut({ status: 'Bezig…' });
    try {
      const res = await fetch(`/api/ingest${dry ? '?dry=1' : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ingest-secret': secure.trim(), // <<< HIER zit je secret
        },
        body: JSON.stringify(sample),
      });

      const json = await res.json();
      setOut({ status: res.status, body: json });
    } catch (e) {
      setOut({ status: 'Fout', body: e.message });
    }
  }

  return (
    <main style={{ maxWidth: 680, margin: '40px auto', padding: 16 }}>
      <h1>Ingest Tester</h1>
      <p>
        Vul hieronder je <code>INGEST_SECRET</code> in (precies zoals in Vercel) en
        klik op “Stuur test item”.
      </p>

      <input
        value={secure}
        onChange={(e) => setSecure(e.target.value)}
        placeholder="INGEST_SECRET"
        style={{
          width: '100%',
          padding: 12,
          borderRadius: 8,
          border: '1px solid #ddd',
          fontFamily: 'monospace',
          marginBottom: 12,
        }}
      />

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => send(false)}
          style={{
            background: '#ff8800',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: 10,
            border: 0,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Stuur test item
        </button>

        <button
          onClick={() => send(true)}
          style={{
            background: '#000',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: 10,
            border: 0,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Alleen handshake (dry-run)
        </button>
      </div>

      {out && (
        <pre
          style={{
            marginTop: 16,
            background: '#f6f6f6',
            padding: 16,
            borderRadius: 12,
            overflowX: 'auto',
          }}
        >
{JSON.stringify(out, null, 2)}
        </pre>
      )}
    </main>
  );
}
