import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email en wachtwoord vereist' })
    const password_hash = await bcrypt.hash(password, 10)
    const { data, error } = await supabase.from('users').insert([{ email, password_hash }]).select()
    if (error) return res.status(400).json({ error: error.message })
    res.status(200).json({ ok: true, user: data?.[0] })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
