'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PIPELINE_STAGES, PipelineStage } from '@/lib/types'
import { Search, Filter, ChevronDown } from 'lucide-react'

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

const STAGE_GROUPS = [
  { label: 'Masuk & Review', stages: ['baru_masuk', 'perlu_direview', 'sedang_direview'], color: '#037894' },
  { label: 'Seleksi', stages: ['shortlisted', 'dihubungi', 'interview_dijadwalkan', 'sudah_diinterview', 'pertimbangan_akhir'], color: '#005353' },
  { label: 'Penawaran', stages: ['penawaran_dikirim', 'menunggu_jawaban'], color: '#DE9733' },
  { label: 'Diterima', stages: ['diterima', 'menunggu_onboarding', 'onboarded'], color: '#82A13B' },
  { label: 'Karyawan', stages: ['probation_berjalan', 'probation_hampir_selesai', 'karyawan_tetap'], color: '#005353' },
  { label: 'Tidak Lanjut', stages: ['tidak_cocok', 'mengundurkan_diri', 'tidak_hadir_interview', 'penawaran_ditolak', 'on_hold'], color: '#8A8A8D' },
]

function QuestTriggerButton({ applicantId, currentScore, onScored }: {
  applicantId: string
  currentScore: QuestScore | undefined
  onScored: (id: string) => void
}) {
  const [running, setRunning] = useState(false)

  const needsScore = !currentScore ||
    currentScore.status === 'pending' ||
    currentScore.status === 'failed'

  if (!needsScore) return null

  async function trigger(e: React.MouseEvent) {
    e.stopPropagation()
    setRunning(true)
    try {
      await fetch('/api/quest/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicant_id: applicantId }),
      })
      onScored(applicantId)
    } catch { /* ignore */ } finally {
      setRunning(false)
    }
  }

  return (
    <button onClick={trigger} disabled={running}
      style={{
        padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
        border: 'none', cursor: running ? 'not-allowed' : 'pointer',
        backgroundColor: running ? 'rgba(3,120,148,0.1)' : '#020000',
        color: running ? '#037894' : '#8FC6C5',
        display: 'flex', alignItems: 'center', gap: '3px', transition: 'all 0.15s',
      }}>
      {running
        ? <><span style={{ display: 'inline-block', animation: 'quest-spin 1s linear infinite' }}>⚙</span>Scoring...</>
        : '✦ Score'}
    </button>
  )
}

