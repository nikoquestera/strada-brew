'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PIPELINE_STAGES, PipelineStage } from '@/lib/types'
import {
  ArrowLeft, Phone, Mail, AtSign, MapPin, Calendar,
  Briefcase, Star, MessageSquare, Clock, Edit2,
  Brain, RefreshCw, FileText, CheckCircle2, User, X, ChevronDown
} from 'lucide-react'

/* ─── Types ──────────────────────────────────────────────────────── */
interface QuestScore {
  id: string; overall_score?: number; experience_score?: number
  certification_score?: number; completeness_score?: number
  motivation_score?: number; profile_score?: number
  summary?: string; strengths?: string[]; concerns?: string[]
  recommendation?: string; quest_notes?: string
  status: string; processed_at?: string; created_at?: string
}
interface UserProfile { id: string; full_name: string; email: string }
interface Activity {
  id: string; activity_type?: string | null; from_stage?: string | null
  to_stage?: string | null; note?: string | null
  actor_id?: string | null; actor_name?: string | null; created_at: string
}
interface DiscSession {
  id: string; access_code: string; status: string
  sent_at?: string; completed_at?: string
  results?: { pattern?: { pattern?: string } } | null
}
interface IntelTest {
  id: string; access_code: string; status: string
  sent_at?: string; started_at?: string; completed_at?: string
  score?: number | null; score_percentage?: number | null; total_points?: number | null
  tests?: { title?: string | null }[] | { title?: string | null } | null
}
interface PersonaliaSession {
  id: string; access_code: string; status: string
  created_at: string; completed_at?: string
}
interface ApplicantData {
  id: string; full_name?: string | null; email?: string | null
  phone?: string | null; birth_date?: string | null; domicile?: string | null
  instagram_url?: string | null; position_applied?: string | null
  outlet_preference?: string | null; source?: string | null
  pipeline_stage?: PipelineStage; quest_score?: number | null
  created_at: string; has_cafe_experience?: boolean | null
  cafe_experience_years?: number | null; cafe_experience_detail?: string | null
  has_barista_cert?: boolean | null; cert_detail?: string | null
  education_level?: string | null; hr_notes?: string | null
  status?: string | null; screening_notes?: string | null; cv_url?: string | null
  applicant_quest_scores?: QuestScore[]
  applicant_activities?: Activity[]
  disc_sessions?: DiscSession[]
  applicant_tests?: IntelTest[]
  personalia_sessions?: PersonaliaSession[]
}

type AppTab = 'profil' | 'evaluasi' | 'timeline' | 'catatan' | 'cv'

