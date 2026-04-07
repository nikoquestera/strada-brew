'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PIPELINE_STAGES, PipelineStage } from '@/lib/types'
import { Search, Filter, ChevronDown, RefreshCw, Play } from 'lucide-react'

interface QuestScore {
  applicant_id?: string
  overall_score?: number
  recommendation?: string
  status: string
  summary?: string
  processed_at?: string
}

function latestScore(scores?: QuestScore[]): QuestScore | undefined {
  if (!scores || scores.length === 0) return undefined
  return [...scores].sort((a, b) =>
    new Date(b.processed_at || 0).getTime() - new Date(a.processed_at || 0).getTime()
  )[0]
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

function QuestScoreWidget({ applicantId, scoreData, onScored }: {
  applicantId: string
  scoreData: QuestScore | undefined
  onScored: (id: string) => Promise<void>
}) {
  const [triggering, setTriggering] = useState(false)

  const status = scoreData?.status
  const score = scoreData?.overall_score

  async function trigger(e: React.MouseEvent) {
    e.stopPropagation()
    setTriggering(true)
    try {
      await fetch('/api/quest/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicant_id: applicantId }),
      })
      await onScored(applicantId)
    } catch { } finally {
      setTriggering(false)
    }
  }

  // Spinning while scoring
  if (triggering || status === 'processing') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-strada-blue shrink-0 border border-blue-100">
        <RefreshCw size={12} className="animate-spin" />
        <span className="text-[11px] font-bold">Scoring</span>
      </div>
    )
  }

  // Completed — show score number
  if (status === 'completed' && score) {
    const bg = score >= 75 ? 'bg-teal-50 border-teal-100' : score >= 50 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'
    const color = score >= 75 ? 'text-teal-700' : score >= 50 ? 'text-amber-700' : 'text-red-600'
    return (
      <div className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap border ${bg} ${color}`}>
        ✦ {score}
      </div>
    )
  }

  // No score / pending / failed — show Run Score button
  return (
    <button
      onClick={trigger}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all duration-200 border ${
        status === 'failed' 
          ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100' 
          : 'bg-gray-900 text-white hover:bg-gray-800 border-gray-900'
      }`}>
      {status === 'failed' ? <RefreshCw size={12} /> : <Play size={10} fill="currentColor" />}
      {status === 'failed' ? 'Retry' : 'Score'}
    </button>
  )
}

