// pages/api/stripe-webhook.js
import Stripe from 'stripe';
import { buffer } from 'micro';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let event;
  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook verify failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Helper: update/opslaan in subscriptions
    async function upsertSubByEmail({ email, customerId, subscriptionId, status, priceId, currentPeriodEnd }) {
      // koppel user_id via public.users (onze shim)
      let userId = null;
      if (email) {
        const { data: u } = await supabaseAdmin.from('users').select('id').eq('email', email).maybeSingle();
        userId = u?.id ?? null;
      }

      // upsert op email (zorg voor unique index; zie stap 2 hieronder)
      await supabaseAdmin.from('subscriptions').upsert(
        {
          email,
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status,
          price_id: priceId,
          current_period_end: currentPeriodEnd,
        },
        { onConflict: 'email' }
      );
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const subId = session.subscription;
      const customerId = session.customer;
      const email = session.customer_details?.email || session.customer_email;

      const sub = await stripe.subscriptions.retrieve(subId);
      const priceId = sub.items.data[0]?.price?.id || null;
      const status = sub.status;
      const currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();

      await upsertSubByEmail({ email, customerId, subscriptionId: subId, status, priceId, currentPeriodEnd });
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object; // Stripe.Subscription
      const priceId = sub.items.data[0]?.price?.id || null;
      const status = sub.status;
      const currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();

      const customer = await stripe.customers.retrieve(sub.customer);
      const email = customer.email;

      await upsertSubByEmail({
        email,
        customerId: sub.customer,
        subscriptionId: sub.id,
        status,
        priceId,
        currentPeriodEnd,
      });
    }

    return res.json({ received: true });
  } catch (e) {
    console.error('Webhook handler error', e);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}
