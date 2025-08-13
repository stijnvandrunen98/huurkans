// pages/auth.js
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSignUp() {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    setMessage(error ? error.message : 'Check je e-mail om te bevestigen!')
  }

  async function handleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    setMessage(error ? error.message : 'Ingelogd!')
  }

  return (
    <div style={{ maxWidth: 420, margin: '50px auto', padding: 20 }}>
      <h1>Inloggen / Registreren</h1>
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid #ddd' }}
      />
      <input
        type="password"
        placeholder="Wachtwoord"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid #ddd' }}
      />
      <div style={{ display:'flex', gap: 10 }}>
        <button onClick={handleLogin} disabled={loading} style={{ padding: '10px 14px' }}>
          Inloggen
        </button>
        <button onClick={handleSignUp} disabled={loading} style={{ padding: '10px 14px' }}>
          Registreren
        </button>
      </div>
      {message && <p style={{ marginTop: 12 }}>{message}</p>}
      <p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
        Tip: gebruik voor testen een wachtwoord van minimaal 6 tekens.
      </p>
    </div>
  )
}