export default function RekrutmenClient({ initialApplicants }: { initialApplicants: Applicant[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [applicants, setApplicants] = useState<Applicant[]>(initialApplicants)
  const [activeStage, setActiveStage] = useState<PipelineStage | 'semua'>('semua')
  const [search, setSearch] = useState('')
  const [showMobileFilter, setShowMobileFilter] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Masuk & Review', 'Seleksi'])
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date')

  const applicantsRef = useRef(applicants)
  useEffect(() => { applicantsRef.current = applicants }, [applicants])

  // Poll every 3s — updates any card currently in 'processing' state
  useEffect(() => {
    const interval = setInterval(async () => {
      const processingIds = applicantsRef.current
        .filter(a => latestScore(a.applicant_quest_scores)?.status === 'processing')
        .map(a => a.id)
      if (processingIds.length === 0) return

      const { data } = await supabase
        .from('applicant_quest_scores')
        .select('*')
        .in('applicant_id', processingIds)

      if (!data || data.length === 0) return

      setApplicants(prev => prev.map(a => {
        const fresh = data.find((d: QuestScore) => d.applicant_id === a.id)
        if (!fresh) return a
        return { ...a, applicant_quest_scores: [fresh] }
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleScored(applicantId: string) {
    // Scoring is already complete in DB by the time this is called — fetch fresh scores immediately
    const { data } = await supabase
      .from('applicant_quest_scores')
      .select('*')
      .eq('applicant_id', applicantId)
      .order('processed_at', { ascending: false })

    setApplicants(prev => prev.map(a =>
      a.id === applicantId
        ? { ...a, applicant_quest_scores: data || [{ status: 'failed' }] }
        : a
    ))
  }

  const filtered = applicants
    .filter(a => {
      const matchStage = activeStage === 'semua' || (a.pipeline_stage || 'baru_masuk') === activeStage
      const matchSearch = !search || a.full_name.toLowerCase().includes(search.toLowerCase()) || a.position_applied.toLowerCase().includes(search.toLowerCase())
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

  const countByStage = (stage: string) => applicants.filter(a => (a.pipeline_stage || 'baru_masuk') === stage).length
  const countByGroup = (stages: string[]) => stages.reduce((sum, s) => sum + countByStage(s), 0)
  const toggleGroup = (label: string) => setExpandedGroups(prev => prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label])

  const activeStageInfo = PIPELINE_STAGES.find(s => s.key === activeStage)

  const sidebar = (
    <div className="flex flex-col gap-1.5">
      <button onClick={() => { setActiveStage('semua'); setShowMobileFilter(false) }}
        className={`w-full flex justify-between items-center px-4 py-2.5 rounded-xl text-[13px] font-bold text-left transition-all duration-200 ${
          activeStage === 'semua' 
            ? 'bg-strada-blue text-white shadow-sm' 
            : 'text-gray-700 hover:bg-gray-100'
        }`}>
        <span>Semua Pelamar</span>
        <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${
          activeStage === 'semua' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
        }`}>{applicants.length}</span>
      </button>

      {STAGE_GROUPS.map(group => {
        const groupCount = countByGroup(group.stages)
        const isExpanded = expandedGroups.includes(group.label)
        return (
          <div key={group.label} className="mt-2">
            <button onClick={() => toggleGroup(group.label)}
              className="w-full flex justify-between items-center px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors">
              <div className="flex items-center gap-2">
                <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                {group.label}
              </div>
              {groupCount > 0 && <span style={{ color: group.color }}>{groupCount}</span>}
            </button>

            {isExpanded && (
              <div className="mt-1 space-y-0.5">
                {group.stages.map(stageKey => {
                  const stageInfo = PIPELINE_STAGES.find(s => s.key === stageKey)
                  if (!stageInfo) return null
                  const count = countByStage(stageKey)
                  const isActive = activeStage === stageKey
                  return (
                    <button key={stageKey} onClick={() => { setActiveStage(stageKey as PipelineStage); setShowMobileFilter(false) }}
                      className={`w-full flex justify-between items-center pl-9 pr-3 py-2.5 rounded-xl text-[13px] text-left transition-all duration-200 ${
                        isActive ? 'font-bold bg-gray-50 shadow-sm' : 'font-medium text-gray-600 hover:bg-gray-50'
                      }`}
                      style={isActive ? { color: stageInfo.color } : {}}>
                      <span className="truncate mr-2">{stageInfo.label}</span>
                      {count > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: isActive ? `${stageInfo.color}15` : '#F3F4F6', color: isActive ? stageInfo.color : '#6B7280' }}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col">
      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-6 py-5 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-strada-blue uppercase mb-1">HRD · Rekrutmen</p>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Applicant Tracking</h1>
            </div>
            <div className="flex gap-3 items-center">
              <button onClick={() => setShowMobileFilter(true)} 
                className="md:hidden flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold shadow-sm">
                <Filter size={16} /> Filter
              </button>
              <a href="/apply" target="_blank" rel="noreferrer" 
                className="apple-btn-secondary flex items-center gap-2 py-2 px-4 text-sm bg-white">
                Portal Karier ↗
              </a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:max-w-md">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama kandidat, posisi..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-strada-blue/20 outline-none transition-all duration-200 placeholder:text-gray-400" />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Urutkan:</span>
              {(['date', 'score'] as const).map(opt => (
                <button key={opt} onClick={() => setSortBy(opt)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap shadow-sm border ${
                    sortBy === opt 
                      ? 'bg-gray-900 text-white border-gray-900' 
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {opt === 'date' ? 'Terbaru' : '✦ Quest Score'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      {showMobileFilter && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowMobileFilter(false)} />
          <div className="relative w-[280px] bg-white h-full shadow-2xl flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-base font-extrabold text-gray-900">Filter Status</h3>
              <button onClick={() => setShowMobileFilter(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-900 rounded-full">
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {sidebar}
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-[260px] shrink-0 p-6 border-r border-gray-200/50 bg-white/30 backdrop-blur-sm">
          {sidebar}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          {activeStageInfo && activeStage !== 'semua' && (
            <div className="flex items-center gap-3 mb-6 px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm"
                 style={{ borderLeftColor: activeStageInfo.color, borderLeftWidth: '4px' }}>
              <span className="text-sm font-extrabold" style={{ color: activeStageInfo.color }}>{activeStageInfo.label}</span>
              <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">— {filtered.length} kandidat</span>
            </div>
          )}
          
          {activeStage === 'semua' && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
              Menampilkan {filtered.length} pelamar {search && <span className="text-strada-blue lowercase normal-case">hasil pencarian &quot;{search}&quot;</span>}
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="apple-card p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Search size={28} className="text-gray-300" />
              </div>
              <p className="text-lg font-extrabold text-gray-900 mb-2">Tidak ada kandidat</p>
              <p className="text-sm text-gray-500 max-w-sm">{search ? `Tidak ada hasil untuk pencarian "${search}".` : 'Belum ada pelamar di tahapan ini.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(applicant => {
                const stage = PIPELINE_STAGES.find(s => s.key === (applicant.pipeline_stage || 'baru_masuk'))
                const scoreData = latestScore(applicant.applicant_quest_scores)
                
                return (
                  <div key={applicant.id}
                    onClick={() => router.push(`/dashboard/hrd/rekrutmen/${applicant.id}`)}
                    className="apple-card p-5 cursor-pointer apple-card-hover flex flex-col">

                    {/* Header */}
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-extrabold text-gray-900 mb-1 truncate">{applicant.full_name}</p>
                        <p className="text-[12px] font-bold text-strada-blue truncate">{applicant.position_applied}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <QuestScoreWidget applicantId={applicant.id} scoreData={scoreData} onScored={handleScored} />
                    </div>

                    {applicant.outlet_preference && (
                      <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span> {applicant.outlet_preference}
                      </p>
                    )}

                    {scoreData?.status === 'completed' && scoreData.summary && (
                      <div className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 mb-4 mt-auto">
                        <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2 italic">&quot;{scoreData.summary}&quot;</p>
                      </div>
                    )}
                    
                    {!scoreData?.summary && <div className="mt-auto"></div>}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100">
                      <span className="text-[10px] font-extrabold px-2 py-1 rounded-md tracking-wider uppercase truncate max-w-[120px]"
                            style={{ backgroundColor: `${stage?.color || '#8A8A8D'}15`, color: stage?.color || '#8A8A8D' }}>
                        {stage?.label || 'Baru Masuk'}
                      </span>
                      <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
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
  )
}
