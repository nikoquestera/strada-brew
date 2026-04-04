'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PIPELINE_STAGES, PipelineStage } from '@/lib/types'
import { ArrowLeft, Phone, Mail, AtSign, MapPin, Calendar, Briefcase, Star, MessageSquare, Send } from 'lucide-react'

interface Props {
  applicant: Record<string, any>
}

export default function ApplicantDetailClient({ applicant }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [currentStage, setCurrentStage] = useState<PipelineStage>(applicant.pipeline_stage || 'baru_masuk')
  const [changingStage, setChangingStage] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageChannel, setMessageChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [generatingMessages, setGeneratingMessages] = useState(false)
  const [messageOptions, setMessageOptions] = useState<{option1: string; option2: string; option3: string} | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)
  const [triggerScoring, setTriggerScoring] = useState(false)

  const quest = applicant.applicant_quest_scores?.[0]
  const stageInfo = PIPELINE_STAGES.find(s => s.key === currentStage)

  async function handleStageChange(newStage: PipelineStage) {
    setChangingStage(true)
    await supabase.from('applicants').update({ pipeline_stage: newStage }).eq('id', applicant.id)
    setCurrentStage(newStage)
    setChangingStage(false)
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
        hr_name: 'Tim HR Strada Coffee'
      })
    })
    const data = await res.json()
    setMessageOptions(data)
    setGeneratingMessages(false)
  }

  async function handleTriggerScoring() {
    setTriggerScoring(true)
    await supabase.from('applicant_quest_scores')
      .update({ status: 'pending' })
      .eq('applicant_id', applicant.id)
    await fetch('/api/quest/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicant_id: applicant.id })
    })
    setTriggerScoring(false)
    router.refresh()
  }

  const scoreColor = (s: number) => s >= 75 ? '#005353' : s >= 50 ? '#DE9733' : '#FF4F31'
  const scoreBg = (s: number) => s >= 75 ? '#E6F4F1' : s >= 50 ? '#FEF8E6' : '#FFF0EE'

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .detail-grid { grid-template-columns: 1fr !important; }
          .detail-header { flex-direction: column !important; gap: 12px !important; }
          .stage-select { font-size: 12px !important; padding: 8px 10px !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>

        {/* Top bar */}
        <div style={{ backgroundColor: '#020000', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button onClick={() => router.back()} style={{ color: 'rgba(228,222,216,0.6)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: 0 }}>
            <ArrowLeft size={16} /> Kembali
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '16px', margin: 0 }}>{applicant.full_name}</p>
            <p style={{ color: '#8FC6C5', fontSize: '12px', margin: 0 }}>{applicant.position_applied}{applicant.outlet_preference ? ` · ${applicant.outlet_preference}` : ''}</p>
          </div>
          {/* Stage changer */}
          <select value={currentStage} onChange={e => handleStageChange(e.target.value as PipelineStage)}
            disabled={changingStage}
            className="stage-select"
            style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', backgroundColor: stageInfo?.color || '#037894', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', outline: 'none' }}>
            {PIPELINE_STAGES.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', maxWidth: '1200px', margin: '0 auto' }} className="detail-grid">

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Contact info */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 16px' }}>Informasi Kontak</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { icon: <Phone size={14} />, label: 'No. HP', value: applicant.phone },
                  { icon: <Mail size={14} />, label: 'Email', value: applicant.email },
                  { icon: <MapPin size={14} />, label: 'Domisili', value: applicant.domicile || '-' },
                  { icon: <AtSign size={14} />, label: 'Instagram', value: applicant.instagram_url || '-' },
                  { icon: <Calendar size={14} />, label: 'Tgl Lahir', value: applicant.birth_date ? new Date(applicant.birth_date).toLocaleDateString('id-ID') : '-' },
                  { icon: <Briefcase size={14} />, label: 'Pendidikan', value: applicant.education_level || '-' },
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
                  <span style={{ fontSize: '13px', fontWeight: 700, color: applicant.has_cafe_experience ? '#005353' : '#8A8A8D' }}>
                    {applicant.has_cafe_experience ? `${applicant.cafe_experience_years} tahun` : 'Belum ada'}
                  </span>
                </div>
                {applicant.cafe_experience_detail && (
                  <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#F7F5F2' }}>
                    <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '0 0 4px' }}>Detail pengalaman</p>
                    <p style={{ fontSize: '13px', color: '#4C4845', margin: 0 }}>{applicant.cafe_experience_detail}</p>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', backgroundColor: '#F7F5F2' }}>
                  <span style={{ fontSize: '13px', color: '#4C4845' }}>Sertifikasi barista</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: applicant.has_barista_cert ? '#005353' : '#8A8A8D' }}>
                    {applicant.has_barista_cert ? 'Ada' : 'Tidak ada'}
                  </span>
                </div>
                {applicant.cert_detail && (
                  <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#F7F5F2' }}>
                    <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '0 0 4px' }}>Detail sertifikasi</p>
                    <p style={{ fontSize: '13px', color: '#4C4845', margin: 0 }}>{applicant.cert_detail}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Motivation */}
            {applicant.hr_notes && (
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 12px' }}>Motivasi</h3>
                <p style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>"{applicant.hr_notes}"</p>
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
                          {act.activity_type === 'stage_changed' ? `Dipindahkan ke ${PIPELINE_STAGES.find(s => s.key === act.to_stage)?.label || act.to_stage}` :
                           act.activity_type === 'applied' ? 'Mendaftar via portal' :
                           act.note || act.activity_type}
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
                {(!quest || quest.status === 'failed') && (
                  <button onClick={handleTriggerScoring} disabled={triggerScoring}
                    style={{ padding: '4px 12px', borderRadius: '8px', backgroundColor: '#037894', color: '#fff', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                    {triggerScoring ? '...' : 'Run Score'}
                  </button>
                )}
              </div>

              {!quest && (
                <p style={{ color: 'rgba(228,222,216,0.4)', fontSize: '13px', margin: 0 }}>Scoring belum dimulai.</p>
              )}
              {quest?.status === 'pending' && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ color: '#DE9733', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>⏳ Dalam Antrian</p>
                  <p style={{ color: 'rgba(228,222,216,0.4)', fontSize: '12px', margin: 0 }}>Scoring akan segera diproses</p>
                </div>
              )}
              {quest?.status === 'processing' && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ color: '#037894', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>⚙ Sedang Dianalisa</p>
                  <p style={{ color: 'rgba(228,222,216,0.4)', fontSize: '12px', margin: 0 }}>Quest AI sedang membaca profil</p>
                </div>
              )}
              {quest?.status === 'completed' && (
                <>
                  {/* Overall score */}
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '52px', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{quest.overall_score}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(228,222,216,0.4)', marginTop: '4px' }}>dari 100</div>
                    {quest.recommendation && (
                      <div style={{ marginTop: '10px', display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                        backgroundColor: quest.recommendation === 'Highly Recommended' ? '#005353' :
                          quest.recommendation === 'Recommended' ? '#037894' :
                          quest.recommendation === 'Consider' ? '#DE9733' : '#FF4F31',
                        color: '#ffffff' }}>
                        {quest.recommendation}
                      </div>
                    )}
                  </div>

                  {/* Score breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {[
                      { label: 'Pengalaman', value: quest.experience_score, max: 25 },
                      { label: 'Sertifikasi', value: quest.certification_score, max: 20 },
                      { label: 'Motivasi', value: quest.motivation_score, max: 20 },
                      { label: 'Profil', value: quest.profile_score, max: 20 },
                      { label: 'Kelengkapan', value: quest.completeness_score, max: 15 },
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

                  {/* Summary */}
                  {quest.summary && (
                    <p style={{ fontSize: '12px', color: 'rgba(228,222,216,0.6)', lineHeight: 1.5, margin: '0 0 12px', fontStyle: 'italic' }}>"{quest.summary}"</p>
                  )}

                  {/* Strengths & concerns */}
                  {quest.strengths?.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#8FC6C5', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Kelebihan</p>
                      {quest.strengths.map((s: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                          <span style={{ color: '#82A13B', fontSize: '12px', flexShrink: 0 }}>✓</span>
                          <span style={{ fontSize: '12px', color: 'rgba(228,222,216,0.65)' }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {quest.concerns?.length > 0 && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#FF4F31', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Perhatian</p>
                      {quest.concerns.map((c: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                          <span style={{ color: '#FF4F31', fontSize: '12px', flexShrink: 0 }}>!</span>
                          <span style={{ fontSize: '12px', color: 'rgba(228,222,216,0.65)' }}>{c}</span>
                        </div>
                      ))}
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

            {/* Applicant source & date */}
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

      {/* Message Modal */}
      {showMessageModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowMessageModal(false); setMessageOptions(null); setSelectedMessage(null) } }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px 20px 0 0', padding: '28px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#020000', margin: 0 }}>
                {messageChannel === 'whatsapp' ? '📱 Kirim WhatsApp' : '📧 Kirim Email'}
              </h3>
              <button onClick={() => { setShowMessageModal(false); setMessageOptions(null); setSelectedMessage(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#8A8A8D' }}>×</button>
            </div>

            {/* Channel toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['whatsapp', 'email'] as const).map(ch => (
                <button key={ch} onClick={() => { setMessageChannel(ch); setMessageOptions(null); setSelectedMessage(null) }}
                  style={{ flex: 1, padding: '8px', borderRadius: '10px', border: '1.5px solid', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    backgroundColor: messageChannel === ch ? '#037894' : 'transparent',
                    borderColor: messageChannel === ch ? '#037894' : '#E8E4E0',
                    color: messageChannel === ch ? '#fff' : '#8A8A8D' }}>
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
                {[
                  { key: 'option1', label: 'Formal & Profesional' },
                  { key: 'option2', label: 'Hangat & Friendly' },
                  { key: 'option3', label: 'Singkat & To-the-point' },
                ].map(opt => (
                  <div key={opt.key} onClick={() => setSelectedMessage(messageOptions[opt.key as keyof typeof messageOptions])}
                    style={{ padding: '14px', borderRadius: '12px', cursor: 'pointer', border: '1.5px solid',
                      borderColor: selectedMessage === messageOptions[opt.key as keyof typeof messageOptions] ? '#037894' : '#E8E4E0',
                      backgroundColor: selectedMessage === messageOptions[opt.key as keyof typeof messageOptions] ? 'rgba(3,120,148,0.04)' : '#fff' }}>
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