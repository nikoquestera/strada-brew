'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CfitCropImage from '@/components/CfitCropImage'
import { CFIT_QUESTIONS, CFIT_SUBTESTS, CfitChoice, CfitQuestion } from '@/lib/cfit/data'
import { CfitAnswers } from '@/lib/cfit/scorer'

type Phase = 'loading' | 'intro' | 'testing' | 'transition' | 'submitting' | 'error'

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function CfitTestPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string).toUpperCase()

  const grouped = useMemo(() => {
    return CFIT_SUBTESTS.map((subtest) => ({
      ...subtest,
      questions: CFIT_QUESTIONS.filter((question) => question.subtestId === subtest.id),
    }))
  }, [])

  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState('')
  const [answers, setAnswers] = useState<CfitAnswers>({})
  const [subtestIndex, setSubtestIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(grouped[0].durationSeconds)
  const [transitionCountdown, setTransitionCountdown] = useState(3)

  const currentSubtest = grouped[subtestIndex]
  const currentQuestion = currentSubtest?.questions[questionIndex] as CfitQuestion | undefined

  useEffect(() => {
    async function checkCode() {
      try {
        const res = await fetch('/api/cfit/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_code: code }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Kode akses tidak valid')
          setPhase('error')
          return
        }
        setPhase('intro')
      } catch {
        setError('Gagal memverifikasi kode akses')
        setPhase('error')
      }
    }
    checkCode()
  }, [code])

  async function beginTest() {
    try {
      const res = await fetch('/api/cfit/begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal memulai tes')
        setPhase('error')
        return
      }
      setSubtestIndex(0)
      setQuestionIndex(0)
      setRemainingSeconds(grouped[0].durationSeconds)
      setPhase('testing')
    } catch {
      setError('Gagal memulai tes')
      setPhase('error')
    }
  }

  function pickChoice(choice: CfitChoice) {
    if (!currentQuestion) return
    setAnswers((previous) => {
      const current = previous[currentQuestion.id] || []
      if (currentQuestion.answerCount === 1) {
        return { ...previous, [currentQuestion.id]: [choice] }
      }
      if (current.includes(choice)) {
        return { ...previous, [currentQuestion.id]: current.filter((item) => item !== choice) }
      }
      if (current.length >= currentQuestion.answerCount) return previous
      return { ...previous, [currentQuestion.id]: [...current, choice] }
    })
  }

  const submitAll = useCallback(async () => {
    setPhase('submitting')
    try {
      const res = await fetch('/api/cfit/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: code, answers }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal mengirim jawaban')
        setPhase('error')
        return
      }
      router.push(`/tes-intelegensi/${code}/selesai`)
    } catch {
      setError('Gagal terhubung ke server')
      setPhase('error')
    }
  }, [answers, code, router])

  useEffect(() => {
    if (phase !== 'testing') return
    if (remainingSeconds <= 0) {
      const timer = window.setTimeout(() => {
        if (subtestIndex >= grouped.length - 1) {
          void submitAll()
        } else {
          setPhase('transition')
          setTransitionCountdown(3)
        }
      }, 0)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => setRemainingSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [grouped.length, phase, remainingSeconds, subtestIndex, submitAll])

  useEffect(() => {
    if (phase !== 'transition') return
    if (transitionCountdown <= 0) {
      const timer = window.setTimeout(() => {
        const nextIndex = subtestIndex + 1
        setSubtestIndex(nextIndex)
        setQuestionIndex(0)
        setRemainingSeconds(grouped[nextIndex].durationSeconds)
        setPhase('testing')
      }, 0)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => setTransitionCountdown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [grouped, phase, subtestIndex, transitionCountdown])

  function nextQuestion() {
    if (!currentQuestion) return
    const selected = answers[currentQuestion.id] || []
    if (selected.length !== currentQuestion.answerCount) return

    if (questionIndex < currentSubtest.questions.length - 1) {
      setQuestionIndex((value) => value + 1)
      return
    }

    if (subtestIndex >= grouped.length - 1) {
      submitAll()
      return
    }

    setPhase('transition')
    setTransitionCountdown(3)
  }

  const selected = currentQuestion ? (answers[currentQuestion.id] || []) : []
  const canProceed = currentQuestion ? selected.length === currentQuestion.answerCount : false
  const completedInSubtest = currentSubtest?.questions.filter((question) => (answers[question.id] || []).length === question.answerCount).length || 0
  const answeredTotal = CFIT_QUESTIONS.filter((question) => (answers[question.id] || []).length === question.answerCount).length

  if (phase === 'loading') {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', backgroundColor: '#F7F5F2', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Memuat tes...</div>
  }

  if (phase === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', backgroundColor: '#F7F5F2', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '520px', backgroundColor: '#fff', borderRadius: '20px', padding: '28px', border: '1.5px solid #E8E4E0' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#020000', margin: '0 0 10px' }}>Tes tidak dapat dibuka</h1>
          <p style={{ fontSize: '14px', color: '#4C4845', margin: 0, lineHeight: 1.7 }}>{error}</p>
        </div>
      </div>
    )
  }

  if (phase === 'intro') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: '#037894', textTransform: 'uppercase', margin: '0 0 8px' }}>Tes Kandidat</p>
            <h1 style={{ fontSize: '30px', fontWeight: 900, color: '#020000', margin: '0 0 10px' }}>Tes Intelegensi</h1>
            <p style={{ fontSize: '15px', color: '#4C4845', margin: 0, lineHeight: 1.7 }}>
              Baca petunjuk setiap subtes dengan saksama. Setelah Anda menekan tombol <b>Mulai sekarang</b>, timer akan berjalan dan soal pertama langsung ditampilkan.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '16px', marginBottom: '22px' }}>
            {grouped.map((subtest) => (
              <div key={subtest.id} style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '20px', border: '1.5px solid #E8E4E0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: '0 0 4px' }}>{subtest.title}</h2>
                    <p style={{ fontSize: '13px', color: '#8A8A8D', margin: 0 }}>{subtest.introSummary}</p>
                  </div>
                  <span style={{ padding: '6px 12px', borderRadius: '999px', backgroundColor: '#F7F5F2', border: '1px solid #E8E4E0', fontSize: '12px', fontWeight: 700, color: '#4C4845' }}>
                    {formatTime(subtest.durationSeconds)}
                  </span>
                </div>
                <img src={subtest.introImage} alt={`${subtest.title} instruksi`} style={{ width: '100%', display: 'block', borderRadius: '14px', border: '1px solid #E8E4E0' }} />
              </div>
            ))}
          </div>

          <div style={{ position: 'sticky', bottom: '24px', backgroundColor: '#020000', borderRadius: '20px', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', margin: 0 }}>
              Total waktu efektif: <b style={{ color: '#fff' }}>12 menit 30 detik</b>. Kode hanya bisa dipakai satu kali.
            </p>
            <button onClick={beginTest} style={{ padding: '12px 18px', borderRadius: '12px', border: 'none', backgroundColor: '#fff', color: '#020000', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>
              Mulai sekarang →
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'transition') {
    const nextSubtest = grouped[subtestIndex + 1]
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', backgroundColor: '#020000', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '620px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '3px', color: '#8FC6C5', textTransform: 'uppercase', margin: '0 0 10px' }}>Subtes Selesai</p>
          <h1 style={{ fontSize: '34px', fontWeight: 900, color: '#fff', margin: '0 0 12px' }}>{currentSubtest.title} selesai</h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.72)', margin: '0 0 24px', lineHeight: 1.7 }}>
            Bersiap ke {nextSubtest.title}. Timer berikutnya akan berjalan otomatis dalam {transitionCountdown} detik.
          </p>
          <div style={{ display: 'inline-flex', padding: '10px 16px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700 }}>
            {nextSubtest.introSummary}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#020000', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: '18px', margin: 0 }}>Tes Intelegensi</p>
            <p style={{ color: '#8FC6C5', fontSize: '12px', margin: '3px 0 0', fontWeight: 700 }}>
              {currentSubtest.title} • Soal {currentQuestion?.questionNo}/{currentSubtest.questions.length} • Kode {code}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#8FC6C5', fontSize: '11px', margin: '0 0 4px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Progress</p>
              <p style={{ color: '#fff', fontSize: '15px', fontWeight: 900, margin: 0 }}>{answeredTotal}/{CFIT_QUESTIONS.length}</p>
            </div>
            <div style={{ minWidth: '110px', textAlign: 'right' }}>
              <p style={{ color: '#8FC6C5', fontSize: '11px', margin: '0 0 4px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Sisa Waktu</p>
              <p style={{ color: remainingSeconds <= 20 ? '#FFB1A3' : '#fff', fontSize: '24px', fontWeight: 900, margin: 0 }}>{formatTime(remainingSeconds)}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '28px 20px 120px' }}>
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#037894', margin: '0 0 6px', letterSpacing: '2px', textTransform: 'uppercase' }}>
              {currentSubtest.title}
            </p>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#020000', margin: 0 }}>Pilih jawaban yang paling tepat</h2>
          </div>
          <div style={{ padding: '8px 12px', borderRadius: '999px', backgroundColor: '#fff', border: '1px solid #E8E4E0', fontSize: '12px', fontWeight: 700, color: '#4C4845' }}>
            Terjawab {completedInSubtest}/{currentSubtest.questions.length}
          </div>
        </div>

        {currentQuestion && (
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px', border: '1.5px solid #E8E4E0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
            <div style={{ marginBottom: '20px' }}>
              <CfitCropImage crop={currentQuestion.crop} alt={`${currentSubtest.title} nomor ${currentQuestion.questionNo}`} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: '#4C4845', margin: 0, lineHeight: 1.7 }}>
                {currentQuestion.answerCount === 2
                  ? 'Pilih tepat 2 jawaban. Anda tidak bisa lanjut sebelum dua pilihan dipilih.'
                  : 'Pilih tepat 1 jawaban. Anda tidak bisa lanjut sebelum satu pilihan dipilih.'}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {currentQuestion.choices.map((choice) => {
                  const active = selected.includes(choice)
                  return (
                    <button
                      key={choice}
                      onClick={() => pickChoice(choice)}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        border: `2px solid ${active ? '#037894' : '#E8E4E0'}`,
                        backgroundColor: active ? '#E6F4F8' : '#fff',
                        color: active ? '#037894' : '#4C4845',
                        fontSize: '15px',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      {choice}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '12px', color: '#8A8A8D' }}>
                {canProceed
                  ? 'Jawaban lengkap. Anda bisa lanjut.'
                  : currentQuestion.answerCount === 2
                    ? `Pilih ${currentQuestion.answerCount - selected.length} pilihan lagi.`
                    : 'Pilih satu jawaban untuk lanjut.'}
              </div>
              <button
                onClick={nextQuestion}
                disabled={!canProceed || phase === 'submitting'}
                style={{
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: !canProceed || phase === 'submitting' ? '#E8E4E0' : '#020000',
                  color: !canProceed || phase === 'submitting' ? '#8A8A8D' : '#fff',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: !canProceed || phase === 'submitting' ? 'not-allowed' : 'pointer',
                }}
              >
                {subtestIndex === grouped.length - 1 && questionIndex === currentSubtest.questions.length - 1 ? 'Selesaikan Tes' : 'Lanjut →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
