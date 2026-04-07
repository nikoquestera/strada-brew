'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DiscEntry() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStart() {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length < 4) { setError('Masukkan kode akses yang valid'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/disc/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Terjadi kesalahan'); return }
      router.push(`/disc/${data.access_code}`)
    } catch {
      setError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img src="/strada-logo.svg" alt="Strada Coffee" style={{ height: '36px', width: 'auto', filter: 'grayscale(1) contrast(2)', opacity: 0.85, marginBottom: '16px' }} />
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#8A8A8D', margin: 0 }}>Assessment Center</p>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '36px', border: '1.5px solid #E8E4E0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#020000', margin: '0 0 8px' }}>Tes Kepribadian</h1>
            <p style={{ fontSize: '14px', color: '#8A8A8D', margin: 0, lineHeight: 1.6 }}>
              Masukkan kode akses yang telah diberikan oleh tim HRD Strada untuk memulai asesmen.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#4C4845', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Kode Akses
            </label>
            <input
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              placeholder="Contoh: A1B2C3"
              maxLength={8}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px',
                border: `2px solid ${error ? '#FF4F31' : '#E8E4E0'}`,
                fontSize: '20px', fontWeight: 700, letterSpacing: '4px',
                textAlign: 'center', textTransform: 'uppercase',
                outline: 'none', transition: 'border-color 0.2s',
                fontFamily: 'monospace', boxSizing: 'border-box',
                color: '#020000', backgroundColor: '#FAFAF9',
              }}
            />
            {error && (
              <p style={{ fontSize: '13px', color: '#FF4F31', margin: '8px 0 0', fontWeight: 600 }}>{error}</p>
            )}
          </div>

          <button
            onClick={handleStart}
            disabled={loading || code.trim().length < 4}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              backgroundColor: loading || code.trim().length < 4 ? '#E8E4E0' : '#020000',
              color: loading || code.trim().length < 4 ? '#8A8A8D' : '#fff',
              fontSize: '15px', fontWeight: 700, cursor: loading || code.trim().length < 4 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Memverifikasi...' : 'Mulai Tes →'}
          </button>
        </div>

        <div style={{ marginTop: '28px', padding: '16px 20px', backgroundColor: 'rgba(3,120,148,0.06)', borderRadius: '14px', border: '1px solid rgba(3,120,148,0.15)' }}>
          <p style={{ fontSize: '12px', color: '#037894', margin: '0 0 6px', fontWeight: 700 }}>Tentang Tes Kepribadian</p>
          <p style={{ fontSize: '12px', color: '#4C4845', margin: 0, lineHeight: 1.7 }}>
            Test ini terdiri dari 24 pertanyaan. Setiap pertanyaan memiliki 4 pilihan kata — pilih kata yang paling menggambarkan diri Anda (<b>P</b>) dan kata yang paling tidak menggambarkan Anda (<b>K</b>).
            Tidak ada jawaban benar atau salah. Kode akses hanya bisa digunakan satu kali.
          </p>
        </div>
      </div>
    </div>
  )
}
