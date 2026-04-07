'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CfitEntryPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStart() {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length < 4) {
      setError('Masukkan kode akses yang valid')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/cfit/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan')
        return
      }
      router.push(`/tes-intelegensi/${data.access_code}`)
    } catch {
      setError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '430px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <img src="/strada-logo.svg" alt="Strada Coffee" style={{ height: '36px', width: 'auto', filter: 'grayscale(1) contrast(2)', opacity: 0.85, marginBottom: '16px' }} />
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#8A8A8D', margin: 0 }}>Assessment Center</p>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '36px', border: '1.5px solid #E8E4E0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#020000', margin: '0 0 8px' }}>Tes Intelegensi</h1>
          <p style={{ fontSize: '14px', color: '#8A8A8D', margin: '0 0 24px', lineHeight: 1.7 }}>
            Masukkan kode akses dari tim HRD Strada untuk membuka CFIT Skala 3B.
          </p>

          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#4C4845', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Kode Akses
          </label>
          <input
            value={code}
            onChange={(event) => { setCode(event.target.value.toUpperCase()); setError('') }}
            onKeyDown={(event) => event.key === 'Enter' && handleStart()}
            placeholder="Contoh: A1B2C3"
            maxLength={8}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '12px',
              border: `2px solid ${error ? '#FF4F31' : '#E8E4E0'}`,
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '4px',
              textAlign: 'center',
              textTransform: 'uppercase',
              outline: 'none',
              boxSizing: 'border-box',
              color: '#020000',
              backgroundColor: '#FAFAF9',
              fontFamily: 'monospace',
            }}
          />
          {error && <p style={{ fontSize: '13px', color: '#FF4F31', margin: '8px 0 0', fontWeight: 600 }}>{error}</p>}

          <button
            onClick={handleStart}
            disabled={loading || code.trim().length < 4}
            style={{
              width: '100%',
              marginTop: '18px',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: loading || code.trim().length < 4 ? '#E8E4E0' : '#020000',
              color: loading || code.trim().length < 4 ? '#8A8A8D' : '#fff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading || code.trim().length < 4 ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Memverifikasi...' : 'Buka Tes →'}
          </button>
        </div>
      </div>
    </div>
  )
}
