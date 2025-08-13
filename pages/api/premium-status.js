// pages/api/premium-status.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  const email = (req.query.email || '').toString();
  if (!email) return res.status(400).json({ premium: false });

  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('status,current_period_end')
    .eq('email', email)
    .maybeSingle();

  const premium = !!data && ['active', 'trialing', 'past_due'].includes(data.status);
  return res.status(200).json({ premium, ...data });
}
