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
