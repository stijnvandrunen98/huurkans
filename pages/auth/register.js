import Link from 'next/link'

export default function Register() {
  async function onSubmit(e){
    e.preventDefault()
    const email = e.target.email.value
    const password = e.target.password.value
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (res.ok) {
      window.location.href = '/auth/login'
    } else {
      const data = await res.json().catch(()=>({}))
      alert(data?.error || 'Registreren mislukt')
    }
  }

  return (
    <div className="container">
      <div className="card" style={{maxWidth: 420, margin: '40px auto'}}>
        <h2>Account aanmaken</h2>
        <form onSubmit={onSubmit}>
          <div style={{marginTop: 12}}>
            <input className="input" type="email" name="email" placeholder="Email" required />
          </div>
          <div style={{marginTop: 12}}>
            <input className="input" type="password" name="password" placeholder="Wachtwoord" required />
          </div>
          <div style={{marginTop: 16, display:'flex', gap:12}}>
            <button className="btn orange" type="submit">Aanmaken</button>
            <Link className="btn secondary" href="/auth/login">Al een account? Inloggen</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
