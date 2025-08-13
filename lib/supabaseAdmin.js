// lib/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js'

// Lees env vars, maar laat de build niet crashen als ze nog niet gezet zijn
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Alleen een client maken als beide waarden bestaan
export const supabaseAdmin =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
