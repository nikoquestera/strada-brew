'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PIPELINE_STAGES, PipelineStage } from '@/lib/types'

interface QuestScore {
  overall_score?: number
  recommendation?: string
  status: string
  summary?: string
}

interface Applicant {
  id: string
  full_name: string
  email: string
  phone: string
  position_applied: string
  outlet_preference?: string
  source?: string
  pipeline_stage?: PipelineStage
  quest_score?: number
  created_at: string
  applicant_quest_scores?: QuestScore[]
}

export default function RekrutmenClient({ initialApplicants }: { initialApplicants: Applicant[] }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<PipelineStage | 'semua'>('semua')
  const [search, setSearch] = useState('')

  const activeStages = PIPELINE_STAGES.filter(s => s.group === 'active')
  const closedStages = PIPELINE_STAGES.filter(s => s.group === 'closed')

  const filtered = initialApplicants.filter(a => {
    const matchStage = activeTab === 'semua' || (a.pipeline_stage || 'baru_masuk') === activeTab
    const matchSearch = !search || a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.position_applied.toLowerCase().includes(search.toLowerCase())
    return matchStage && matchSearch
  })

  const countByStage = (stage: PipelineStage) =>
    initialApplicants.filter(a => (a.pipeline_stage || 'baru_masuk') === stage).length

  const getQuestBadge = (applicant: Applicant) => {
    const score = applicant.applicant_quest_scores?.[0]
    if (!score) return { label: '—', bg: '#F0EEEC', color: '#8A8A8D' }
    if (score.status === 'pending') return { label: '⏳ Pending', bg: '#FEF8E6', color: '#DE9733' }
    if (score.status === 'processing') return { label: '⚙ Proses...', bg: '#E6F0F4', color: '#037894' }
    if (score.status === 'failed') return { label: '⚠ Error', bg: '#FFF0EE', color: '#FF4F31' }
    const s = score.overall_score || 0
    if (s >= 75) return { label: `✦ ${s}`, bg: '#E6F4F1', color: '#005353' }
    if (s >= 50) return { label: `✦ ${s}`, bg: '#FEF8E6', color: '#DE9733' }
    return { label: `✦ ${s}`, bg: '#FFF0EE', color: '#FF4F31' }
  }

  const stageInfo = PIPELINE_STAGES.find(s => s.key === activeTab)

  return (
    <div style={{ padding: '0', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ padding: '24px 24px 0', backgroundColor: '#E4DED8' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: '#037894', textTransform: 'uppercase', margin: '0 0 4px' }}>HRD · Rekrutmen</p>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#020000', margin: 0 }}>Applicant Tracking</h1>
            <p style={{ fontSize: '13px', color: '#8A8A8D', margin: '4px 0 0' }}>{initialApplicants.length} total pelamar</p>
          </div>
          <a href="/apply" target="_blank"
            style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #037894', color: '#037894', fontSize: '13px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Portal Pelamar ↗
          </a>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#8A8A8D' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau posisi..."
            style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '12px', border: '1.5px solid rgba(76,72,69,0.15)', fontSize: '14px', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Stage tabs — horizontal scroll */}
        <div style={{ overflowX: 'auto', paddingBottom: '1px' }}>
          <div style={{ display: 'flex', gap: '6px', minWidth: 'max-content', paddingBottom: '0' }}>
            <button onClick={() => setActiveTab('semua')}
              style={{ padding: '8px 16px', borderRadius: '10px 10px 0 0', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                backgroundColor: activeTab === 'semua' ? '#ffffff' : 'rgba(0,0,0,0.06)',
                color: activeTab === 'semua' ? '#020000' : '#8A8A8D' }}>
              Semua <span style={{ fontSize: '11px', marginLeft: '4px', opacity: 0.6 }}>{initialApplicants.length}</span>
            </button>

            {/* Active stages */}
            {activeStages.map(stage => {
              const count = countByStage(stage.key)
              const isActive = activeTab === stage.key
              return (
                <button key={stage.key} onClick={() => setActiveTab(stage.key)}
                  style={{ padding: '8px 16px', borderRadius: '10px 10px 0 0', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                    backgroundColor: isActive ? '#ffffff' : 'rgba(0,0,0,0.06)',
                    color: isActive ? stage.color : '#8A8A8D' }}>
                  {stage.label}
                  {count > 0 && <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px', backgroundColor: isActive ? stage.color : 'rgba(0,0,0,0.1)', color: isActive ? '#fff' : '#8A8A8D' }}>{count}</span>}
                </button>
              )
            })}

            <div style={{ width: '1px', backgroundColor: 'rgba(0,0,0,0.1)', margin: '8px 4px' }} />

            {/* Closed stages */}
            {closedStages.map(stage => {
              const count = countByStage(stage.key)
              const isActive = activeTab === stage.key
              return (
                <button key={stage.key} onClick={() => setActiveTab(stage.key)}
                  style={{ padding: '8px 16px', borderRadius: '10px 10px 0 0', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', opacity: 0.7,
                    backgroundColor: isActive ? '#ffffff' : 'rgba(0,0,0,0.04)',
                    color: isActive ? stage.color : '#8A8A8D' }}>
                  {stage.label}
                  {count > 0 && <span style={{ marginLeft: '6px', fontSize: '11px' }}>{count}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div style={{ backgroundColor: '#ffffff', minHeight: 'calc(100vh - 220px)', padding: '20px 24px' }}>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>📋</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#020000', marginBottom: '4px' }}>
              {activeTab === 'semua' ? 'Belum ada pelamar' : `Tidak ada pelamar di tahap ini`}
            </p>
            <p style={{ fontSize: '13px', color: '#8A8A8D' }}>
              {activeTab === 'semua' ? 'Bagikan link portal karir ke kandidat.' : 'Pindahkan kandidat ke tahap ini dari tab lain.'}
            </p>
          </div>
        ) : (
          <>
            {stageInfo && activeTab !== 'semua' && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', backgroundColor: `${stageInfo.color}15`, border: `1px solid ${stageInfo.color}30`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stageInfo.color, flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: stageInfo.color }}>{stageInfo.label}</span>
                <span style={{ fontSize: '13px', color: '#8A8A8D' }}>— {filtered.length} kandidat</span>
              </div>
            )}

            {/* Applicant cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {filtered.map(applicant => {
                const quest = getQuestBadge(applicant)
                const stage = PIPELINE_STAGES.find(s => s.key === (applicant.pipeline_stage || 'baru_masuk'))
                const scoreData = applicant.applicant_quest_scores?.[0]

                return (
                  <div key={applicant.id}
                    onClick={() => router.push(`/dashboard/hrd/rekrutmen/${applicant.id}`)}
                    style={{ backgroundColor: '#ffffff', border: '1.5px solid #E8E4E0', borderRadius: '16px', padding: '18px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#037894'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(3,120,148,0.1)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E8E4E0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>

                    {/* Quest score bubble */}
                    <div style={{ position: 'absolute', top: '14px', right: '14px', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, backgroundColor: quest.bg, color: quest.color }}>
                      {quest.label}
                    </div>

                    {/* Name & position */}
                    <div style={{ marginBottom: '12px', paddingRight: '70px' }}>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: '#020000', margin: '0 0 3px' }}>{applicant.full_name}</p>
                      <p style={{ fontSize: '13px', color: '#037894', margin: '0 0 2px', fontWeight: 600 }}>{applicant.position_applied}</p>
                      {applicant.outlet_preference && (
                        <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>{applicant.outlet_preference}</p>
                      )}
                    </div>

                    {/* Quest summary if completed */}
                    {scoreData?.status === 'completed' && scoreData.summary && (
                      <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: '#F7F5F2', marginBottom: '12px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#037894', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '1px' }}>Quest AI</p>
                        <p style={{ fontSize: '12px', color: '#4C4845', margin: 0, lineHeight: 1.5 }}>{scoreData.summary}</p>
                      </div>
                    )}

                    {/* Meta row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '8px', fontWeight: 600, backgroundColor: `${stage?.color || '#8A8A8D'}18`, color: stage?.color || '#8A8A8D' }}>
                        {stage?.label || 'Baru Masuk'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#8A8A8D' }}>{applicant.source || 'Portal'}</span>
                        <span style={{ fontSize: '11px', color: '#8A8A8D' }}>
                          {new Date(applicant.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}