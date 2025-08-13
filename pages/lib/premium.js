// lib/premium.js
import { supabaseAdmin } from './supabaseAdmin'

export async function getUserByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getActiveSubscriptionByUserId(user_id) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', user_id)
    .in('status', ['trialing','active','past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
