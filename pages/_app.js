import { SessionProvider } from 'next-auth/react'

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
      {/* GLOBAL STYLES – styled-jsx: geldt voor alle pagina's */}
      <style jsx global>{`
        :root { --orange:#ff7a00; --bg:#f8f8f8; --fg:#111; --muted:#6b7280; --border:#e5e7eb; }
        *{ box-sizing:border-box } html,body,#__next{ height:100% }
        body{ margin:0; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial; color:var(--fg); background:var(--bg) }
        .container{ max-width:980px; margin:0 auto; padding:24px }
        .nav{ display:flex; align-items:center; justify-content:space-between }
        .brand{ display:flex; align-items:center; gap:12px }
        .logo{ width:40px; height:40px; background:#000; color:#fff; display:grid; place-items:center; border-radius:8px; font-weight:700 }
        .link{ color:#000; text-decoration:none; margin-right:16px } .link:hover{ text-decoration:underline }
        .btn{ display:inline-flex; align-items:center; justify-content:center; padding:12px 16px; border-radius:10px; border:1px solid #000; background:#000; color:#fff; font-weight:600; cursor:pointer }
        .btn.secondary{ background:#fff; color:#000; border-color:var(--border) }
        .btn.orange{ background:var(--orange); border-color:var(--orange); color:#fff }
        .btn:disabled{ opacity:.7; cursor:not-allowed }
        .input{ width:100%; padding:12px 14px; border:1px solid var(--border); border-radius:10px }
        .card{ background:#fff; border:1px solid var(--border); border-radius:14px; padding:20px; box-shadow:0 1px 2px rgba(0,0,0,.03) }
        .grid{ display:grid; gap:20px } .grid-2{ grid-template-columns:1fr } @media(min-width:900px){ .grid-2{ grid-template-columns:1.2fr .8fr } }
        .muted{ color:var(--muted) } .badge{ font-size:12px; color:var(--muted) } .small{ font-size:12px }
        h1{ font-size:28px; margin:0 } h2{ font-size:22px; margin:12px 0 } h3{ font-size:18px; margin:12px 0 }
        hr{ border:none; border-top:1px solid var(--border); margin:24px 0 } .form-row{ display:flex; gap:12px; align-items:center }
        .footer{ border-top:1px solid var(--border); margin-top:32px; padding-top:20px; display:flex; align-items:center; justify-content:space-between; color:var(--muted); font-size:14px }
        .alert{ padding:12px 14px; background:#fffbe6; border:1px solid #ffe58f; border-radius:10px }
      `}</style>
    </SessionProvider>
  )
}
