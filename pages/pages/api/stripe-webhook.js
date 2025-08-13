// pages/api/stripe-webhook.js
import Stripe from 'stripe'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

// Vercel/Next moet de raw body krijgen voor Stripe's signature check
export const config = { api: { bodyParser: false } }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Kleine helper: raw buffer uit request lezen
function readBuffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Guard: netjes fout geven i.p.v. build crashen
function assertConfigured(res) {
  if (!supabaseAdmin) {
    console.error('Supabase niet geconfigureerd: zet env vars in Vercel')
    res.status(500).json({ error: 'server_not_configured' })
    return false
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    console.error('Stripe keys ontbreken')
    res.status(500).json({ error: 'stripe_not_configured' })
    return false
  }
  return true
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }
  if (!assertConfigured(res)) return

  const sig = req.headers['stripe-signature']
  let event
  try {
    const buf = await readBuffer(req)
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed.', err?.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object
        // klant-email uit de sessie halen
        const email = s.customer_details?.email || s.customer_email
        if (!email) break

        // 1) gebruiker zoeken op e-mail (tabel 'users' hoort al te bestaan)
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle()
        if (!user) break

        // 2) sub-details ophalen (status/period_end)
        const subId = s.subscription
        const custId = s.customer
        let status = 'active'
        let periodEnd = null

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId)
          status = sub.status
          periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null
        }

        // 3) rij in subscriptions zetten
        await supabaseAdmin.from('subscriptions').insert({
          user_id: user.id,
          stripe_customer_id: custId || null,
          stripe_subscription_id: subId || null,
          status,
          current_period_end: periodEnd,
        })
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const subId = sub.id
        const status = sub.status
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null

        await supabaseAdmin
          .from('subscriptions')
          .update({ status, current_period_end: periodEnd })
          .eq('stripe_subscription_id', subId)
        break
      }

      default:
        // andere events negeren we
        break
    }

    res.json({ received: true })
  } catch (e) {
    console.error('Webhook handler error', e)
    res.status(500).json({ error: 'server_error' })
  }
}
