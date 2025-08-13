// pages/profile.js
import { getSession } from 'next-auth/react'
import { getUserByEmail, getActiveSubscriptionByUserId } from '../lib/premium'
import Link from 'next/link'

export async function getServerSideProps(ctx) {
  const session = await getSession(ctx)
  if (!session) return { redirect: { destination: '/auth/login', permanent: false } }
  const user = await getUserByEmail(session.user.email)
  const sub = user ? await getActiveSubscriptionByUserId(user.id) : null
  return { props: { email: session.user.email, premium: Boolean(sub), status: sub?.status || null } }
}

export default function Profile({ email, premium, status }) {
  async function manage() {
    const res = await fetch('/api/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, return_url: window.location.origin + '/profile' })
    })
    const data = await res.json()
    if (data.url) window.location = data.url
  }
  return (
    <div className="container">
      <h1>Jouw profiel</h1>
      <p>Ingelogd als <strong>{email}</strong></p>
      <div className="card" style={{marginTop:16}}>
        <h3>Abonnement</h3>
        {premium ? (
          <p>Status: <strong>{status}</strong></p>
        ) : (
          <p>Geen actief abonnement.</p>
        )}
        <div style={{marginTop:12, display:'flex', gap:12}}>
          <Link className="btn orange" href="/">Naar homepage</Link>
          {premium && <button className="btn" onClick={manage}>Beheer abonnement</button>}
        </div>
      </div>
    </div>
  )
}
