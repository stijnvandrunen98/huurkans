// pages/index.js
import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export default function Home() {
  const { data: session } = useSession()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const price = '€14,99 / maand'

  async function handleCheckout(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || (session?.user?.email ?? '') }),
      })
      const data = await res.json()
      if (data.url) window.location = data.url
      else alert('Checkout mislukt.')
    } catch (e) {
      console.error(e)
      alert('Er ging iets mis.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <nav className="nav">
        <div className="brand">
          <div className="logo">HK</div>
          <strong>Huurkans</strong>
        </div>
        <div>
          <Link className="link" href="#how">Hoe het werkt</Link>
          <Link className="link" href="#pricing">Abonnement</Link>
          {!session ? (
            <Link className="btn secondary" href="/auth/login">Inloggen</Link>
          ) : (
            <button className="btn secondary" onClick={() => signOut()}>Uitloggen</button>
          )}
        </div>
      </nav>

      <div className="grid grid-2" style={{ marginTop: 24 }}>
        <section>
          <h1>Vind je nieuwe woning <span className="muted">vóórdat anderen 'm zien.</span></h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Huurkans verzamelt gecontroleerde, actuele huuradvertenties en stuurt real-time notificaties — geen verouderde links, geen rommel. Eén helder abonnement, alles geregeld.
          </p>

          <ul style={{ marginTop: 16 }}>
            <li><strong>Actueel</strong> — listings die écht beschikbaar zijn.</li>
            <li><strong>Vertrouwd</strong> — verificatie + snelle takedown bij fraude.</li>
            <li><strong>Snel</strong> — real-time alerts via e-mail/Telegram.</li>
          </ul>

          <form onSubmit={handleCheckout} style={{ marginTop: 16 }}>
            <div className="form-row">
              <input
                className="input"
                type="email"
                placeholder="jouw@email.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={!session}
              />
              <button className="btn orange" disabled={loading} type="submit">
                {loading ? 'Even geduld…' : `Abonneer — ${price}`}
              </button>
            </div>
            <div className="small muted" style={{ marginTop: 8 }}>
              Je kunt op elk moment opzeggen. Beveiligde betaling via Stripe.
            </div>
          </form>

          {session ? (
            <div className="alert" style={{ marginTop: 16 }}>
              Ingelogd als <strong>{session.user.email}</strong> — na betaling koppelen we je abonnement automatisch aan je profiel.
            </div>
          ) : null}
        </section>

        <aside className="card">
          <div className="badge">Wat je krijgt</div>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div><div><strong>Realtime alerts</strong></div><div className="small muted">E-mail of Telegram</div></div>
              <div>✓</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <div><div><strong>Gecontroleerde listings</strong></div><div className="small muted">Handmatig + partners</div></div>
              <div>✓</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <div><div><strong>Minimale interface</strong></div><div className="small muted">Geen ruis, alleen kansen</div></div>
              <div>✓</div>
            </div>
          </div>
          <hr />
          <div className="small muted">Privacy en TOS zijn in voorbereiding — MVP.</div>
        </aside>
      </div>

      <section id="how" style={{ marginTop: 24 }}>
        <h2>Hoe het werkt</h2>
        <ol className="muted">
          <li>Abonneer: één tarief van €14,99 per maand.</li>
          <li>Wij verzamelen: alleen geverifieerde en recente advertenties.</li>
          <li>Jij ontvangt: direct notificaties op je zoekprofiel.</li>
        </ol>
      </section>

      <section id="pricing" style={{ marginTop: 24 }} className="card">
        <h3>Abonnement</h3>
        <p>€14,99 per maand — opzeggen kan op elk moment.</p>
        <button className="btn orange" onClick={(e) => handleCheckout(e)}>Abonneren</button>
      </section>

      <footer className="footer">
        <div>© {new Date().getFullYear()} Huurkans</div>
        <div className="small">Contact • Privacy</div>
      </footer>
    </div>
  )
}
