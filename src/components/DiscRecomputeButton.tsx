'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  scope: 'session' | 'all-completed'
  sessionId?: string
  label: string
  compact?: boolean
}

export default function DiscRecomputeButton({ scope, sessionId, label, compact = false }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  async function handleClick() {
    setFeedback(null)

    const res = await fetch('/api/disc/recompute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, sessionId }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      setFeedback(data?.error || 'Gagal menghitung ulang hasil DiSC.')
      return
    }

    const updatedLabel = typeof data?.updated === 'number'
      ? `${data.updated} hasil diperbarui`
      : 'Hasil berhasil diperbarui'
    const skippedLabel = typeof data?.skipped === 'number' && data.skipped > 0
      ? `, ${data.skipped} dilewati`
      : ''

    setFeedback(`${updatedLabel}${skippedLabel}.`)
    startTransition(() => router.refresh())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: compact ? 'flex-start' : 'stretch', gap: '6px' }}>
      <button
        onClick={handleClick}
        disabled={isPending}
        style={{
          padding: compact ? '8px 12px' : '10px 14px',
          borderRadius: '10px',
          border: '1.5px solid #037894',
          backgroundColor: isPending ? '#E6F0F4' : '#fff',
          color: '#037894',
          cursor: isPending ? 'not-allowed' : 'pointer',
          fontSize: compact ? '12px' : '13px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {isPending ? 'Memproses...' : label}
      </button>
      {feedback && (
        <p style={{ margin: 0, fontSize: '11px', color: feedback.includes('Gagal') ? '#FF4F31' : '#005353', lineHeight: 1.5 }}>
          {feedback}
        </p>
      )}
    </div>
  )
}
