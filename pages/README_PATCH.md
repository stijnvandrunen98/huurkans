# Huurkans – Premium/Webhook Patch

## Zet deze bestanden op de juiste plek
- lib/supabaseAdmin.js
- lib/premium.js
- pages/api/stripe-webhook.js
- pages/api/portal.js
- pages/profile.js
- sql/subscriptions.sql (alleen uitvoeren in Supabase)

## 1) Supabase SQL (eenmalig uitvoeren)
Zie `sql/subscriptions.sql` of plak dit in de Supabase SQL editor:
```
create extension if not exists pgcrypto;
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);
create index if not exists subscriptions_user_id_idx on subscriptions(user_id);
```

## 2) Vercel → Environment Variables
- SUPABASE_SERVICE_ROLE_KEY = service role key uit Supabase
- STRIPE_WEBHOOK_SECRET = (straks uit Stripe Webhooks)
- NEXT_PUBLIC_BASE_URL = jouw site URL (bv. https://huurkans.vercel.app)

## 3) Stripe → Webhooks
- Add endpoint: https://YOUR_DOMAIN/api/stripe-webhook
- Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
- Kopieer Signing secret → zet als STRIPE_WEBHOOK_SECRET in Vercel → redeploy

## 4) Test
- Betaal test-abonnement → check Supabase `subscriptions`
- Ga naar /profile → zie status en “Beheer abonnement”
