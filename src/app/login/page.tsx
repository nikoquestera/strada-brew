'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isFinanceUser } from '@/lib/auth/access'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

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
    
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    
    if (authError || !authData.user) { 
      setError('Email atau password salah.')
      setLoading(false)
      return 
    }

    // 2. Fetch role from secure API route
    try {
      const res = await fetch('/api/auth/role')
      if (res.ok) {
        const { role } = await res.json()
        const destination = role === 'FINANCE' ? '/dashboard/finance' : '/dashboard/hrd'
        router.push(destination)
        return
      }
    } catch (e) {
      console.error('Failed to fetch role:', e)
    }

    // Fallback if API fails
    router.push('/dashboard/hrd')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] p-6">
      <div className="w-full max-w-[420px]">
        {/* Logo Section */}
        <div className="text-center mb-10 flex flex-col items-center">
          <img src="/strada-logo.svg" alt="Strada Coffee" className="h-16 w-auto filter grayscale contrast-200 mb-4" />
          <p className="text-[12px] font-bold tracking-[0.3em] text-strada-blue uppercase mb-2">BREW</p>
          <p className="text-sm font-medium text-gray-500">Internal Portal — Tim Strada Coffee</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[28px] p-8 md:p-10 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">Masuk ke akun Anda</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-[13px] font-bold text-gray-700">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200/80 bg-gray-50 text-gray-900 text-sm focus:bg-white focus:ring-2 focus:ring-strada-blue/20 focus:border-strada-blue transition-all duration-200 outline-none placeholder:text-gray-400"
                placeholder="nama@stradacoffee.com"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[13px] font-bold text-gray-700">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200/80 bg-gray-50 text-gray-900 text-sm focus:bg-white focus:ring-2 focus:ring-strada-blue/20 focus:border-strada-blue transition-all duration-200 outline-none placeholder:text-gray-400"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-strada-coral text-[13px] font-medium px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-strada-coral shrink-0"></span>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-[15px] transition-all duration-200 flex items-center justify-center gap-2 ${
                loading 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-strada-blue text-white hover:bg-[#026a80] hover:-translate-y-0.5 shadow-sm hover:shadow-md active:translate-y-0'
              }`}>
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Memproses...
                </>
              ) : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] font-medium text-gray-400 mt-8">
          Akses terbatas untuk tim internal Strada Coffee
        </p>
      </div>
    </div>
  )
}
