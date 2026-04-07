'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PIPELINE_STAGES, PipelineStage } from '@/lib/types'
import { ArrowLeft, Phone, Mail, AtSign, MapPin, Calendar, Briefcase, Star, MessageSquare, Send, Clock, Edit2, Brain } from 'lucide-react'

interface QuestScore {
  id: string
  overall_score?: number
  experience_score?: number
  certification_score?: number
  completeness_score?: number
  motivation_score?: number
  profile_score?: number
  summary?: string
  strengths?: string[]
  concerns?: string[]
  recommendation?: string
  quest_notes?: string
  status: string
  processed_at?: string
  created_at?: string
}

interface DiscPatternResult {
  pattern?: string
}

interface DiscSessionResult {
  pattern?: DiscPatternResult
}

interface DiscSession {
  id: string
  access_code: string
  status: string
  sent_at?: string
  completed_at?: string
  results?: DiscSessionResult | null
}

interface IntelTest {
  id: string
  access_code: string
  status: string
  sent_at?: string
  started_at?: string
  completed_at?: string
  score?: number | null
  score_percentage?: number | null
  total_points?: number | null
  tests?: { title?: string | null }[] | { title?: string | null } | null
}

interface ApplicantActivity {
  id: string
  activity_type?: string | null
  to_stage?: string | null
  note?: string | null
  created_at: string
}

interface ApplicantData {
  id: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
  birth_date?: string | null
  domicile?: string | null
  instagram_url?: string | null
  position_applied?: string | null
  outlet_preference?: string | null
  source?: string | null
  pipeline_stage?: PipelineStage
  quest_score?: number | null
  created_at: string
  has_cafe_experience?: boolean | null
  cafe_experience_years?: number | null
  cafe_experience_detail?: string | null
  has_barista_cert?: boolean | null
  cert_detail?: string | null
  education_level?: string | null
  hr_notes?: string | null
  status?: string | null
  screening_notes?: string | null
  applicant_quest_scores?: QuestScore[]
  applicant_activities?: ApplicantActivity[]
  disc_sessions?: DiscSession[]
  applicant_tests?: IntelTest[]
}

type EditForm = {
  full_name: string
  email: string
  phone: string
  birth_date: string
  domicile: string
  position_applied: string
  outlet_preference: string
  education_level: string
  has_cafe_experience: boolean
  cafe_experience_years: number
  cafe_experience_detail: string
  has_barista_cert: boolean
  cert_detail: string
  instagram_url: string
  hr_notes: string
}

type EditableTextKey =
  | 'full_name'
  | 'email'
  | 'phone'
  | 'birth_date'
  | 'domicile'
  | 'position_applied'
  | 'outlet_preference'
  | 'education_level'
  | 'instagram_url'

interface Props {
  applicant: ApplicantData
}

function scoreColor(s: number) { return s >= 75 ? '#005353' : s >= 50 ? '#DE9733' : '#FF4F31' }
function scoreBg(s: number) { return s >= 75 ? '#E6F4F1' : s >= 50 ? '#FEF8E6' : '#FFF0EE' }

