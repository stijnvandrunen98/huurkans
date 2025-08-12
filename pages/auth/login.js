import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function Login() {
  async function onSubmit(e){
    e.preventDefault()
    const email = e.target.email.value
    const password = e.target.password.value
    const res = await signIn('credentials', { email, password, redirect: true, callbackUrl: '/' })
    if (res?.error) alert('Inloggen mislukt')
  }

  return (
    <div className="container">
      <div className="card" style={{maxWidth: 420, margin: '40px auto'}}>
        <h2>Inloggen</h2>
        <form onSubmit={onSubmit}>
          <div style={{marginTop: 12}}>
            <input className="input" type="email" name="email" placeholder="Email" required />
          </div>
          <div style={{marginTop: 12}}>
            <input className="input" type="password" name="password" placeholder="Wachtwoord" required />
          </div>
          <div style={{marginTop: 16, display:'flex', gap:12}}>
            <button className="btn orange" type="submit">Inloggen</button>
            <Link className="btn secondary" href="/auth/register">Account maken</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
