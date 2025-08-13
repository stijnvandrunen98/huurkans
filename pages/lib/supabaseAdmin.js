// lib/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js'

// Lees vars, maar faal niet tijdens build
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Alleen een client maken als beide waarden er zijn
export const supabaseAdmin =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