export default function RekrutmenClient({ initialApplicants }: { initialApplicants: Applicant[] }) {
  const router = useRouter()
  const [applicants, setApplicants] = useState<Applicant[]>(initialApplicants)
  const [activeStage, setActiveStage] = useState<PipelineStage | 'semua'>('semua')
  const [search, setSearch] = useState('')
  const [showMobileFilter, setShowMobileFilter] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Masuk & Review', 'Seleksi'])
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date')

  function handleScored(applicantId: string) {
    setApplicants(prev => prev.map(a =>
      a.id === applicantId
        ? { ...a, applicant_quest_scores: [{ status: 'processing' }] }
        : a
    ))
  }

  const filtered = applicants
    .filter(a => {
      const matchStage = activeStage === 'semua' || (a.pipeline_stage || 'baru_masuk') === activeStage
      const matchSearch = !search ||
        a.full_name.toLowerCase().includes(search.toLowerCase()) ||
        a.position_applied.toLowerCase().includes(search.toLowerCase())
      return matchStage && matchSearch
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        const sa = a.applicant_quest_scores?.[0]?.overall_score || 0
        const sb = b.applicant_quest_scores?.[0]?.overall_score || 0
        return sb - sa
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const countByStage = (stage: string) =>
    applicants.filter(a => (a.pipeline_stage || 'baru_masuk') === stage).length
  const countByGroup = (stages: string[]) =>
    stages.reduce((sum, s) => sum + countByStage(s), 0)
  const toggleGroup = (label: string) =>
    setExpandedGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    )

  const getQuestBadge = (applicant: Applicant) => {
    const score = applicant.applicant_quest_scores?.[0]
    if (!score) return { label: '—', bg: '#F0EEEC', color: '#8A8A8D' }
    if (score.status === 'pending') return { label: '⏳', bg: '#FEF8E6', color: '#DE9733' }
    if (score.status === 'processing') return { label: '⚙', bg: '#E6F0F4', color: '#037894' }
    if (score.status === 'failed') return { label: '⚠', bg: '#FFF0EE', color: '#FF4F31' }
    if (!score.overall_score) return { label: '⏳', bg: '#FEF8E6', color: '#DE9733' }
    const s = score.overall_score
    if (s >= 75) return { label: `${s}`, bg: '#E6F4F1', color: '#005353' }
    if (s >= 50) return { label: `${s}`, bg: '#FEF8E6', color: '#DE9733' }
    return { label: `${s}`, bg: '#FFF0EE', color: '#FF4F31' }
  }

  const activeStageInfo = PIPELINE_STAGES.find(s => s.key === activeStage)

  const Sidebar = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <button onClick={() => { setActiveStage('semua'); setShowMobileFilter(false) }}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, textAlign: 'left', backgroundColor: activeStage === 'semua' ? '#037894' : 'transparent', color: activeStage === 'semua' ? '#fff' : '#020000' }}>
        <span>Semua Pelamar</span>
        <span style={{ fontSize: '12px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px', backgroundColor: activeStage === 'semua' ? 'rgba(255,255,255,0.25)' : 'rgba(3,120,148,0.1)', color: activeStage === 'semua' ? '#fff' : '#037894' }}>
          {applicants.length}
        </span>
      </button>

      {STAGE_GROUPS.map(group => {
        const groupCount = countByGroup(group.stages)
        const isExpanded = expandedGroups.includes(group.label)
        return (
          <div key={group.label}>
            <button onClick={() => toggleGroup(group.label)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', backgroundColor: 'transparent', color: '#8A8A8D', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronDown size={12} style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
                {group.label}
              </div>
              {groupCount > 0 && <span style={{ fontSize: '11px', fontWeight: 700, color: group.color }}>{groupCount}</span>}
            </button>
            {isExpanded && group.stages.map(stageKey => {
              const stageInfo = PIPELINE_STAGES.find(s => s.key === stageKey)
              if (!stageInfo) return null
              const count = countByStage(stageKey)
              const isActive = activeStage === stageKey
              return (
                <button key={stageKey} onClick={() => { setActiveStage(stageKey as PipelineStage); setShowMobileFilter(false) }}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 14px 7px 28px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', textAlign: 'left', backgroundColor: isActive ? `${stageInfo.color}15` : 'transparent', color: isActive ? stageInfo.color : '#4C4845', fontWeight: isActive ? 700 : 400 }}>
                  <span>{stageInfo.label}</span>
                  {count > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px', backgroundColor: isActive ? `${stageInfo.color}25` : '#F0EEEC', color: isActive ? stageInfo.color : '#8A8A8D' }}>{count}</span>}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .ats-layout { flex-direction: column !important; }
          .ats-sidebar-desktop { display: none !important; }
          .ats-cards { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .ats-mobile-filter-btn { display: none !important; }
          .ats-mobile-sidebar { display: none !important; }
        }
        @keyframes quest-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', backgroundColor: '#E4DED8', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: '#037894', textTransform: 'uppercase', margin: '0 0 3px' }}>HRD · Rekrutmen</p>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#020000', margin: 0 }}>Applicant Tracking</h1>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={() => setShowMobileFilter(true)} className="ats-mobile-filter-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', backgroundColor: '#020000', color: '#fff', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                <Filter size={14} /> Filter
              </button>
              <a href="https://brew.stradacoffee.com/apply" target="_blank" rel="noreferrer"
                style={{ padding: '8px 16px', borderRadius: '10px', border: '1.5px solid #037894', color: '#037894', fontSize: '13px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Portal ↗
              </a>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8A8A8D' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, posisi..."
              style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '12px', border: '1.5px solid rgba(76,72,69,0.15)', fontSize: '14px', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#8A8A8D' }}>Urutkan:</span>
            {(['date', 'score'] as const).map(opt => (
              <button key={opt} onClick={() => setSortBy(opt)}
                style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: sortBy === opt ? '#020000' : '#fff', color: sortBy === opt ? '#fff' : '#4C4845', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                {opt === 'date' ? 'Terbaru' : '✦ Quest Score'}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile sidebar */}
        {showMobileFilter && (
          <>
            <div onClick={() => setShowMobileFilter(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
            <div className="ats-mobile-sidebar" style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '280px', backgroundColor: '#fff', zIndex: 50, padding: '20px 16px', overflowY: 'auto', boxShadow: '4px 0 20px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#020000', margin: 0 }}>Filter Status</h3>
                <button onClick={() => setShowMobileFilter(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#8A8A8D' }}>×</button>
              </div>
              <Sidebar />
            </div>
          </>
        )}

        <div style={{ display: 'flex', minHeight: 'calc(100vh - 180px)' }} className="ats-layout">
          <div className="ats-sidebar-desktop" style={{ width: '240px', flexShrink: 0, padding: '20px 16px', backgroundColor: '#ffffff', borderRight: '1px solid #E8E4E0' }}>
            <Sidebar />
          </div>

          <div style={{ flex: 1, padding: '20px 24px', overflowX: 'hidden' }}>
            {activeStageInfo && activeStage !== 'semua' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '10px 16px', borderRadius: '12px', backgroundColor: `${activeStageInfo.color}12`, border: `1px solid ${activeStageInfo.color}25` }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: activeStageInfo.color }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: activeStageInfo.color }}>{activeStageInfo.label}</span>
                <span style={{ fontSize: '13px', color: '#8A8A8D' }}>— {filtered.length} kandidat</span>
              </div>
            )}
            {activeStage === 'semua' && (
              <p style={{ fontSize: '13px', color: '#8A8A8D', marginBottom: '16px' }}>
                {filtered.length} dari {applicants.length} pelamar{search && ` · "${search}"`}
              </p>
            )}

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0' }}>
                <p style={{ fontSize: '32px', marginBottom: '10px' }}>📋</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#020000', marginBottom: '4px' }}>Tidak ada pelamar</p>
                <p style={{ fontSize: '13px', color: '#8A8A8D' }}>
                  {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada pelamar di tahap ini.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }} className="ats-cards">
                {filtered.map(applicant => {
                  const quest = getQuestBadge(applicant)
                  const stage = PIPELINE_STAGES.find(s => s.key === (applicant.pipeline_stage || 'baru_masuk'))
                  const scoreData = applicant.applicant_quest_scores?.[0]

                  return (
                    <div key={applicant.id}
                      onClick={() => router.push(`/dashboard/hrd/rekrutmen/${applicant.id}`)}
                      style={{ backgroundColor: '#fff', border: '1.5px solid #E8E4E0', borderRadius: '14px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#037894'; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = '0 4px 16px rgba(3,120,148,0.1)' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#E8E4E0'; el.style.transform = 'none'; el.style.boxShadow = 'none' }}>

                      {/* Top: name + quest badge + score button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{applicant.full_name}</p>
                          <p style={{ fontSize: '12px', color: '#037894', fontWeight: 600, margin: 0 }}>{applicant.position_applied}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                          {/* Quest score badge */}
                          <div style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, backgroundColor: quest.bg, color: quest.color, whiteSpace: 'nowrap' }}>
                            ✦ {quest.label}
                          </div>
                          {/* Trigger button — only shows when unscored/failed */}
                          <QuestTriggerButton
                            applicantId={applicant.id}
                            currentScore={scoreData}
                            onScored={handleScored}
                          />
                        </div>
                      </div>

                      {applicant.outlet_preference && (
                        <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '0 0 8px' }}>{applicant.outlet_preference}</p>
                      )}

                      {scoreData?.status === 'completed' && scoreData.summary && (
                        <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#F7F5F2', marginBottom: '8px' }}>
                          <p style={{ fontSize: '11px', color: '#4C4845', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {scoreData.summary}
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, backgroundColor: `${stage?.color || '#8A8A8D'}18`, color: stage?.color || '#8A8A8D' }}>
                          {stage?.label || 'Baru Masuk'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#8A8A8D' }}>
                          {new Date(applicant.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