/* ─── Helpers ─────────────────────────────────────────────────────── */
function formatTs(ts?: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function scoreColor(s: number) { return s >= 75 ? '#005353' : s >= 50 ? '#DE9733' : '#FF4F31' }
function scoreBg(s: number) { return s >= 75 ? '#E6F4F1' : s >= 50 ? '#FEF8E6' : '#FFF0EE' }

const inp = { padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', width: '100%', fontSize: '13px', boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit', backgroundColor: '#FAFAF9' }
const lbl = { fontSize: '11px', fontWeight: 700, color: '#4C4845', textTransform: 'uppercase' as const, letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }

/* ─── Component ───────────────────────────────────────────────────── */
export default function ApplicantDetailClient({ applicant }: { applicant: ApplicantData }) {
  const router = useRouter()
  const supabase = createClient()

  /* stage */
  const [currentStage, setCurrentStage] = useState<PipelineStage>(applicant.pipeline_stage || 'baru_masuk')
  const [changingStage, setChangingStage] = useState(false)

  /* tabs */
  const [tab, setTab] = useState<AppTab>('profil')

  /* current user (for actor_name on notes) */
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data } = await supabase.from('brew_users').select('id, full_name, email').ilike('email', user.email).maybeSingle()
        if (data) setCurrentUser(data)
      }
    }
    fetchUser()
  }, []) // eslint-disable-line

  /* applicant data (mutable) */
  const [editData, setEditData] = useState<ApplicantData>(applicant)

  /* activities */
  const [activities, setActivities] = useState<Activity[]>(
    (applicant.applicant_activities || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  )

  /* scores */
  const [scores, setScores] = useState<QuestScore[]>(
    (applicant.applicant_quest_scores || []).sort((a, b) =>
      new Date(b.processed_at || b.created_at || 0).getTime() - new Date(a.processed_at || a.created_at || 0).getTime()
    )
  )
  const [scoring, setScoring] = useState(false)
  const [expandedScoreHistory, setExpandedScoreHistory] = useState(false)
  const scoresRef = useRef(scores)
  useEffect(() => { scoresRef.current = scores }, [scores])

  /* tests */
  const [discSessions, setDiscSessions] = useState<DiscSession[]>(applicant.disc_sessions || [])
  const [sendingDisc, setSendingDisc] = useState(false)
  const [intelTests, setIntelTests] = useState<IntelTest[]>(applicant.applicant_tests || [])
  const [sendingIntel, setSendingIntel] = useState(false)
  const [personaliaSessions, setPersonaliaSessions] = useState<PersonaliaSession[]>(applicant.personalia_sessions || [])
  const [creatingPersonalia, setCreatingPersonalia] = useState(false)

  /* CV */
  const [cvUrl, setCvUrl] = useState<string>(applicant.cv_url || '')
  const [uploadingCv, setUploadingCv] = useState(false)

  /* catatan */
  const [noteInput, setNoteInput] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const screeningNotes = activities.filter(a => a.activity_type === 'screening_note')

  /* edit profil */
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({
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
    source: applicant.source || '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  /* ── Score polling ────────────────────────────────────────────── */
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const latestScore = scores[0]
  const latestCompleted = scores.find(s => s.status === 'completed')
  const isProcessing = latestScore?.status === 'processing' || scoring

  useEffect(() => {
    let iv: NodeJS.Timeout
    if (isProcessing) {
      iv = setInterval(() => setAnalysisProgress(p => p >= 95 ? 95 : p + (p < 30 ? 5 : p < 70 ? 2 : 1)), 500)
    } else { setAnalysisProgress(0) }
    return () => clearInterval(iv)
  }, [isProcessing])

  useEffect(() => {
    const iv = setInterval(async () => {
      if (!scoresRef.current.some(s => s.status === 'processing')) return
      const { data } = await supabase.from('applicant_quest_scores').select('*').eq('applicant_id', applicant.id).order('processed_at', { ascending: false, nullsFirst: false })
      if (data) setScores(data)
    }, 3000)
    return () => clearInterval(iv)
  }, []) // eslint-disable-line

  /* ── Handlers ─────────────────────────────────────────────────── */
  async function handleStageChange(newStage: PipelineStage) {
    if (newStage === currentStage || changingStage) return
    setChangingStage(true)
    const { error } = await supabase.from('applicants').update({ pipeline_stage: newStage }).eq('id', applicant.id)
    if (!error) {
      // log activity optimistically
      const nowIso = new Date().toISOString()
      const act: Activity = {
        id: `tmp-${Date.now()}`,
        activity_type: 'stage_changed',
        from_stage: currentStage,
        to_stage: newStage,
        actor_id: currentUser?.id ?? null,
        actor_name: currentUser?.full_name ?? null,
        created_at: nowIso,
        note: null,
      }
      setActivities(prev => [act, ...prev])
      setCurrentStage(newStage)
      // fire insert in background (best-effort)
      supabase.from('applicant_activities').insert([{
        applicant_id: applicant.id, activity_type: 'stage_changed',
        from_stage: currentStage, to_stage: newStage,
        actor_id: currentUser?.id ?? null, actor_name: currentUser?.full_name ?? null,
      }]).then(() => {})
    }
    setChangingStage(false)
  }

  async function handleRunScore() {
    setScoring(true)
    const tempId = `tmp-${Date.now()}`
    setScores(prev => [{ id: tempId, status: 'processing', created_at: new Date().toISOString() }, ...prev])
    try {
      const res = await fetch('/api/quest/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicant_id: applicant.id }) })
      if (!res.ok) throw new Error(await res.text())
    } catch (err) {
      console.error('Score failed:', err)
      setScores(prev => prev.map(s => s.id === tempId ? { ...s, status: 'failed' } : s))
    } finally {
      setScoring(false)
    }
  }

  async function handleSendDisc() {
    setSendingDisc(true)
    try {
      const res = await fetch('/api/disc/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicant_id: applicant.id }) })
      const data = await res.json()
      if (res.ok && data.session) setDiscSessions(prev => [data.session, ...prev])
    } finally { setSendingDisc(false) }
  }

  async function handleSendIntel() {
    setSendingIntel(true)
    try {
      const res = await fetch('/api/cfit/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicant_id: applicant.id }) })
      const data = await res.json()
      if (res.ok && data.session) setIntelTests(prev => [data.session, ...prev])
    } finally { setSendingIntel(false) }
  }

  async function handleCreatePersonalia() {
    setCreatingPersonalia(true)
    try {
      const res = await fetch('/api/rekrutmen/personalia/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicant_id: applicant.id }) })
      const data = await res.json()
      if (res.ok && data.session) setPersonaliaSessions(prev => [data.session, ...prev])
    } catch (e) { console.error(e) }
    finally { setCreatingPersonalia(false) }
  }

  async function handleCvUpload(file: File) {
    setUploadingCv(true)
    try {
      const ext = file.name.split('.').pop() || 'pdf'
      const path = `cv_${applicant.id}_${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('cvs').upload(path, file, { contentType: file.type, upsert: true })
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('cvs').getPublicUrl(data.path)
        await supabase.from('applicants').update({ cv_url: urlData.publicUrl }).eq('id', applicant.id)
        setCvUrl(urlData.publicUrl)
      }
    } finally { setUploadingCv(false) }
  }

  /* ── Catatan save — no .select().single() to avoid silent failure ── */
  async function handleSaveNote() {
    const text = noteInput.trim()
    if (!text) return
    setSavingNote(true)
    const nowIso = new Date().toISOString()
    const { error } = await supabase.from('applicant_activities').insert([{
      applicant_id: applicant.id,
      activity_type: 'screening_note',
      note: text,
      ...(currentUser?.id ? { actor_id: currentUser.id } : {}),
      actor_name: currentUser?.full_name ?? 'HR',
    }])
    if (!error) {
      const newAct: Activity = {
        id: `tmp-${Date.now()}`,
        activity_type: 'screening_note',
        note: text,
        actor_id: currentUser?.id ?? null,
        actor_name: currentUser?.full_name ?? 'HR',
        from_stage: null, to_stage: null,
        created_at: nowIso,
      }
      setActivities(prev => [newAct, ...prev])
      await supabase.from('applicants').update({ screening_notes: text }).eq('id', applicant.id)
      setNoteInput('')
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2500)
    } else {
      console.error('[handleSaveNote]', error)
      alert('Gagal menyimpan: ' + error.message)
    }
    setSavingNote(false)
  }

  async function handleSaveEdit() {
    setSavingEdit(true)
    const { data, error } = await supabase.from('applicants').update({
      full_name: editForm.full_name,
      email: editForm.email,
      phone: editForm.phone,
      birth_date: editForm.birth_date || null,
      domicile: editForm.domicile,
      position_applied: editForm.position_applied,
      outlet_preference: editForm.outlet_preference,
      education_level: editForm.education_level,
      has_cafe_experience: editForm.has_cafe_experience,
      cafe_experience_years: editForm.cafe_experience_years,
      cafe_experience_detail: editForm.cafe_experience_detail,
      has_barista_cert: editForm.has_barista_cert,
      cert_detail: editForm.cert_detail,
      instagram_url: editForm.instagram_url,
      hr_notes: editForm.hr_notes,
      source: editForm.source,
    }).eq('id', applicant.id).select().single()
    setSavingEdit(false)
    if (!error && data) {
      setEditData({ ...editData, ...data })
      setShowEdit(false)
    } else if (error) {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  /* ── Derived ──────────────────────────────────────────────────── */
  const stageInfo = PIPELINE_STAGES.find(s => s.key === currentStage)
  const isHired = ['diterima', 'menunggu_onboarding', 'onboarded', 'probation_berjalan', 'probation_hampir_selesai', 'karyawan_tetap'].includes(currentStage)

  const TABS: { key: AppTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'profil', label: 'Profil', icon: <User size={14} /> },
    { key: 'evaluasi', label: 'Evaluasi', icon: <Star size={14} />, count: scores.filter(s => s.status === 'completed').length || undefined },
    { key: 'timeline', label: 'Timeline', icon: <Clock size={14} />, count: activities.length || undefined },
    { key: 'catatan', label: 'Catatan', icon: <MessageSquare size={14} />, count: screeningNotes.length || undefined },
    { key: 'cv', label: 'CV', icon: <FileText size={14} /> },
  ]

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes appl-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .appl-tab { border:none; cursor:pointer; transition:all 0.15s; white-space:nowrap; background:transparent; }
        .appl-tab:hover { color:#037894 !important; background:#F9FBFB !important; }
        .appl-btn:hover:not(:disabled) { opacity:0.85 !important; }
        .appl-stage-opt:hover { background:#f0f0f0 !important; }
        @media(max-width:768px){ .appl-grid{grid-template-columns:1fr !important;} .appl-3col{grid-template-columns:1fr 1fr !important;} }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>

        {/* ── Header ───────────────────────────────────────────── */}
        <div style={{ backgroundColor: '#fff', borderBottom: '1.5px solid #E8E4E0', position: 'sticky', top: 0, zIndex: 30 }}>

          {/* Top row */}
          <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button onClick={() => router.back()}
              style={{ color: '#8A8A8D', background: '#F7F5F2', border: '1px solid #E8E4E0', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px', fontWeight: 700, flexShrink: 0 }}>
              <ArrowLeft size={14} /> Rekrutmen
            </button>

            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', backgroundColor: '#E6F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid #CCE8F0' }}>
                <span style={{ color: '#037894', fontWeight: 900, fontSize: '18px' }}>{(editData.full_name || '?')[0].toUpperCase()}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#020000', margin: 0, lineHeight: 1.2 }}>{editData.full_name}</h1>
                  <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: `${stageInfo?.color || '#8A8A8D'}18`, color: stageInfo?.color || '#8A8A8D', flexShrink: 0 }}>
                    {stageInfo?.label || 'Baru Masuk'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#037894', fontWeight: 700, margin: '3px 0 0' }}>
                  {editData.position_applied}{editData.outlet_preference ? ` · ${editData.outlet_preference}` : ''}
                  {editData.source ? <span style={{ color: '#8A8A8D', fontWeight: 600 }}> · via {editData.source}</span> : null}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
              <button onClick={() => setShowEdit(true)}
                style={{ padding: '9px 18px', borderRadius: '10px', border: '1.5px solid #E8E4E0', backgroundColor: '#fff', color: '#020000', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Edit2 size={14} /> Edit Data
              </button>

              {/* Stage dropdown — color-coded */}
              <div style={{ position: 'relative' }}>
                <select value={currentStage} disabled={changingStage}
                  onChange={e => handleStageChange(e.target.value as PipelineStage)}
                  style={{ padding: '9px 36px 9px 14px', borderRadius: '10px', border: 'none', backgroundColor: stageInfo?.color || '#037894', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: changingStage ? 'wait' : 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: '160px' }}>
                  {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.8)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', paddingLeft: '24px', overflowX: 'auto', borderTop: '1px solid #F0EEEC', gap: 0 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className="appl-tab"
                style={{ padding: '13px 20px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px', color: tab === t.key ? '#037894' : '#8A8A8D', borderBottom: tab === t.key ? '3px solid #037894' : '3px solid transparent', marginBottom: '-1.5px' }}>
                {t.icon} {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 7px', borderRadius: '8px', backgroundColor: tab === t.key ? '#037894' : '#F0F4F5', color: tab === t.key ? '#fff' : '#8A8A8D' }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ───────────────────────────────────────── */}
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px' }}>

          {/* ── PROFIL TAB ───────────────────────────────────────── */}
          {tab === 'profil' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Hired → Onboarding Banner */}
              {isHired && (
                <div style={{ backgroundColor: '#E6F4F1', borderRadius: '16px', padding: '20px 24px', border: '2px solid #005353', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={20} color="#005353" />
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 800, color: '#005353', margin: 0 }}>Kandidat Diterima</p>
                      <p style={{ fontSize: '12px', color: '#005353', margin: '2px 0 0', opacity: 0.75 }}>Kirim formulir Data Personalia untuk memulai onboarding karyawan resmi.</p>
                    </div>
                  </div>
                  <button onClick={handleCreatePersonalia} disabled={creatingPersonalia}
                    style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: '#005353', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: creatingPersonalia ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {creatingPersonalia ? <RefreshCw size={14} style={{ animation: 'appl-spin 1s linear infinite' }} /> : <FileText size={14} />}
                    {creatingPersonalia ? 'Membuat...' : 'Kirim Form Personalia'}
                  </button>
                </div>
              )}

              {/* Personalia link display */}
              {personaliaSessions.length > 0 && (
                <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px 20px', border: '1.5px solid #E8E4E0' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px' }}>Link Personalia</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {personaliaSessions.slice(0, 2).map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: s.status === 'completed' ? '#E6F4F1' : '#F7F5F2', border: `1px solid ${s.status === 'completed' ? '#005353' : '#E8E4E0'}` }}>
                        <div>
                          <code style={{ fontSize: '15px', fontWeight: 900, color: s.status === 'completed' ? '#005353' : '#037894', letterSpacing: '2px' }}>{s.access_code}</code>
                          <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '2px 0 0' }}>brew.stradacoffee.com/personalia/{s.access_code}</p>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', textTransform: 'uppercase', backgroundColor: s.status === 'completed' ? '#005353' : '#E8E4E0', color: s.status === 'completed' ? '#fff' : '#8A8A8D' }}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact & Identity */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1.5px solid #F0EEEC' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>Kontak & Identitas</p>
                  <button onClick={() => setShowEdit(true)} style={{ padding: '5px 14px', borderRadius: '8px', border: '1.5px solid #037894', backgroundColor: 'transparent', color: '#037894', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    Edit
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="appl-3col">
                  {[
                    { label: 'No. HP', value: editData.phone, icon: <Phone size={12} /> },
                    { label: 'Email', value: editData.email, icon: <Mail size={12} /> },
                    { label: 'Domisili', value: editData.domicile, icon: <MapPin size={12} /> },
                    { label: 'Instagram', value: editData.instagram_url, icon: <AtSign size={12} /> },
                    { label: 'Tanggal Lahir', value: editData.birth_date ? new Date(editData.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null, icon: <Calendar size={12} /> },
                    { label: 'Pendidikan', value: editData.education_level, icon: <Briefcase size={12} /> },
                    { label: 'Sumber Lamaran', value: editData.source, icon: null },
                    { label: 'Tanggal Daftar', value: formatTs(editData.created_at), icon: null },
                  ].filter(f => f.value).map(({ label, value, icon }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                        {icon && <span style={{ color: '#037894' }}>{icon}</span>}
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{label}</p>
                      </div>
                      <p style={{ fontSize: '13px', color: '#020000', fontWeight: 600, margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience & Certs */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 16px', paddingBottom: '12px', borderBottom: '1.5px solid #F0EEEC' }}>Pengalaman & Sertifikasi</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '14px 18px', borderRadius: '12px', backgroundColor: editData.has_cafe_experience ? '#E6F4F1' : '#F7F5F2', border: `1.5px solid ${editData.has_cafe_experience ? '#005353' : '#E8E4E0'}` }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', margin: '0 0 4px' }}>Pengalaman Kafe</p>
                    <p style={{ fontSize: '16px', fontWeight: 900, color: editData.has_cafe_experience ? '#005353' : '#8A8A8D', margin: 0 }}>
                      {editData.has_cafe_experience ? `${editData.cafe_experience_years || 0} tahun` : 'Belum ada'}
                    </p>
                    {editData.cafe_experience_detail && <p style={{ fontSize: '12px', color: '#4C4845', margin: '6px 0 0', lineHeight: 1.5 }}>{editData.cafe_experience_detail}</p>}
                  </div>
                  <div style={{ padding: '14px 18px', borderRadius: '12px', backgroundColor: editData.has_barista_cert ? '#E6F4F1' : '#F7F5F2', border: `1.5px solid ${editData.has_barista_cert ? '#005353' : '#E8E4E0'}` }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', margin: '0 0 4px' }}>Sertifikasi Barista</p>
                    <p style={{ fontSize: '16px', fontWeight: 900, color: editData.has_barista_cert ? '#005353' : '#8A8A8D', margin: 0 }}>
                      {editData.has_barista_cert ? 'Ada ✓' : 'Tidak ada'}
                    </p>
                    {editData.cert_detail && <p style={{ fontSize: '12px', color: '#4C4845', margin: '6px 0 0', lineHeight: 1.5 }}>{editData.cert_detail}</p>}
                  </div>
                </div>
              </div>

              {/* Motivation */}
              {editData.hr_notes && (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 12px', paddingBottom: '12px', borderBottom: '1.5px solid #F0EEEC' }}>Motivasi Pendaftar</p>
                  <p style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.8, margin: 0, fontStyle: 'italic' }}>&ldquo;{editData.hr_notes}&rdquo;</p>
                </div>
              )}
            </div>
          )}

          {/* ── EVALUASI TAB ─────────────────────────────────────── */}
          {tab === 'evaluasi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Quest AI Score */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid rgba(3,120,148,0.2)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #037894 0%, #8FC6C5 100%)' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ backgroundColor: '#E6F4F8', padding: '8px', borderRadius: '12px' }}>
                      <Star size={18} color="#037894" fill="#037894" />
                    </div>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 800, color: '#020000', margin: 0 }}>Quest AI Evaluation</p>
                      <p style={{ fontSize: '11px', color: '#8A8A8D', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: '2px 0 0' }}>Analisis Profil Otomatis</p>
                    </div>
                  </div>
                  <button onClick={handleRunScore} disabled={isProcessing} className="appl-btn"
                    style={{ padding: '9px 20px', borderRadius: '12px', border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: isProcessing ? '#F7F5F2' : '#037894', color: isProcessing ? '#8A8A8D' : '#fff', boxShadow: isProcessing ? 'none' : '0 4px 12px rgba(3,120,148,0.2)' }}>
                    {isProcessing ? <><RefreshCw size={14} style={{ animation: 'appl-spin 1s linear infinite' }} /> {analysisProgress}%</> : scores.length > 0 ? '↻ Re-run' : '✦ Run Score'}
                  </button>
                </div>

                {isProcessing ? (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <div style={{ height: '8px', width: '100%', backgroundColor: '#F0F4F5', borderRadius: '4px', overflow: 'hidden', maxWidth: '360px', margin: '0 auto' }}>
                      <div style={{ height: '100%', backgroundColor: '#037894', width: `${analysisProgress}%`, transition: 'width 0.3s' }} />
                    </div>
                    <p style={{ fontSize: '13px', color: '#8A8A8D', marginTop: '12px' }}>Analisa mendalam sedang berlangsung...</p>
                  </div>
                ) : !latestCompleted ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', border: '1.5px dashed #D1E5E9', borderRadius: '14px' }}>
                    <Star size={32} color="#D1E5E9" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ color: '#8A8A8D', fontSize: '14px', fontWeight: 600 }}>Belum ada evaluasi AI. Klik Run Score untuk memulai.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '32px', alignItems: 'start' }} className="appl-grid">
                    <div style={{ textAlign: 'center', minWidth: '120px' }}>
                      <div style={{ fontSize: '72px', fontWeight: 900, color: '#037894', lineHeight: 1 }}>{latestCompleted.overall_score}</div>
                      <div style={{ fontSize: '11px', color: '#8FC6C5', fontWeight: 800, letterSpacing: '2px', marginTop: '4px' }}>DARI 100</div>
                      {latestCompleted.recommendation && (
                        <div style={{ marginTop: '12px', padding: '6px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, display: 'inline-block', backgroundColor: scoreColor(latestCompleted.overall_score || 0), color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {latestCompleted.recommendation}
                        </div>
                      )}
                      <p style={{ fontSize: '10px', color: '#8A8A8D', marginTop: '8px', fontWeight: 600 }}>{formatTs(latestCompleted.processed_at)}</p>
                    </div>
                    <div>
                      {[
                        { label: 'Pengalaman', value: latestCompleted.experience_score, max: 25 },
                        { label: 'Sertifikasi', value: latestCompleted.certification_score, max: 20 },
                        { label: 'Motivasi', value: latestCompleted.motivation_score, max: 20 },
                        { label: 'Profil', value: latestCompleted.profile_score, max: 20 },
                        { label: 'Kelengkapan', value: latestCompleted.completeness_score, max: 15 },
                      ].map(item => (
                        <div key={item.label} style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#4C4845', fontWeight: 700 }}>{item.label}</span>
                            <span style={{ fontSize: '12px', color: '#037894', fontWeight: 800 }}>{Math.min(item.value || 0, item.max)}/{item.max}</span>
                          </div>
                          <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#F0F4F5' }}>
                            <div style={{ height: '100%', borderRadius: '3px', backgroundColor: '#037894', width: `${(Math.min(item.value || 0, item.max) / item.max) * 100}%`, transition: 'width 0.5s' }} />
                          </div>
                        </div>
                      ))}
                      {latestCompleted.summary && (
                        <p style={{ fontSize: '13px', color: '#4C4845', lineHeight: 1.7, marginTop: '12px', fontStyle: 'italic', padding: '12px', borderRadius: '10px', backgroundColor: '#F9FBFB', border: '1px solid #F0EEEC' }}>
                          &ldquo;{latestCompleted.summary}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {scores.filter(s => s.status === 'completed').length > 1 && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #F0EEEC', paddingTop: '12px' }}>
                    <button onClick={() => setExpandedScoreHistory(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#037894', fontWeight: 700, padding: 0 }}>
                      {expandedScoreHistory ? '▲ Tutup' : `▼ ${scores.filter(s => s.status === 'completed').length} riwayat scoring`}
                    </button>
                    {expandedScoreHistory && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                        {scores.filter(s => s.status === 'completed').map((s, i) => (
                          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', backgroundColor: '#F7F5F2', borderRadius: '10px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '16px', fontWeight: 900, color: scoreColor(s.overall_score || 0) }}>{s.overall_score}</span>
                              {i === 0 && <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '5px', backgroundColor: '#037894', color: '#fff' }}>TERBARU</span>}
                              {s.recommendation && <span style={{ fontSize: '11px', color: '#8A8A8D' }}>{s.recommendation}</span>}
                            </div>
                            <span style={{ fontSize: '11px', color: '#8A8A8D' }}>{formatTs(s.processed_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* DISC Test */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Brain size={16} color="#037894" />
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: 0 }}>Tes Kepribadian (DISC)</p>
                  </div>
                  <button onClick={handleSendDisc} disabled={sendingDisc} className="appl-btn"
                    style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', backgroundColor: sendingDisc ? '#E8E4E0' : '#020000', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: sendingDisc ? 'not-allowed' : 'pointer' }}>
                    {sendingDisc ? 'Mengirim...' : '+ Kirim Tes DISC'}
                  </button>
                </div>
                {discSessions.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#8A8A8D', margin: 0, padding: '16px 0' }}>Belum ada tes DISC yang dikirim.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {discSessions.map(s => (
                      <div key={s.id} style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#F7F5F2', border: '1px solid #E8E4E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <code style={{ fontSize: '14px', fontWeight: 800, color: '#037894', letterSpacing: '2px' }}>{s.access_code}</code>
                          <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '2px 0 0' }}>brew.stradacoffee.com/disc/{s.access_code}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {s.results?.pattern?.pattern && (
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#005353', padding: '4px 12px', borderRadius: '8px', backgroundColor: '#E6F4F1' }}>
                              Pattern: {s.results.pattern.pattern}
                            </span>
                          )}
                          <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', textTransform: 'uppercase', backgroundColor: s.status === 'completed' ? '#E6F4F1' : '#F0F4F5', color: s.status === 'completed' ? '#005353' : '#8A8A8D' }}>{s.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CFIT Test */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Brain size={16} color="#037894" />
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: 0 }}>Tes Intelegensi (CFIT)</p>
                  </div>
                  <button onClick={handleSendIntel} disabled={sendingIntel} className="appl-btn"
                    style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', backgroundColor: sendingIntel ? '#E8E4E0' : '#037894', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: sendingIntel ? 'not-allowed' : 'pointer' }}>
                    {sendingIntel ? 'Mengirim...' : '+ Kirim Tes CFIT'}
                  </button>
                </div>
                {intelTests.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#8A8A8D', margin: 0, padding: '16px 0' }}>Belum ada tes CFIT yang dikirim.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {intelTests.map(s => {
                      const title = Array.isArray(s.tests) ? s.tests[0]?.title : (s.tests as any)?.title
                      return (
                        <div key={s.id} style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#F7F5F2', border: '1px solid #E8E4E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <code style={{ fontSize: '14px', fontWeight: 800, color: '#037894', letterSpacing: '2px' }}>{s.access_code}</code>
                            {title && <p style={{ fontSize: '11px', color: '#4C4845', margin: '2px 0 0' }}>{title}</p>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {s.status === 'completed' && s.score_percentage != null && (
                              <span style={{ fontSize: '16px', fontWeight: 900, color: scoreColor(s.score_percentage), padding: '4px 14px', borderRadius: '10px', backgroundColor: scoreBg(s.score_percentage) }}>
                                {s.score_percentage}%
                              </span>
                            )}
                            <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', textTransform: 'uppercase', backgroundColor: s.status === 'completed' ? '#E6F4F1' : '#F0F4F5', color: s.status === 'completed' ? '#005353' : '#8A8A8D' }}>{s.status}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Personalia */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} color="#037894" />
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: 0 }}>Form Data Personalia</p>
                  </div>
                  <button onClick={handleCreatePersonalia} disabled={creatingPersonalia} className="appl-btn"
                    style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', backgroundColor: creatingPersonalia ? '#E8E4E0' : '#82A13B', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: creatingPersonalia ? 'not-allowed' : 'pointer' }}>
                    {creatingPersonalia ? 'Membuat...' : '+ Kirim Personalia'}
                  </button>
                </div>
                {personaliaSessions.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#8A8A8D', margin: 0, padding: '16px 0' }}>Belum ada form personalia yang dikirim.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {personaliaSessions.map(s => (
                      <div key={s.id} style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: s.status === 'completed' ? '#E6F4F1' : '#F7F5F2', border: `1px solid ${s.status === 'completed' ? '#005353' : '#E8E4E0'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <code style={{ fontSize: '14px', fontWeight: 800, color: s.status === 'completed' ? '#005353' : '#037894', letterSpacing: '2px' }}>{s.access_code}</code>
                          <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '2px 0 0' }}>
                            Dibuat: {formatTs(s.created_at)}{s.completed_at ? ` · Selesai: ${formatTs(s.completed_at)}` : ''}
                          </p>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', textTransform: 'uppercase', backgroundColor: s.status === 'completed' ? '#005353' : '#E8E4E0', color: s.status === 'completed' ? '#fff' : '#8A8A8D' }}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TIMELINE TAB ─────────────────────────────────────── */}
          {tab === 'timeline' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 20px' }}>Semua Aktivitas — {activities.length} entri</p>
              {activities.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#8A8A8D', textAlign: 'center', padding: '32px 0' }}>Belum ada aktivitas.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {activities.map((act, idx) => {
                    const isStageChange = act.activity_type === 'stage_changed'
                    const isNote = act.activity_type === 'screening_note'
                    const color = isStageChange ? '#005353' : isNote ? '#DE9733' : '#037894'
                    const toStageInfo = isStageChange ? PIPELINE_STAGES.find(s => s.key === act.to_stage) : null
                    return (
                      <div key={act.id} style={{ display: 'flex', gap: '14px', paddingBottom: idx === activities.length - 1 ? 0 : '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid ${color}30` }}>
                            <span style={{ fontSize: '13px' }}>{isStageChange ? '🔄' : isNote ? '📝' : '•'}</span>
                          </div>
                          {idx < activities.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: '#F0EEEC', marginTop: '4px' }} />}
                        </div>
                        <div style={{ flex: 1, paddingTop: '4px', paddingBottom: idx === activities.length - 1 ? 0 : '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            {isStageChange && toStageInfo && (
                              <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 10px', borderRadius: '8px', backgroundColor: `${toStageInfo.color}18`, color: toStageInfo.color }}>
                                → {toStageInfo.label}
                              </span>
                            )}
                            {isNote && <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 10px', borderRadius: '8px', backgroundColor: '#FEF8E6', color: '#DE9733' }}>Catatan Screening</span>}
                            {act.actor_name && <span style={{ fontSize: '11px', color: '#8A8A8D', fontWeight: 600 }}>oleh {act.actor_name}</span>}
                          </div>
                          {act.note && <p style={{ fontSize: '13px', color: '#4C4845', margin: '0 0 4px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{act.note}</p>}
                          <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0, fontWeight: 600 }}>{formatTs(act.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CATATAN TAB ───────────────────────────────────────── */}
          {tab === 'catatan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Input */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MessageSquare size={14} color="#037894" />
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: 0 }}>Catatan Screening Internal</p>
                </div>
                <p style={{ fontSize: '12px', color: '#8A8A8D', margin: '0 0 14px', lineHeight: 1.5 }}>
                  Hanya terlihat oleh tim HRD. Digunakan sebagai panduan untuk Quest AI dan proses seleksi.
                </p>
                <textarea
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder="Tulis catatan internal untuk kandidat ini..."
                  style={{ width: '100%', minHeight: '90px', padding: '12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', color: '#037894', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button onClick={handleSaveNote} disabled={savingNote || !noteInput.trim()} className="appl-btn"
                    style={{ padding: '10px 28px', borderRadius: '10px', border: 'none', cursor: (savingNote || !noteInput.trim()) ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, backgroundColor: noteSaved ? '#005353' : '#037894', color: '#fff', opacity: !noteInput.trim() ? 0.5 : 1, transition: 'all 0.2s' }}>
                    {noteSaved ? '✓ Tersimpan' : savingNote ? 'Menyimpan...' : 'Simpan Catatan'}
                  </button>
                </div>
              </div>

              {/* History */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                {screeningNotes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#8A8A8D' }}>
                    <MessageSquare size={32} color="#D4CFC9" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>Belum ada catatan</p>
                    <p style={{ fontSize: '12px', margin: 0 }}>Catatan yang disimpan akan muncul di sini.</p>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 16px' }}>
                      Riwayat Catatan — {screeningNotes.length} entri
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {screeningNotes.map((act, idx) => (
                        <div key={act.id || idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#FEF8E6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', fontWeight: 900, color: '#DE9733', border: '1.5px solid #FAEABB' }}>
                            {(act.actor_name || 'H').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, backgroundColor: '#F9FBFB', borderRadius: '12px', padding: '12px 16px', border: '1px solid #F0EEEC' }}>
                            <p style={{ fontSize: '13px', color: '#020000', margin: '0 0 6px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{act.note}</p>
                            <span style={{ fontSize: '11px', color: '#8A8A8D', fontWeight: 600 }}>
                              {act.actor_name || 'HR'} · {formatTs(act.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── CV TAB ───────────────────────────────────────────── */}
          {tab === 'cv' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} color="#037894" />
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: 0 }}>CV / Resume Pelamar</p>
                </div>
                <label style={{ padding: '8px 20px', borderRadius: '10px', border: '1.5px solid #E8E4E0', backgroundColor: '#fff', color: '#4C4845', fontSize: '12px', fontWeight: 700, cursor: uploadingCv ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: uploadingCv ? 0.6 : 1 }}>
                  <input type="file" accept=".pdf,.doc,.docx,image/*" style={{ display: 'none' }} disabled={uploadingCv}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f) }} />
                  {uploadingCv ? '⏳ Uploading...' : cvUrl ? '↑ Ganti CV' : '↑ Upload CV'}
                </label>
              </div>
              {cvUrl ? (
                cvUrl.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={cvUrl} style={{ width: '100%', height: '700px', borderRadius: '12px', border: '1.5px solid #E8E4E0' }} title="CV Pelamar" />
                ) : (
                  <div style={{ padding: '40px', borderRadius: '12px', backgroundColor: '#F7F5F2', textAlign: 'center' }}>
                    <FileText size={40} color="#8A8A8D" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                    <p style={{ fontSize: '13px', color: '#4C4845', margin: '0 0 16px' }}>CV tersedia dalam format non-PDF.</p>
                    <a href={cvUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                      Buka File CV
                    </a>
                  </div>
                )
              ) : (
                <div style={{ padding: '60px', borderRadius: '12px', border: '2px dashed #E8E4E0', textAlign: 'center', backgroundColor: '#F9FBFB' }}>
                  <FileText size={40} color="#D4CFC9" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ fontSize: '14px', color: '#8A8A8D', margin: '0 0 6px', fontWeight: 600 }}>Belum ada CV</p>
                  <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>Pelamar belum mengupload CV. HR dapat mengupload menggunakan tombol di atas.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Edit Modal ────────────────────────────────────────────── */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={e => { if (e.target === e.currentTarget) setShowEdit(false) }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#020000' }}>Edit Data Pelamar</h3>
              <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8A8D' }}><X size={22} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div><label style={lbl}>Nama Lengkap</label><input style={inp} value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></div>
              <div><label style={lbl}>No. HP</label><input style={inp} value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label style={lbl}>Email</label><input type="email" style={inp} value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label style={lbl}>Tanggal Lahir</label><input type="date" style={inp} value={editForm.birth_date} onChange={e => setEditForm(f => ({ ...f, birth_date: e.target.value }))} /></div>
              <div><label style={lbl}>Domisili</label><input style={inp} value={editForm.domicile} onChange={e => setEditForm(f => ({ ...f, domicile: e.target.value }))} /></div>
              <div><label style={lbl}>Instagram</label><input style={inp} value={editForm.instagram_url} onChange={e => setEditForm(f => ({ ...f, instagram_url: e.target.value }))} /></div>
              <div><label style={lbl}>Posisi Dilamar</label><input style={inp} value={editForm.position_applied} onChange={e => setEditForm(f => ({ ...f, position_applied: e.target.value }))} /></div>
              <div><label style={lbl}>Preferensi Outlet</label><input style={inp} value={editForm.outlet_preference} onChange={e => setEditForm(f => ({ ...f, outlet_preference: e.target.value }))} /></div>
              <div><label style={lbl}>Pendidikan</label>
                <select style={inp} value={editForm.education_level} onChange={e => setEditForm(f => ({ ...f, education_level: e.target.value }))}>
                  <option value="">Pilih...</option>
                  {['SMA/SMK', 'D3', 'S1', 'S2+'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Sumber Lamaran</label>
                <select style={inp} value={editForm.source} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}>
                  <option value="">Pilih...</option>
                  {['Instagram', 'LinkedIn', 'Jobstreet', 'Referral', 'Walk-in', 'Website', 'Lainnya'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <p style={{ ...lbl, marginBottom: '10px' }}>Pengalaman Kafe</p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={editForm.has_cafe_experience} onChange={e => setEditForm(f => ({ ...f, has_cafe_experience: e.target.checked }))} />
                    Ada pengalaman kafe
                  </label>
                  {editForm.has_cafe_experience && (
                    <input type="number" style={{ ...inp, width: '80px' }} value={editForm.cafe_experience_years} placeholder="Tahun"
                      onChange={e => setEditForm(f => ({ ...f, cafe_experience_years: Number(e.target.value) }))} />
                  )}
                </div>
                {editForm.has_cafe_experience && (
                  <textarea style={{ ...inp, marginTop: '8px', minHeight: '60px', resize: 'vertical' }} value={editForm.cafe_experience_detail} placeholder="Detail pengalaman..."
                    onChange={e => setEditForm(f => ({ ...f, cafe_experience_detail: e.target.value }))} />
                )}
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <p style={{ ...lbl, marginBottom: '10px' }}>Sertifikasi Barista</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={editForm.has_barista_cert} onChange={e => setEditForm(f => ({ ...f, has_barista_cert: e.target.checked }))} />
                  Memiliki sertifikasi barista
                </label>
                {editForm.has_barista_cert && (
                  <input style={{ ...inp, marginTop: '8px' }} value={editForm.cert_detail} placeholder="Detail sertifikasi..."
                    onChange={e => setEditForm(f => ({ ...f, cert_detail: e.target.value }))} />
                )}
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Motivasi / Catatan Pelamar</label>
                <textarea style={{ ...inp, minHeight: '80px', resize: 'vertical' }} value={editForm.hr_notes} placeholder="Motivasi atau catatan dari pelamar..."
                  onChange={e => setEditForm(f => ({ ...f, hr_notes: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowEdit(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #E8E4E0', backgroundColor: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                Batal
              </button>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="appl-btn"
                style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#037894', color: '#fff', fontWeight: 700, cursor: savingEdit ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
