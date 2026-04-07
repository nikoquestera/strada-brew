'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DISC_QUESTIONS } from '@/lib/disc/data'

type Answers = Record<number, { most: string; least: string }>

export default function DiscTestPage() {
  const router = useRouter()
  const params = useParams()
  const code = (params.code as string).toUpperCase()

  const [answers, setAnswers] = useState<Answers>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [highlightUnanswered, setHighlightUnanswered] = useState(false)
  const [unansweredNos, setUnansweredNos] = useState<number[]>([])

  const answered = Object.keys(answers).length
  const total = DISC_QUESTIONS.length

  function pickMost(qNo: number, term: string) {
    setAnswers(prev => {
      const prev_ans = prev[qNo] || { most: '', least: '' }
      // Can't be same as least
      if (prev_ans.least === term) return prev
      return { ...prev, [qNo]: { ...prev_ans, most: term } }
    })
    setHighlightUnanswered(false)
  }

  function pickLeast(qNo: number, term: string) {
    setAnswers(prev => {
      const prev_ans = prev[qNo] || { most: '', least: '' }
      // Can't be same as most
      if (prev_ans.most === term) return prev
      return { ...prev, [qNo]: { ...prev_ans, least: term } }
    })
    setHighlightUnanswered(false)
  }

  const getUnanswered = useCallback(() => {
    return DISC_QUESTIONS.filter(q => {
      const a = answers[q.no]
      return !a || !a.most || !a.least
    }).map(q => q.no)
  }, [answers])

  async function handleSubmit() {
    const missing = getUnanswered()
    if (missing.length > 0) {
      setUnansweredNos(missing)
      setHighlightUnanswered(true)
      // Scroll to first unanswered
      const el = document.getElementById(`q-${missing[0]}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/disc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: code, answers }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Gagal mengirim jawaban')
        setSubmitting(false)
        return
      }
      router.push(`/disc/${code}/selesai`)
    } catch {
      setSubmitError('Gagal terhubung ke server')
      setSubmitting(false)
    }
  }

  const progressPct = Math.round((answered / total) * 100)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <style>{`
        .disc-option-btn { transition: all 0.15s; cursor: pointer; }
        .disc-option-btn:hover { border-color: #037894 !important; background-color: #F0F9FB !important; }
        .disc-option-btn.selected-most { border-color: #037894 !important; background-color: #E6F4F8 !important; }
        .disc-option-btn.selected-least { border-color: #005353 !important; background-color: #E6F4F1 !important; }
        .disc-option-btn.conflict { opacity: 0.4; cursor: not-allowed; }
        .disc-option-btn.unanswered-highlight { border-color: #FF4F31 !important; background-color: #FFF5F4 !important; }
        @media (max-width: 640px) {
          .disc-question-grid { grid-template-columns: 1fr !important; }
          .disc-header-inner { flex-direction: column !important; gap: 8px !important; }
        }
      `}</style>

      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: '#020000', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '14px 20px' }}>
          <div className="disc-header-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: '15px', margin: 0 }}>DiSC Personality Test</p>
              <p style={{ color: '#8FC6C5', fontSize: '11px', margin: '2px 0 0', fontWeight: 600, letterSpacing: '1px' }}>
                KODE: {code}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#8FC6C5', fontSize: '11px', margin: '0 0 4px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Progress</p>
                <p style={{ color: '#fff', fontSize: '14px', fontWeight: 800, margin: 0 }}>{answered}/{total}</p>
              </div>
              <div style={{ width: '80px', height: '6px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, backgroundColor: '#037894', borderRadius: '3px', transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px 120px' }}>
        {/* Instruction */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #E8E4E0', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#020000', margin: '0 0 8px' }}>Petunjuk Pengisian</h2>
          <p style={{ fontSize: '13px', color: '#4C4845', margin: 0, lineHeight: 1.7 }}>
            Untuk setiap kelompok kata berikut, pilih kata yang paling menggambarkan Anda dengan tombol{' '}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#E6F4F8', color: '#037894', fontWeight: 800, padding: '1px 8px', borderRadius: '6px', fontSize: '12px' }}>P</span>{' '}
            (Paling), dan kata yang paling tidak menggambarkan Anda dengan tombol{' '}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#E6F4F1', color: '#005353', fontWeight: 800, padding: '1px 8px', borderRadius: '6px', fontSize: '12px' }}>K</span>{' '}
            (Kurang). Tidak ada jawaban benar atau salah — pilih berdasarkan kebiasaan Anda secara alami.
          </p>
        </div>

        {/* Warning if unanswered */}
        {highlightUnanswered && unansweredNos.length > 0 && (
          <div style={{ backgroundColor: '#FFF0EE', borderRadius: '14px', padding: '14px 20px', border: '1.5px solid #FF4F31', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#FF4F31', margin: '0 0 4px' }}>
                Anda belum menjawab {unansweredNos.length} pertanyaan
              </p>
              <p style={{ fontSize: '12px', color: '#4C4845', margin: 0 }}>
                Silakan lengkapi pertanyaan nomor: {unansweredNos.join(', ')} sebelum melanjutkan.
              </p>
            </div>
          </div>
        )}

        {/* Legend header for columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 56px 56px', gap: '8px', alignItems: 'center', padding: '0 4px', marginBottom: '8px' }}>
          <div />
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', letterSpacing: '1px', textTransform: 'uppercase' }}>Kata / Frasa</div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#037894', letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center' }}>Paling</div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#005353', letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center' }}>Kurang</div>
        </div>

        {/* Questions */}
        {DISC_QUESTIONS.map((q) => {
          const ans = answers[q.no] || { most: '', least: '' }
          const isUnanswered = highlightUnanswered && unansweredNos.includes(q.no)

          return (
            <div
              key={q.no}
              id={`q-${q.no}`}
              style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                padding: '20px',
                border: `1.5px solid ${isUnanswered ? '#FF4F31' : '#E8E4E0'}`,
                marginBottom: '12px',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: ans.most && ans.least ? '#E6F4F1' : isUnanswered ? '#FFF0EE' : '#F7F5F2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    fontSize: '12px', fontWeight: 800,
                    color: ans.most && ans.least ? '#005353' : isUnanswered ? '#FF4F31' : '#8A8A8D',
                  }}>
                    {ans.most && ans.least ? '✓' : q.no}
                  </span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#8A8A8D', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Pertanyaan {q.no}
                </span>
                {isUnanswered && (
                  <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: '#FF4F31', backgroundColor: '#FFF0EE', padding: '2px 8px', borderRadius: '6px' }}>
                    Belum dijawab
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map((opt) => {
                  const isMost  = ans.most  === opt.term
                  const isLeast = ans.least === opt.term
                  const conflictMost  = !!ans.least && ans.least === opt.term
                  const conflictLeast = !!ans.most  && ans.most  === opt.term

                  return (
                    <div key={opt.term} style={{ display: 'grid', gridTemplateColumns: '1fr 48px 48px', gap: '8px', alignItems: 'center' }}>
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: isMost ? '#E6F4F8' : isLeast ? '#E6F4F1' : '#F7F5F2',
                        border: `1.5px solid ${isMost ? '#037894' : isLeast ? '#005353' : 'transparent'}`,
                        transition: 'all 0.15s',
                      }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: isMost ? '#037894' : isLeast ? '#005353' : '#020000' }}>
                          {opt.term}
                        </span>
                      </div>

                      {/* Most (P) button */}
                      <button
                        onClick={() => pickMost(q.no, opt.term)}
                        disabled={conflictMost}
                        style={{
                          width: '100%', height: '40px', borderRadius: '10px',
                          border: `2px solid ${isMost ? '#037894' : '#E8E4E0'}`,
                          backgroundColor: isMost ? '#037894' : '#fff',
                          color: isMost ? '#fff' : '#4C4845',
                          fontWeight: 800, fontSize: '12px',
                          cursor: conflictMost ? 'not-allowed' : 'pointer',
                          opacity: conflictMost ? 0.3 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        P
                      </button>

                      {/* Least (K) button */}
                      <button
                        onClick={() => pickLeast(q.no, opt.term)}
                        disabled={conflictLeast}
                        style={{
                          width: '100%', height: '40px', borderRadius: '10px',
                          border: `2px solid ${isLeast ? '#005353' : '#E8E4E0'}`,
                          backgroundColor: isLeast ? '#005353' : '#fff',
                          color: isLeast ? '#fff' : '#4C4845',
                          fontWeight: 800, fontSize: '12px',
                          cursor: conflictLeast ? 'not-allowed' : 'pointer',
                          opacity: conflictLeast ? 0.3 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        K
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Fixed bottom submit bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        backgroundColor: '#fff', borderTop: '1px solid #E8E4E0',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
        padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '12px', color: '#8A8A8D', margin: '0 0 4px', fontWeight: 600 }}>
              {answered < total
                ? `${total - answered} pertanyaan belum dijawab`
                : 'Semua pertanyaan sudah dijawab'}
            </p>
            <div style={{ height: '6px', backgroundColor: '#F0F0F0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, backgroundColor: answered === total ? '#005353' : '#037894', borderRadius: '3px', transition: 'width 0.3s' }} />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '12px 28px', borderRadius: '12px', border: 'none',
              backgroundColor: submitting ? '#8A8A8D' : '#020000',
              color: '#fff', fontSize: '14px', fontWeight: 800,
              cursor: submitting ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', transition: 'background-color 0.2s',
              flexShrink: 0,
            }}
          >
            {submitting ? 'Mengirim...' : 'Kirim Jawaban →'}
          </button>
        </div>
        {submitError && (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#FF4F31', margin: '8px 0 0', fontWeight: 600 }}>{submitError}</p>
        )}
      </div>
    </div>
  )
}
