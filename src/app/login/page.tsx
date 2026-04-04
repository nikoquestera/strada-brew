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
    if (error) {
      setError('Email atau password salah.')
      setLoading(false)
      return
    }
    router.push('/dashboard/hrd')
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#E4DED8' }}>
      <div className="w-full max-w-md px-4">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ backgroundColor: '#020000' }}>
            <div className="text-center">
              <span className="text-white font-bold text-lg tracking-widest">B</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-wide" style={{ color: '#020000' }}>BREW</h1>
          <p className="text-sm mt-1" style={{ color: '#4C4845' }}>
            Strada Coffee — Internal Portal
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(76,72,69,0.12)' }}>
          <h2 className="text-base font-semibold mb-6" style={{ color: '#020000' }}>Masuk ke akun kamu</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#4C4845' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ border: '1.5px solid rgba(76,72,69,0.2)', backgroundColor: '#fafafa' }}
                onFocus={e => (e.target as HTMLElement).style.borderColor = '#037894'}
                onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(76,72,69,0.2)'}
                placeholder="nama@stradacoffee.co.id"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#4C4845' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ border: '1.5px solid rgba(76,72,69,0.2)', backgroundColor: '#fafafa' }}
                onFocus={e => (e.target as HTMLElement).style.borderColor = '#037894'}
                onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(76,72,69,0.2)'}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fff0ee', color: '#FF4F31' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ backgroundColor: '#037894', color: '#ffffff' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#025f76'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#037894'}
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#8A8A8D' }}>
          Akses terbatas untuk tim internal Strada Coffee
        </p>
      </div>
    </div>
  )
}