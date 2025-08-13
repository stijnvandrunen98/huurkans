// pages/api/portal.js
import Stripe from 'stripe'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')
  const { email, return_url } = req.body || {}
  if (!email) return res.status(400).json({ error: 'Missing email' })
  const { data: user, error } = await supabaseAdmin.from('users').select('id').eq('email', email).maybeSingle()
  if (error || !user) return res.status(404).json({ error: 'User not found' })
  const { data: sub } = await supabaseAdmin.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!sub?.stripe_customer_id) return res.status(404).json({ error: 'No customer' })
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: return_url || process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'
  })
  res.json({ url: session.url })
}
