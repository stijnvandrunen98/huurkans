// pages/api/create-checkout-session.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email ontbreekt' });

    // Zoek bestaande Stripe customer, of maak 'm aan
    const found = await stripe.customers.list({ email, limit: 1 });
    const customer = found.data[0] || await stripe.customers.create({ email });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customer.id,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/canceled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('checkout error', e);
    return res.status(500).json({ error: 'Kon checkout niet starten' });
  }
}
