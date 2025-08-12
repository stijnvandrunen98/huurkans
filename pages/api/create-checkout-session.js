import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')
  try {
    const { email } = req.body || {}

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: 'Huurkans subscription' },
            unit_amount: 1499,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'}/?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'}/?canceled=true`,
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
