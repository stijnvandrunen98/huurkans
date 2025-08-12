# Huurkans - MVP (Next.js + Tailwind + Stripe Checkout)

Dit is een kant-en-klaar Next.js project (MVP) voor *Huurkans* — een minimalistische landingspagina met Stripe Checkout (abonnement €14,99 p/m).

## Inhoud
- Next.js frontend (pages/)
- API route voor het aanmaken van een Stripe Checkout sessie (pages/api/create-checkout-session.js)
- TailwindCSS setup
- Simpele instructies om te deployen op Vercel

## Snel starten (lokaal)
1. Pak de ZIP uit
2. `npm install`
3. Zet environment variables (voorbeeld hieronder) in een `.env.local` bestand:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
   STRIPE_SECRET_KEY=sk_test_xxx
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```
4. `npm run dev` en open http://localhost:3000

## Deploy naar Vercel (5 minuten)
1. Maak een account op vercel.com
2. Klik op "New Project" → import from ZIP (of connect Github en push deze map)
3. Voeg de environment variables toe in Vercel project settings (zelfde keys als hierboven)
4. Deploy — de site is dan live.

## Stripe (test modus)
- Gebruik test API keys (pk_test_..., sk_test_...) om veilig te testen.
- Test cards: `4242 4242 4242 4242` mm/yy any CVC.
- Zet later de live keys in Vercel om betalingen echt te ontvangen.

## Webhooks (aanbevolen, later)
- Voeg een webhook endpoint toe voor `checkout.session.completed` en `invoice.paid` om klanten/subscriptions te registreren in je database.

-- Klaar. Als je wilt, kan ik:
- De projectmap in één klik voor je deployen (ik geef instructies en help met environment keys).
- Een webhook + SQLite voorbeeld toevoegen om klanten te bewaren.
