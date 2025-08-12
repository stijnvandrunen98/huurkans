import Link from 'next/link'
export default function Canceled(){
  return (
    <div className="container">
      <div className="card" style={{maxWidth: 520, margin: '40px auto'}}>
        <h2>Betaling geannuleerd</h2>
        <p className="muted">Geen zorgen — er is niets afgeschreven. Je kunt het altijd later opnieuw proberen.</p>
        <div style={{marginTop: 16}}>
          <Link className="btn secondary" href="/">Terug naar start</Link>
        </div>
      </div>
    </div>
  )
}
