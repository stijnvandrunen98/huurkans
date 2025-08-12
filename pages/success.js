import Link from 'next/link'
export default function Success(){
  return (
    <div className="container">
      <div className="card" style={{maxWidth: 520, margin: '40px auto'}}>
        <h2>Betaling gelukt 🎉</h2>
        <p className="muted">Je abonnement is succesvol gestart. Binnenkort koppelen we dit automatisch aan je profiel.</p>
        <div style={{marginTop: 16}}>
          <Link className="btn orange" href="/">Terug naar start</Link>
        </div>
      </div>
    </div>
  )
}
