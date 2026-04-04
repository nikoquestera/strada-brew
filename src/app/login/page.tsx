'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email atau password salah.'); setLoading(false); return }
    router.push('/dashboard/hrd')
  }

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .login-card { padding: 28px 20px !important; }
          .login-title { font-size: 26px !important; }
        }
      `}</style>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4DED8', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontSize: '30px', fontWeight: 800, color: '#020000', fontStyle: 'italic', margin: 0, lineHeight: 1 }} className="login-title">Strada</p>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '4px', color: '#037894', textTransform: 'uppercase', margin: '2px 0 0' }}>BREW</p>
            </div>
            <p style={{ fontSize: '13px', color: '#8A8A8D', margin: 0 }}>Internal Portal — Tim Strada Coffee</p>
          </div>

          {/* Card */}
          <div className="login-card" style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '36px', border: '1px solid rgba(76,72,69,0.12)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#020000', margin: '0 0 24px' }}>Masuk ke akun kamu</h2>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4C4845', marginBottom: '6px' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid rgba(76,72,69,0.2)', fontSize: '14px', outline: 'none', backgroundColor: '#fafafa', boxSizing: 'border-box' }}
                  placeholder="nama@stradacoffee.com"
                  onFocus={e => e.target.style.borderColor = '#037894'}
                  onBlur={e => e.target.style.borderColor = 'rgba(76,72,69,0.2)'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4C4845', marginBottom: '6px' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid rgba(76,72,69,0.2)', fontSize: '14px', outline: 'none', backgroundColor: '#fafafa', boxSizing: 'border-box' }}
                  placeholder="••••••••"
                  onFocus={e => e.target.style.borderColor = '#037894'}
                  onBlur={e => e.target.style.borderColor = 'rgba(76,72,69,0.2)'}
                />
              </div>

              {error && (
                <div style={{ backgroundColor: '#fff0ee', color: '#FF4F31', fontSize: '13px', padding: '12px 16px', borderRadius: '10px' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', backgroundColor: loading ? '#8A8A8D' : '#037894', color: '#fff', fontWeight: 700, fontSize: '15px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Masuk...' : 'Masuk'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#8A8A8D', marginTop: '20px' }}>
            Akses terbatas untuk tim internal Strada Coffee
          </p>
        </div>
      </div>
    </>
  )
}