function formatTs(ts?: string) {
  if (!ts) return null
  return new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ApplicantDetailClient({ applicant }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const applicantActivities = applicant.applicant_activities || []
  const [currentStage, setCurrentStage] = useState<PipelineStage>(applicant.pipeline_stage || 'baru_masuk')
  const [changingStage, setChangingStage] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageChannel, setMessageChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [generatingMessages, setGeneratingMessages] = useState(false)
  const [messageOptions, setMessageOptions] = useState<{ option1: string; option2: string; option3: string } | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)

  // Score state — all runs ordered latest first
  const [scores, setScores] = useState<QuestScore[]>(
    (applicant.applicant_quest_scores || []).sort((a: QuestScore, b: QuestScore) =>
      new Date(b.processed_at || b.created_at || 0).getTime() -
      new Date(a.processed_at || a.created_at || 0).getTime()
    )
  )
  const [scoring, setScoring] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState(false)
  const scoresRef = useRef(scores)
  useEffect(() => { scoresRef.current = scores }, [scores])

  // DiSC Assessment
  const [discSessions, setDiscSessions] = useState<DiscSession[]>(applicant.disc_sessions || [])
  const [sendingDisc, setSendingDisc] = useState(false)
  const [discSent, setDiscSent] = useState<string | null>(null)
  const [intelTests, setIntelTests] = useState<IntelTest[]>(applicant.applicant_tests || [])
  const [sendingIntel, setSendingIntel] = useState(false)
  const [intelSent, setIntelSent] = useState<string | null>(null)

  async function handleSendDisc() {
    setSendingDisc(true)
    setDiscSent(null)
    try {
      const res = await fetch('/api/disc/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicant_id: applicant.id }),
      })
      const data = await res.json()
      if (res.ok && data.session) {
        setDiscSessions(prev => [data.session, ...prev])
        setDiscSent(data.session.access_code)
      }
    } finally {
      setSendingDisc(false)
    }
  }

  async function handleSendIntel() {
    setSendingIntel(true)
    setIntelSent(null)
    try {
      const res = await fetch('/api/cfit/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicant_id: applicant.id }),
      })
      const data = await res.json()
      if (res.ok && data.session) {
        setIntelTests((prev) => [data.session, ...prev])
        setIntelSent(data.session.access_code)
      }
    } finally {
      setSendingIntel(false)
    }
  }

  // Screening Notes
  const [screeningNotes, setScreeningNotes] = useState<string>(applicant.screening_notes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  async function handleSaveNotes() {
    setSavingNotes(true)
    await supabase.from('applicants').update({ screening_notes: screeningNotes }).eq('id', applicant.id)
    setSavingNotes(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  // Edit applicant
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: applicant.full_name || '',
    email: applicant.email || '',
    phone: applicant.phone || '',
    birth_date: applicant.birth_date || '',
    domicile: applicant.domicile || '',
    position_applied: applicant.position_applied || '',
    outlet_preference: applicant.outlet_preference || '',
    education_level: applicant.education_level || '',
    has_cafe_experience: applicant.has_cafe_experience || false,
    cafe_experience_years: applicant.cafe_experience_years || 0,
    cafe_experience_detail: applicant.cafe_experience_detail || '',
    has_barista_cert: applicant.has_barista_cert || false,
    cert_detail: applicant.cert_detail || '',
    instagram_url: applicant.instagram_url || '',
    hr_notes: applicant.hr_notes || '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editData, setEditData] = useState<ApplicantData>(applicant)
  const setEdit = <K extends keyof EditForm>(key: K, value: EditForm[K]) => setEditForm((form) => ({ ...form, [key]: value }))

  async function handleSaveEdit() {
    setSavingEdit(true)
    const { data } = await supabase.from('applicants').update(editForm).eq('id', applicant.id).select().single()
    if (data) setEditData(data)
    setSavingEdit(false)
    setShowEditModal(false)
  }

  const latestScore = scores[0]
  const isProcessing = latestScore?.status === 'processing' || scoring

  // Poll every 3s while any score is processing
  useEffect(() => {
    const interval = setInterval(async () => {
      const hasProcessing = scoresRef.current.some(s => s.status === 'processing')
      if (!hasProcessing) return
      const { data } = await supabase
        .from('applicant_quest_scores')
        .select('*')
        .eq('applicant_id', applicant.id)
        .order('processed_at', { ascending: false, nullsFirst: false })
      if (data) setScores(data)
    }, 3000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stageInfo = PIPELINE_STAGES.find(s => s.key === currentStage)
  const editableFields: Array<{ key: EditableTextKey; label: string; type: string }> = [
    { key: 'full_name', label: 'Nama Lengkap', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'No. HP', type: 'tel' },
    { key: 'birth_date', label: 'Tanggal Lahir', type: 'date' },
    { key: 'domicile', label: 'Domisili', type: 'text' },
    { key: 'position_applied', label: 'Posisi Dilamar', type: 'text' },
    { key: 'outlet_preference', label: 'Outlet Preferensi', type: 'text' },
    { key: 'education_level', label: 'Pendidikan', type: 'text' },
    { key: 'instagram_url', label: 'Instagram', type: 'text' },
  ]

  async function handleStageChange(newStage: PipelineStage) {
    setChangingStage(true)
    await supabase.from('applicants').update({ pipeline_stage: newStage }).eq('id', applicant.id)
    setCurrentStage(newStage)
    setChangingStage(false)
  }

  async function handleRunScore() {
    setScoring(true)
    // Optimistically add a processing record
    const tempId = `tmp-${Date.now()}`
    setScores(prev => [{ id: tempId, status: 'processing', created_at: new Date().toISOString() }, ...prev])
    try {
      const res = await fetch('/api/quest/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicant_id: applicant.id }),
      })
      if (!res.ok) throw new Error(await res.text())
    } catch (err) {
      console.error('Score trigger failed:', err)
      setScores(prev => prev.map(s => s.id === tempId ? { ...s, status: 'failed' } : s))
    } finally {
      setScoring(false)
    }
  }

  async function handleGenerateMessages() {
    setGeneratingMessages(true)
    const res = await fetch('/api/quest/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicant_name: applicant.full_name,
        position: applicant.position_applied,
        outlet: applicant.outlet_preference,
        stage: stageInfo?.label || currentStage,
        channel: messageChannel,
        hr_name: 'Tim HR Strada Coffee',
      }),
    })
    const data = await res.json()
    setMessageOptions(data)
    setGeneratingMessages(false)
  }

  return (
    <>
      <style>{`
        @keyframes quest-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr !important; } .stage-select { font-size: 12px !important; padding: 8px 10px !important; } }
        .appl-back:hover { background-color: #E8E4E0 !important; color: #020000 !important; }
        .appl-run-score:hover:not(:disabled) { opacity: 0.85 !important; }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>
        {/* Top bar — Refined to light style */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px 24px', borderBottom: '1px solid #E8E4E0', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', sticky: 'top', zIndex: 10 }}>
          <button onClick={() => router.back()} className="appl-back"
            style={{ color: '#8A8A8D', background: '#F7F5F2', border: '1px solid #E8E4E0', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px', fontWeight: 700, transition: 'all 0.2s' }}>
            <ArrowLeft size={16} /> Kembali
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ color: '#020000', fontWeight: 800, fontSize: '18px', margin: 0 }}>{editData.full_name}</h1>
              <span style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: `${stageInfo?.color || '#8A8A8D'}15`, color: stageInfo?.color || '#8A8A8D', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {stageInfo?.label || 'Baru Masuk'}
              </span>
            </div>
            <p style={{ color: '#037894', fontSize: '12px', fontWeight: 700, margin: '2px 0 0' }}>{editData.position_applied}{editData.outlet_preference ? ` · ${editData.outlet_preference}` : ''}</p>
          </div>
          <button onClick={() => setShowEditModal(true)}
            style={{ color: '#4C4845', background: '#ffffff', border: '1.5px solid #E8E4E0', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 16px', fontWeight: 700, transition: 'all 0.2s' }}>
            <Edit2 size={14} /> Edit Data
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '1px' }}>Update Status:</span>
            <select value={currentStage} onChange={e => handleStageChange(e.target.value as PipelineStage)}
              disabled={changingStage} className="stage-select"
              style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', backgroundColor: stageInfo?.color || '#037894', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', outline: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

          {/* Quest AI Score Section — Repositioned to top, full width, blended style */}
          <div style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '24px', 
            padding: '32px', 
            border: '1.5px solid #E8E4E0', 
            marginBottom: '24px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Subtle AI Gradient Accent */}
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              height: '4px', 
              background: 'linear-gradient(90deg, #037894 0%, #8FC6C5 100%)' 
            }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ backgroundColor: '#E6F4F8', padding: '8px', borderRadius: '12px' }}>
                  <Star size={20} color="#037894" fill="#037894" />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: 0 }}>Quest AI Evaluation</h2>
                  <p style={{ fontSize: '12px', color: '#8A8A8D', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Analis Profil Otomatis</p>
                </div>
              </div>
              <button onClick={handleRunScore} disabled={isProcessing} className="appl-run-score"
                style={{ padding: '8px 20px', borderRadius: '12px', border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: isProcessing ? '#F7F5F2' : '#020000', color: isProcessing ? '#8A8A8D' : '#fff', transition: 'all 0.2s', boxShadow: isProcessing ? 'none' : '0 4px 12px rgba(0,0,0,0.1)' }}>
                {isProcessing
                  ? <><span style={{ display: 'inline-block', animation: 'quest-spin 1s linear infinite' }}>⚙</span> Sedang Menganalisa...</>
                  : scores.length > 0 ? '↻ Re-run AI Analysis' : '✦ Run Quest AI Scoring'}
              </button>
            </div>

            {!latestScore ? (
              <div style={{ padding: '40px 0', textAlign: 'center', backgroundColor: '#F9FBFB', borderRadius: '16px', border: '1px dashed #D1E5E9' }}>
                <p style={{ color: '#037894', fontSize: '14px', fontWeight: 600, margin: 0 }}>Belum ada evaluasi AI. Klik "Run Quest AI Scoring" untuk memulai analisis otomatis.</p>
              </div>
            ) : latestScore.status === 'pending' ? (
              <div style={{ padding: '40px 0', textAlign: 'center', backgroundColor: '#FEF8E6', borderRadius: '16px', border: '1px solid #F9EBC8' }}>
                <p style={{ color: '#DE9733', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>⏳ Dalam Antrian</p>
                <p style={{ color: '#8A6D3B', fontSize: '13px', margin: 0 }}>Quest AI akan segera memproses profil ini.</p>
              </div>
            ) : latestScore.status === 'processing' ? (
              <div style={{ padding: '40px 0', textAlign: 'center', backgroundColor: '#E6F4F8', borderRadius: '16px', border: '1px solid #BFE0E9' }}>
                <div style={{ display: 'inline-block', animation: 'quest-spin 2s linear infinite', marginBottom: '12px' }}>
                  <Star size={32} color="#037894" />
                </div>
                <p style={{ color: '#037894', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Sedang Menganalisa Profil...</p>
                <p style={{ color: '#548894', fontSize: '13px', margin: 0 }}>Membandingkan pengalaman dan kualifikasi dengan kriteria outlet.</p>
              </div>
            ) : latestScore.status === 'failed' ? (
              <div style={{ padding: '40px 0', textAlign: 'center', backgroundColor: '#FFF0EE', borderRadius: '16px', border: '1px solid #F9D7D5' }}>
                <p style={{ color: '#FF4F31', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>⚠ Scoring Gagal</p>
                <p style={{ color: '#A34B41', fontSize: '13px', margin: 0 }}>Terjadi kesalahan saat memproses. Silakan coba lagi.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '40px' }} className="detail-grid">
                {/* Left: Big Score */}
                <div style={{ paddingRight: '40px', borderRight: '1px solid #F0EDE9' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <div style={{ fontSize: '72px', fontWeight: 900, color: '#020000', lineHeight: 1 }}>{latestScore.overall_score}</div>
                      <div style={{ fontSize: '14px', color: '#8A8A8D', fontWeight: 700, marginTop: '4px' }}>DARI 100</div>
                    </div>
                    
                    {latestScore.recommendation && (
                      <div style={{ 
                        marginTop: '20px', 
                        display: 'block', 
                        padding: '10px 16px', 
                        borderRadius: '12px', 
                        fontSize: '14px', 
                        fontWeight: 800,
                        backgroundColor: latestScore.recommendation === 'Highly Recommended' ? '#005353' : latestScore.recommendation === 'Recommended' ? '#037894' : latestScore.recommendation === 'Consider' ? '#DE9733' : '#FF4F31',
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                      }}>
                        {latestScore.recommendation.toUpperCase()}
                      </div>
                    )}
                    
                    {latestScore.processed_at && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
                        <Clock size={12} color="#8A8A8D" />
                        <span style={{ fontSize: '11px', color: '#8A8A8D', fontWeight: 500 }}>{formatTs(latestScore.processed_at)}</span>
                      </div>
                    )}
                  </div>

                  {/* Small Breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
                    {[
                      { label: 'Pengalaman', value: latestScore.experience_score, max: 25 },
                      { label: 'Sertifikasi', value: latestScore.certification_score, max: 20 },
                      { label: 'Motivasi', value: latestScore.motivation_score, max: 20 },
                      { label: 'Profil', value: latestScore.profile_score, max: 20 },
                      { label: 'Kelengkapan', value: latestScore.completeness_score, max: 15 },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#4C4845', fontWeight: 700 }}>{item.label}</span>
                          <span style={{ fontSize: '11px', color: '#037894', fontWeight: 800 }}>{item.value || 0}/{item.max}</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#F0F4F5' }}>
                          <div style={{ height: '100%', borderRadius: '3px', backgroundColor: '#037894', width: `${((item.value || 0) / item.max) * 100}%`, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Detailed Text Results */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {latestScore.summary && (
                    <div>
                      <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>Ringkasan Analisis</h3>
                      <p style={{ fontSize: '15px', color: '#020000', lineHeight: 1.7, margin: 0, fontWeight: 500 }}>{latestScore.summary}</p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {latestScore.strengths && latestScore.strengths.length > 0 && (
                      <div style={{ backgroundColor: '#F4FAF9', padding: '20px', borderRadius: '16px', border: '1px solid #D1E9E4' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#005353', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Kekuatan Utama</h3>
                        {latestScore.strengths.map((s: string, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ color: '#005353', fontSize: '14px', fontWeight: 900, flexShrink: 0 }}>✓</span>
                            <span style={{ fontSize: '13px', color: '#005353', lineHeight: 1.5, fontWeight: 600 }}>{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {latestScore.concerns && latestScore.concerns.length > 0 && (
                      <div style={{ backgroundColor: '#FFF5F4', padding: '20px', borderRadius: '16px', border: '1px solid #F9D7D5' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#A34B41', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Hal Perlu Diperhatikan</h3>
                        {latestScore.concerns.map((c: string, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ color: '#FF4F31', fontSize: '14px', fontWeight: 900, flexShrink: 0 }}>!</span>
                            <span style={{ fontSize: '13px', color: '#A34B41', lineHeight: 1.5, fontWeight: 600 }}>{c}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {latestScore.quest_notes && (
                    <div style={{ backgroundColor: '#F7F5F2', padding: '16px 20px', borderRadius: '16px', border: '1px solid #E8E4E0' }}>
                      <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>Instruksi Khusus HR</h3>
                      <p style={{ fontSize: '13px', color: '#4C4845', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>&quot;{latestScore.quest_notes}&quot;</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }} className="detail-grid">

            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Contact */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 16px' }}>Informasi Kontak</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { icon: <Phone size={14} />, label: 'No. HP', value: editData.phone },
                  { icon: <Mail size={14} />, label: 'Email', value: editData.email },
                  { icon: <MapPin size={14} />, label: 'Domisili', value: editData.domicile || '-' },
                  { icon: <AtSign size={14} />, label: 'Instagram', value: editData.instagram_url || '-' },
                  { icon: <Calendar size={14} />, label: 'Tgl Lahir', value: editData.birth_date ? new Date(editData.birth_date).toLocaleDateString('id-ID') : '-' },
                  { icon: <Briefcase size={14} />, label: 'Pendidikan', value: editData.education_level || '-' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ color: '#037894', marginTop: '2px', flexShrink: 0 }}>{item.icon}</div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</p>
                      <p style={{ fontSize: '13px', color: '#020000', margin: 0, fontWeight: 500 }}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 16px' }}>Pengalaman & Sertifikasi</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', backgroundColor: '#F7F5F2' }}>
                  <span style={{ fontSize: '13px', color: '#4C4845' }}>Pengalaman kafe</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: editData.has_cafe_experience ? '#005353' : '#8A8A8D' }}>
                    {editData.has_cafe_experience ? `${editData.cafe_experience_years} tahun` : 'Belum ada'}
                  </span>
                </div>
                {editData.cafe_experience_detail && (
                  <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#F7F5F2' }}>
                    <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '0 0 4px' }}>Detail pengalaman</p>
                    <p style={{ fontSize: '13px', color: '#4C4845', margin: 0 }}>{editData.cafe_experience_detail}</p>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', backgroundColor: '#F7F5F2' }}>
                  <span style={{ fontSize: '13px', color: '#4C4845' }}>Sertifikasi barista</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: editData.has_barista_cert ? '#005353' : '#8A8A8D' }}>
                    {editData.has_barista_cert ? 'Ada' : 'Tidak ada'}
                  </span>
                </div>
                {editData.cert_detail && (
                  <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#F7F5F2' }}>
                    <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '0 0 4px' }}>Detail sertifikasi</p>
                    <p style={{ fontSize: '13px', color: '#4C4845', margin: 0 }}>{editData.cert_detail}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Motivation */}
            {editData.hr_notes && (
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 12px' }}>Motivasi</h3>
                <p style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>&quot;{editData.hr_notes}&quot;</p>
              </div>
            )}

            {/* Screening Notes — Feature 6 */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <MessageSquare size={14} color="#037894" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: 0 }}>Catatan Screening</h3>
              </div>
              <p style={{ fontSize: '12px', color: '#8A8A8D', margin: '0 0 10px', lineHeight: 1.5 }}>
                Panduan untuk Quest AI dalam mengevaluasi kandidat ini — misalnya kriteria khusus, kekhawatiran, atau konteks peran.
              </p>
              <textarea
                value={screeningNotes}
                onChange={e => setScreeningNotes(e.target.value)}
                placeholder="Contoh: Kandidat ini dilamar untuk outlet Senopati yang butuh barista berpengalaman minimal 2 tahun. Prioritaskan pengalaman specialty coffee..."
                style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', color: '#020000', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
              />
              <button onClick={handleSaveNotes} disabled={savingNotes}
                style={{ marginTop: '10px', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: savingNotes ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, backgroundColor: notesSaved ? '#005353' : '#037894', color: '#fff', transition: 'background-color 0.2s' }}>
                {notesSaved ? '✓ Tersimpan' : savingNotes ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
            </div>

            {/* Scoring history */}
            {scores.length > 1 && (
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <button onClick={() => setExpandedHistory(p => !p)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: 0 }}>
                    Riwayat Scoring ({scores.length} run)
                  </h3>
                  <span style={{ fontSize: '12px', color: '#037894', fontWeight: 600 }}>{expandedHistory ? '▲ Tutup' : '▼ Lihat semua'}</span>
                </button>
                {expandedHistory && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                    {scores.map((s, i) => (
                      <div key={s.id} style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: i === 0 ? 'rgba(3,120,148,0.04)' : '#F7F5F2', border: `1px solid ${i === 0 ? 'rgba(3,120,148,0.2)' : '#E8E4E0'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {s.status === 'completed' && s.overall_score ? (
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: scoreBg(s.overall_score), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: '13px', fontWeight: 800, color: scoreColor(s.overall_score) }}>{s.overall_score}</span>
                            </div>
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: s.status === 'failed' ? '#FFF0EE' : '#E6F0F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: '14px' }}>{s.status === 'processing' ? '⚙' : s.status === 'failed' ? '⚠' : '⏳'}</span>
                            </div>
                          )}
                          <div>
                            {i === 0 && <span style={{ fontSize: '10px', fontWeight: 700, color: '#037894', textTransform: 'uppercase', letterSpacing: '1px' }}>Terbaru</span>}
                            {s.recommendation && <p style={{ fontSize: '12px', fontWeight: 600, color: '#020000', margin: '1px 0 0' }}>{s.recommendation}</p>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <Clock size={11} color="#8A8A8D" />
                          <span style={{ fontSize: '11px', color: '#8A8A8D' }}>{formatTs(s.processed_at || s.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activity timeline */}
            {applicantActivities.length > 0 && (
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 16px' }}>Timeline Aktivitas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {applicantActivities.slice(0, 10).map((act: ApplicantActivity) => (
                    <div key={act.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#037894', marginTop: '5px', flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: '13px', color: '#4C4845', margin: '0 0 2px' }}>
                          {act.activity_type === 'stage_changed'
                            ? `Dipindahkan ke ${PIPELINE_STAGES.find(s => s.key === act.to_stage)?.label || act.to_stage}`
                            : act.activity_type === 'applied' ? 'Mendaftar via portal'
                            : act.note || act.activity_type}
                        </p>
                        <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>
                          {new Date(act.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Tes Kandidat */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid #E8E4E0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Brain size={14} color="#037894" />
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#020000', margin: 0 }}>Tes Kandidat</h3>
              </div>

              <div style={{ padding: '12px 12px 10px', borderRadius: '12px', backgroundColor: '#F7F5F2', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 800, color: '#020000', margin: 0 }}>Tes Kepribadian</p>
                    <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '2px 0 0' }}>Mekanisme DISC yang sudah ada</p>
                  </div>
                  <button
                    onClick={handleSendDisc}
                    disabled={sendingDisc}
                    style={{ padding: '8px 12px', borderRadius: '10px', border: 'none', backgroundColor: sendingDisc ? '#E8E4E0' : '#020000', color: sendingDisc ? '#8A8A8D' : '#fff', cursor: sendingDisc ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '12px' }}
                  >
                    {sendingDisc ? 'Membuat...' : 'Kirim'}
                  </button>
                </div>

                {discSessions.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {discSessions.slice(0, 3).map((s: DiscSession) => {
                      const statusColor: Record<string,string> = { pending: '#DE9733', started: '#037894', completed: '#005353', expired: '#8A8A8D' }
                      const statusLabel: Record<string,string> = { pending: 'Menunggu', started: 'Dikerjakan', completed: 'Selesai', expired: 'Kadaluarsa' }
                      return (
                        <div key={s.id} style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', border: '1px solid #E8E4E0' }}>
                          <div>
                            <code style={{ fontSize: '13px', fontWeight: 800, color: '#020000', letterSpacing: '2px' }}>{s.access_code}</code>
                            {s.results?.pattern?.pattern && <p style={{ fontSize: '11px', color: '#037894', fontWeight: 700, margin: '1px 0 0' }}>{s.results.pattern.pattern}</p>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: statusColor[s.status] || '#8A8A8D', backgroundColor: statusColor[s.status] + '18', padding: '2px 8px', borderRadius: '6px' }}>{statusLabel[s.status] || s.status}</span>
                            {s.status === 'completed' && <a href={`/dashboard/hrd/disc/${s.id}`} style={{ fontSize: '10px', fontWeight: 700, color: '#037894', textDecoration: 'none', padding: '2px 8px', borderRadius: '6px', border: '1px solid #037894' }}>Hasil →</a>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {discSent && (
                  <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: '#E6F4F1', border: '1px solid #005353', marginTop: '8px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#005353', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Kode Baru</p>
                    <code style={{ fontSize: '18px', fontWeight: 900, color: '#005353', letterSpacing: '4px' }}>{discSent}</code>
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 12px 10px', borderRadius: '12px', backgroundColor: '#F7F5F2' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 800, color: '#020000', margin: 0 }}>Tes Intelegensi</p>
                    <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '2px 0 0' }}>CFIT 3B dengan timer per subtes</p>
                  </div>
                  <button
                    onClick={handleSendIntel}
                    disabled={sendingIntel}
                    style={{ padding: '8px 12px', borderRadius: '10px', border: 'none', backgroundColor: sendingIntel ? '#E8E4E0' : '#037894', color: '#fff', cursor: sendingIntel ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '12px' }}
                  >
                    {sendingIntel ? 'Membuat...' : 'Kirim'}
                  </button>
                </div>

                {intelTests.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {intelTests.slice(0, 3).map((s: IntelTest) => {
                      const statusColor: Record<string,string> = { pending: '#DE9733', started: '#037894', completed: '#005353', expired: '#8A8A8D' }
                      const statusLabel: Record<string,string> = { pending: 'Menunggu', started: 'Dikerjakan', completed: 'Selesai', expired: 'Kadaluarsa' }
                      return (
                        <div key={s.id} style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', border: '1px solid #E8E4E0' }}>
                          <div>
                            <code style={{ fontSize: '13px', fontWeight: 800, color: '#020000', letterSpacing: '2px' }}>{s.access_code}</code>
                            {typeof s.score === 'number' && <p style={{ fontSize: '11px', color: '#037894', fontWeight: 700, margin: '1px 0 0' }}>Skor {s.score}/{s.total_points || 50}</p>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: statusColor[s.status] || '#8A8A8D', backgroundColor: statusColor[s.status] + '18', padding: '2px 8px', borderRadius: '6px' }}>{statusLabel[s.status] || s.status}</span>
                            {s.status === 'completed' && <a href={`/dashboard/hrd/cfit/${s.id}`} style={{ fontSize: '10px', fontWeight: 700, color: '#037894', textDecoration: 'none', padding: '2px 8px', borderRadius: '6px', border: '1px solid #037894' }}>Hasil →</a>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {intelSent && (
                  <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: '#E6F4F8', border: '1px solid #037894', marginTop: '8px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#037894', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Kode Baru</p>
                    <code style={{ fontSize: '18px', fontWeight: 900, color: '#037894', letterSpacing: '4px' }}>{intelSent}</code>
                    <p style={{ fontSize: '11px', color: '#4C4845', margin: '6px 0 0' }}>Link kandidat: <strong>{`brew.stradacoffee.com/tes-intelegensi/${intelSent}`}</strong></p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid #E8E4E0' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#020000', margin: '0 0 12px' }}>Aksi</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => { setMessageChannel('whatsapp'); setShowMessageModal(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', backgroundColor: '#E6F4F1', color: '#005353', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                  <MessageSquare size={14} /> Kirim WhatsApp
                </button>
                <button onClick={() => { setMessageChannel('email'); setShowMessageModal(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', backgroundColor: '#E6F0F4', color: '#037894', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                  <Send size={14} /> Kirim Email
                </button>
              </div>
            </div>

            {/* Meta */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid #E8E4E0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Sumber', value: applicant.source || 'Portal' },
                  { label: 'Mendaftar', value: new Date(applicant.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) },
                  { label: 'Status', value: stageInfo?.label || 'Baru Masuk' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#8A8A8D' }}>{item.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#020000' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Applicant Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false) }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#020000', margin: 0 }}>Edit Data Pelamar</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#8A8A8D' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {editableFields.map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4C4845', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={editForm[field.key]}
                    onChange={e => setEdit(field.key, e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', color: '#020000', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4C4845', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pengalaman Kafe</label>
                  <select value={editForm.has_cafe_experience ? 'ya' : 'tidak'} onChange={e => setEdit('has_cafe_experience', e.target.value === 'ya')}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', color: '#020000', boxSizing: 'border-box', outline: 'none' }}>
                    <option value="tidak">Belum ada</option>
                    <option value="ya">Ada</option>
                  </select>
                </div>
                {editForm.has_cafe_experience && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#4C4845', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tahun Pengalaman</label>
                    <input type="number" min={0} max={30} value={editForm.cafe_experience_years}
                      onChange={e => setEdit('cafe_experience_years', parseInt(e.target.value) || 0)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', color: '#020000', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4C4845', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detail Pengalaman</label>
                <textarea value={editForm.cafe_experience_detail} onChange={e => setEdit('cafe_experience_detail', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', color: '#020000', boxSizing: 'border-box', minHeight: '70px', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4C4845', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sertifikasi Barista</label>
                <select value={editForm.has_barista_cert ? 'ya' : 'tidak'} onChange={e => setEdit('has_barista_cert', e.target.value === 'ya')}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', color: '#020000', boxSizing: 'border-box', outline: 'none' }}>
                  <option value="tidak">Tidak ada</option>
                  <option value="ya">Ada</option>
                </select>
              </div>
              {editForm.has_barista_cert && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4C4845', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detail Sertifikasi</label>
                  <input type="text" value={editForm.cert_detail} onChange={e => setEdit('cert_detail', e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', color: '#020000', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              )}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4C4845', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Motivasi / Catatan</label>
                <textarea value={editForm.hr_notes} onChange={e => setEdit('hr_notes', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', color: '#020000', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button onClick={() => setShowEditModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #E8E4E0', background: '#fff', color: '#4C4845', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                  Batal
                </button>
                <button onClick={handleSaveEdit} disabled={savingEdit}
                  style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: savingEdit ? '#8A8A8D' : '#037894', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: savingEdit ? 'not-allowed' : 'pointer' }}>
                  {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowMessageModal(false); setMessageOptions(null); setSelectedMessage(null) } }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px 20px 0 0', padding: '28px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#020000', margin: 0 }}>
                {messageChannel === 'whatsapp' ? '📱 Kirim WhatsApp' : '📧 Kirim Email'}
              </h3>
              <button onClick={() => { setShowMessageModal(false); setMessageOptions(null); setSelectedMessage(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#8A8A8D' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['whatsapp', 'email'] as const).map(ch => (
                <button key={ch} onClick={() => { setMessageChannel(ch); setMessageOptions(null); setSelectedMessage(null) }}
                  style={{ flex: 1, padding: '8px', borderRadius: '10px', border: '1.5px solid', fontSize: '13px', fontWeight: 600, cursor: 'pointer', backgroundColor: messageChannel === ch ? '#037894' : 'transparent', borderColor: messageChannel === ch ? '#037894' : '#E8E4E0', color: messageChannel === ch ? '#fff' : '#8A8A8D' }}>
                  {ch === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </button>
              ))}
            </div>
            {!messageOptions ? (
              <button onClick={handleGenerateMessages} disabled={generatingMessages}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', backgroundColor: generatingMessages ? '#8A8A8D' : '#020000', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: generatingMessages ? 'not-allowed' : 'pointer' }}>
                {generatingMessages ? '⚙ Quest AI sedang membuat template...' : '✦ Generate 3 Template dengan Quest AI'}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '12px', color: '#8A8A8D', margin: '0 0 4px' }}>Pilih template yang sesuai:</p>
                {[{ key: 'option1', label: 'Formal & Profesional' }, { key: 'option2', label: 'Hangat & Friendly' }, { key: 'option3', label: 'Singkat & To-the-point' }].map(opt => (
                  <div key={opt.key} onClick={() => setSelectedMessage(messageOptions[opt.key as keyof typeof messageOptions])}
                    style={{ padding: '14px', borderRadius: '12px', cursor: 'pointer', border: '1.5px solid', borderColor: selectedMessage === messageOptions[opt.key as keyof typeof messageOptions] ? '#037894' : '#E8E4E0', backgroundColor: selectedMessage === messageOptions[opt.key as keyof typeof messageOptions] ? 'rgba(3,120,148,0.04)' : '#fff' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#037894', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '1px' }}>{opt.label}</p>
                    <p style={{ fontSize: '13px', color: '#4C4845', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{messageOptions[opt.key as keyof typeof messageOptions]}</p>
                  </div>
                ))}
                {selectedMessage && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button onClick={() => navigator.clipboard.writeText(selectedMessage)}
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: '#E6F0F4', color: '#037894', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                      Copy Teks
                    </button>
                    {messageChannel === 'whatsapp' && applicant.phone && (
                      <a href={`https://wa.me/${applicant.phone.replace(/^0/, '62').replace(/\D/g, '')}?text=${encodeURIComponent(selectedMessage)}`}
                        target="_blank" rel="noreferrer"
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: '#037894', color: '#fff', fontWeight: 700, fontSize: '13px', border: 'none', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        Buka WhatsApp →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
