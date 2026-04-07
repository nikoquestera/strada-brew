'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PIPELINE_STAGES, PipelineStage } from '@/lib/types'
import { ArrowLeft, Phone, Mail, AtSign, MapPin, Calendar, Briefcase, Star, MessageSquare, Send, Clock, Edit2 } from 'lucide-react'

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

interface Props {
  applicant: Record<string, any>
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
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editData, setEditData] = useState(applicant)
  const setEdit = (k: string, v: any) => setEditForm(f => ({ ...f, [k]: v }))

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
        .appl-back:hover { color: rgba(228,222,216,0.9) !important; }
        .appl-run-score:hover:not(:disabled) { opacity: 0.85 !important; }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>
        {/* Top bar */}
        <div style={{ backgroundColor: '#020000', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button onClick={() => router.back()} className="appl-back"
            style={{ color: 'rgba(228,222,216,0.6)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: 0, transition: 'color 0.15s' }}>
            <ArrowLeft size={16} /> Kembali
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '16px', margin: 0 }}>{editData.full_name}</p>
            <p style={{ color: '#8FC6C5', fontSize: '12px', margin: 0 }}>{editData.position_applied}{editData.outlet_preference ? ` · ${editData.outlet_preference}` : ''}</p>
          </div>
          <button onClick={() => setShowEditModal(true)} className="appl-back"
            style={{ color: 'rgba(228,222,216,0.6)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', transition: 'all 0.15s' }}>
            <Edit2 size={13} /> Edit Data
          </button>
          <select value={currentStage} onChange={e => handleStageChange(e.target.value as PipelineStage)}
            disabled={changingStage} className="stage-select"
            style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', backgroundColor: stageInfo?.color || '#037894', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', outline: 'none' }}>
            {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', maxWidth: '1200px', margin: '0 auto' }} className="detail-grid">

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
            {applicant.applicant_activities?.length > 0 && (
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 16px' }}>Timeline Aktivitas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {applicant.applicant_activities.slice(0, 10).map((act: Record<string, any>) => (
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

            {/* Quest AI Score card */}
            <div style={{ backgroundColor: '#020000', borderRadius: '16px', padding: '24px', border: '1.5px solid rgba(3,120,148,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={14} color="#037894" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#8FC6C5', letterSpacing: '2px', textTransform: 'uppercase' }}>Quest AI</span>
                </div>
                <button onClick={handleRunScore} disabled={isProcessing} className="appl-run-score"
                  style={{ padding: '5px 14px', borderRadius: '10px', border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: isProcessing ? 'rgba(3,120,148,0.15)' : '#037894', color: isProcessing ? '#037894' : '#fff', transition: 'opacity 0.15s' }}>
                  {isProcessing
                    ? <><span style={{ display: 'inline-block', animation: 'quest-spin 1s linear infinite' }}>⚙</span> Scoring...</>
                    : scores.length > 0 ? '↻ Re-run Score' : '✦ Run Score'}
                </button>
              </div>

              {/* Latest score display */}
              {!latestScore && (
                <p style={{ color: 'rgba(228,222,216,0.4)', fontSize: '13px', margin: 0 }}>Scoring belum dimulai.</p>
              )}
              {latestScore?.status === 'pending' && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ color: '#DE9733', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>⏳ Dalam Antrian</p>
                  <p style={{ color: 'rgba(228,222,216,0.4)', fontSize: '12px', margin: 0 }}>Klik Re-run Score untuk memulai</p>
                </div>
              )}
              {latestScore?.status === 'processing' && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ color: '#037894', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>
                    <span style={{ display: 'inline-block', animation: 'quest-spin 1s linear infinite' }}>⚙</span> Sedang Dianalisa
                  </p>
                  <p style={{ color: 'rgba(228,222,216,0.4)', fontSize: '12px', margin: 0 }}>Quest AI sedang membaca profil...</p>
                </div>
              )}
              {latestScore?.status === 'failed' && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ color: '#FF4F31', fontSize: '13px', fontWeight: 600, margin: '0 0 4px' }}>⚠ Scoring gagal</p>
                  <p style={{ color: 'rgba(228,222,216,0.4)', fontSize: '12px', margin: 0 }}>Klik Re-run Score untuk mencoba lagi</p>
                </div>
              )}
              {latestScore?.status === 'completed' && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '52px', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{latestScore.overall_score}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(228,222,216,0.4)', marginTop: '4px' }}>dari 100</div>
                    {latestScore.recommendation && (
                      <div style={{ marginTop: '10px', display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                        backgroundColor: latestScore.recommendation === 'Highly Recommended' ? '#005353' : latestScore.recommendation === 'Recommended' ? '#037894' : latestScore.recommendation === 'Consider' ? '#DE9733' : '#FF4F31',
                        color: '#fff' }}>
                        {latestScore.recommendation}
                      </div>
                    )}
                    {latestScore.processed_at && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '8px' }}>
                        <Clock size={10} color="rgba(228,222,216,0.3)" />
                        <span style={{ fontSize: '10px', color: 'rgba(228,222,216,0.3)' }}>{formatTs(latestScore.processed_at)}</span>
                      </div>
                    )}
                  </div>

                  {/* Score breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {[
                      { label: 'Pengalaman', value: latestScore.experience_score, max: 25 },
                      { label: 'Sertifikasi', value: latestScore.certification_score, max: 20 },
                      { label: 'Motivasi', value: latestScore.motivation_score, max: 20 },
                      { label: 'Profil', value: latestScore.profile_score, max: 20 },
                      { label: 'Kelengkapan', value: latestScore.completeness_score, max: 15 },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '11px', color: 'rgba(228,222,216,0.5)' }}>{item.label}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(228,222,216,0.7)', fontWeight: 600 }}>{item.value || 0}/{item.max}</span>
                        </div>
                        <div style={{ height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                          <div style={{ height: '100%', borderRadius: '2px', backgroundColor: '#037894', width: `${((item.value || 0) / item.max) * 100}%`, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {latestScore.summary && (
                    <p style={{ fontSize: '12px', color: 'rgba(228,222,216,0.6)', lineHeight: 1.5, margin: '0 0 12px', fontStyle: 'italic' }}>&quot;{latestScore.summary}&quot;</p>
                  )}

                  {latestScore.strengths && latestScore.strengths.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#8FC6C5', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Kelebihan</p>
                      {latestScore.strengths.map((s: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                          <span style={{ color: '#82A13B', fontSize: '12px', flexShrink: 0 }}>✓</span>
                          <span style={{ fontSize: '12px', color: 'rgba(228,222,216,0.65)' }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {latestScore.concerns && latestScore.concerns.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#FF4F31', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Perhatian</p>
                      {latestScore.concerns.map((c: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                          <span style={{ color: '#FF4F31', fontSize: '12px', flexShrink: 0 }}>!</span>
                          <span style={{ fontSize: '12px', color: 'rgba(228,222,216,0.65)' }}>{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {latestScore.quest_notes && (
                    <div style={{ marginTop: '10px', padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#8FC6C5', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Catatan HR</p>
                      <p style={{ fontSize: '12px', color: 'rgba(228,222,216,0.55)', lineHeight: 1.6, margin: 0 }}>{latestScore.quest_notes}</p>
                    </div>
                  )}
                </>
              )}
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
              {[
                { key: 'full_name', label: 'Nama Lengkap', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'phone', label: 'No. HP', type: 'tel' },
                { key: 'birth_date', label: 'Tanggal Lahir', type: 'date' },
                { key: 'domicile', label: 'Domisili', type: 'text' },
                { key: 'position_applied', label: 'Posisi Dilamar', type: 'text' },
                { key: 'outlet_preference', label: 'Outlet Preferensi', type: 'text' },
                { key: 'education_level', label: 'Pendidikan', type: 'text' },
                { key: 'instagram_url', label: 'Instagram', type: 'text' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4C4845', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={editForm[field.key as keyof typeof editForm] as string}
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
