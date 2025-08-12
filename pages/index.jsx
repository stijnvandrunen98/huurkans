import { useState } from 'react'

export default function Home() {
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
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.url) {
        window.location = data.url
      } else if (data.sessionId) {
        const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
        await stripe.redirectToCheckout({ sessionId: data.sessionId })
      } else {
        alert('Checkout mislukt — check console voor details')
        console.error(data)
      }
    } catch (err) {
      console.error(err)
      alert('Er ging iets mis bij het aanmaken van de checkout.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded flex items-center justify-center text-white font-semibold">HK</div>
          <h1 className="text-lg font-medium">Huurkans</h1>
        </div>
        <nav className="text-sm text-gray-600">
          <a href="#how" className="mr-6 hover:underline">Hoe het werkt</a>
          <a href="#pricing" className="hover:underline">Abonnement</a>
        </nav>
      </header>

      <main className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <section>
          <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">Vind je nieuwe woning <span className="text-gray-500">vóórdat anderen 'm zien.</span></h2>
          <p className="mt-4 text-gray-600">Huurkans verzamelt gecontroleerde, actuele huuradvertenties en stuurt real-time notificaties — geen verouderde links, geen rommel. Één helder abonnement, alles geregeld.</p>

          <ul className="mt-6 space-y-3 text-gray-700">
            <li className="flex items-start gap-3"><span className="font-semibold">Actueel</span> — listings die écht beschikbaar zijn.</li>
            <li className="flex items-start gap-3"><span className="font-semibold">Vertrouwd</span> — verificatie van verhuurders en snelle takedown bij fraude.</li>
            <li className="flex items-start gap-3"><span className="font-semibold">Snel</span> — real-time alerts via e-mail/Telegram.</li>
          </ul>

          <form onSubmit={handleCheckout} className="mt-8 sm:flex sm:items-center sm:gap-4">
            <div className="flex-1 min-w-0">
              <label className="sr-only">E-mailadres</label>
              <input
                type="email"
                required
                placeholder="jouw@email.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-gray-200 px-4 py-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>

            <div className="mt-3 sm:mt-0">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded bg-black text-white px-5 py-3 text-sm font-semibold"
                disabled={loading}
              >
                {loading ? 'Even geduld…' : `Abonneer — ${price}`}
              </button>
            </div>
          </form>

          <p className="mt-3 text-xs text-gray-500">Je kunt op elk moment opzeggen. Beveiligde betaling via Stripe.</p>
        </section>

        <aside className="bg-white border border-gray-100 rounded p-6 shadow-sm">
          <div className="text-sm text-gray-500">Wat je krijgt</div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Realtime alerts</div>
                <div className="text-xs text-gray-500">Push via e-mail of Telegram</div>
              </div>
              <div className="text-sm font-semibold">✓</div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Gecontroleerde listings</div>
                <div className="text-xs text-gray-500">Handmatig + partners</div>
              </div>
              <div className="text-sm font-semibold">✓</div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Minimale interface</div>
                <div className="text-xs text-gray-500">Geen ruis, alleen kansen</div>
              </div>
              <div className="text-sm font-semibold">✓</div>
            </div>
          </div>

          <div className="mt-6 border-t pt-4 text-xs text-gray-500">
            Privacy en TOS zijn in voorbereiding — dit is een MVP.
          </div>
        </aside>
      </main>

      <section id="how" className="mt-16">
        <h3 className="text-xl font-semibold">Hoe het werkt</h3>
        <ol className="mt-4 space-y-3 text-gray-700 list-decimal list-inside">
          <li>Abonneer: één helder tarief van €14,99 per maand.</li>
          <li>Wij verzamelen: alleen geverifieerde en recente advertenties.</li>
          <li>Jij ontvangt: direct notificaties wanneer iets matcht met jouw zoekprofiel.</li>
        </ol>
      </section>

      <footer className="mt-16 border-t pt-8 text-sm text-gray-500 flex justify-between items-center">
        <div>© {new Date().getFullYear()} Huurkans</div>
        <div>
          <a href="#" className="mr-4 hover:underline">Privacy</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </div>
  )
}
