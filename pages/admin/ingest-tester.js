// pages/admin/ingest-tester.js
import { useState } from 'react'

export default function IngestTester() {
  const [secret, setSecret] = useState('')
  const [status, setStatus] = useState('')

  const sample = {
    secret, // <= vul jij hieronder in het invoerveld in
    source: { name: 'Test Feed', kind: 'rss', url: 'https://example.com/rss' },
    items: [
      {
        url: 'https://example.com/ad/123',
        title: 'Testappartement 50m² in Amsterdam',
        description: 'Licht appartement met balkon.',
        price: 1499,
        city: 'Amsterdam',
        bedrooms: 2,
        area_m2: 50,
        available_from: '2025-09-01',
        posted_at: new Date().toISOString(),
        image_url: 'https://picsum.photos/seed/huurkans/600/400'
      }
    ]
  }

  async function send() {
    setStatus('Bezig…')
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sample)
      })
      const json = await res.json()
      setStatus(JSON.stringify(json, null, 2))
    } catch (e) {
      setStatus('Fout: ' + e.message)
    }
  }

  return (
    <main className="container" style={{maxWidth: 640}}>
      <h1>Ingest Tester</h1>
      <p className="muted">Vul hieronder je <code>INGEST_SECRET</code> in (zoals in Vercel gezet) en klik op “Stuur test item”.</p>
      <input
        className="input"
        placeholder="INGEST_SECRET"
        value={secret}
        onChange={e => setSecret(e.target.value)}
        style={{marginTop:12}}
      />
      <div style={{marginTop:12, display:'flex', gap:12}}>
        <button className="btn orange" onClick={send}>Stuur test item</button>
      </div>
      {status && (
        <pre style={{marginTop:16, background:'#f6f6f6', padding:12, borderRadius:8, overflow:'auto'}}>
{status}
        </pre>
      )}
    </main>
  )
}
