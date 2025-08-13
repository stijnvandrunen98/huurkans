// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Deze twee waarden komen uit je Vercel environment variables.
// Ze heten: NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Maak één herbruikbare Supabase-verbinding voor de hele site
export const supabase = createClient(url, anon);
