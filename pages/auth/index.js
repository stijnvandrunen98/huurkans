// pages/auth/index.js
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

export default function AuthPage() {
  const [mode, setMode] = useState('register') // 'register' of 'login'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setMsg('')
  }, [mode])

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/profile` }
    })
    if (error) setMsg(error.message)
    else setMsg('Account gemaakt. Check je e-mail voor bevestiging (als dit aan staat). Je kunt nu inloggen.')
    setLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg(error.message)
    else window.location.href = '/profile'
    setLoading(false)
  }

  return (
    <div className="container" style={{maxWidth:480}}>
      <h1>{mode === 'register' ? 'Account aanmaken' : 'Inloggen'}</h1>

      <form onSubmit={mode === 'register' ? handleRegister : handleLogin} style={{marginTop:16}}>
        <div className="card">
          <label className="muted">E-mail</label>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jouw@email.nl"
          />

          <label className="muted" style={{marginTop:12}}>Wachtwoord</label>
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {msg && <p className="alert" style={{marginTop:12}}>{msg}</p>}

          <div style={{marginTop:16, display:'flex', gap:12}}>
            <button className="btn orange" disabled={loading} type="submit">
              {mode === 'register' ? 'Aanmaken' : 'Inloggen'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={loading}
              onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
            >
              {mode === 'register' ? 'Al een account? Inloggen' : 'Nog geen account? Registreren'}
            </button>
          </div>
        </div>
      </form>

      <p style={{marginTop:16}}>
        <Link href="/">← Terug naar home</Link>
      </p>
    </div>
  )
}
