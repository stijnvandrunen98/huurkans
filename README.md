# Huurkans (Next.js + Supabase Auth + Stripe) — MVP 2.0

Dit project bevat:
- Inloggen/registreren met NextAuth (Credentials) en Supabase
- Minimalistische UI met oranje accent
- Stripe Checkout (abonnement €14,99 p/m) met success/cancel pagina's
- Voorbeeld SQL om de `users`-tabel in Supabase aan te maken

## Environment variables (Vercel → Project → Settings → Environment Variables)
- NEXT_PUBLIC_SUPABASE_URL = https://<project>.supabase.co
- NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon public key>
- SUPABASE_SERVICE_ROLE_KEY = <service_role key>  (alleen server-side gebruikt)
- NEXTAUTH_SECRET = <random string>
- NEXTAUTH_URL = https://huurkans.vercel.app (of jouw domein)
- NEXT_PUBLIC_BASE_URL = https://huurkans.vercel.app (of jouw domein)
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_test_xxx
- STRIPE_SECRET_KEY = sk_test_xxx

## Supabase SQL (maak de users-tabel)
Ga in Supabase naar SQL editor en voer uit:

```sql
create extension if not exists pgcrypto;
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);
-- (Optioneel) RLS aanzetten en beleid toevoegen, service_role key omzeilt RLS op de server
alter table users enable row level security;
create policy "Allow service role" on users for all using ( true ) with check ( true );
```

## Lokaal draaien
1) `npm install`
2) `.env.local` aanmaken met de env vars hierboven
3) `npm run dev` → open http://localhost:3000

## Deploy
Upload de map naar GitHub en importeer het project in Vercel. Zet de environment variables. Deploy.

