'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { JobPosting } from '@/lib/types'
import { ArrowLeft, MapPin, Clock, Users, Zap, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react'

interface Props {
  job: JobPosting
  applicants: {
    id: string
    full_name: string
    pipeline_stage: string
    created_at: string
    applicant_quest_scores?: { overall_score?: number; status: string; recommendation?: string }[]
  }[]
}

export default function JobDetailClient({ job: initialJob, applicants }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [job, setJob] = useState(initialJob)
  const [togglingActive, setTogglingActive] = useState(false)

  async function toggleActive() {
    setTogglingActive(true)
    await supabase.from('job_postings').update({ is_active: !job.is_active }).eq('id', job.id)
    setJob(j => ({ ...j, is_active: !j.is_active }))
    setTogglingActive(false)
  }

  const stageLabel: Record<string, string> = {
    baru_masuk: 'Baru Masuk', perlu_direview: 'Perlu Direview', sedang_direview: 'Sedang Direview',
    shortlisted: 'Shortlisted', dihubungi: 'Dihubungi', interview_dijadwalkan: 'Interview Dijadwalkan',
    sudah_diinterview: 'Sudah Interview', pertimbangan_akhir: 'Pertimbangan Akhir',
    penawaran_dikirim: 'Penawaran Dikirim', menunggu_jawaban: 'Menunggu Jawaban',
    diterima: 'Diterima', menunggu_onboarding: 'Menunggu Onboarding', onboarded: 'Onboarded',
    probation_berjalan: 'Probation', karyawan_tetap: 'Karyawan Tetap',
    tidak_cocok: 'Tidak Cocok', mengundurkan_diri: 'Mengundurkan Diri',
    tidak_hadir_interview: 'Tidak Hadir', penawaran_ditolak: 'Ditolak', on_hold: 'On Hold',
  }

  const getQuestBadge = (scores: Props['applicants'][0]['applicant_quest_scores']) => {
    const s = scores?.[0]
    if (!s || s.status === 'pending') return { label: '—', bg: '#F0EEEC', color: '#8A8A8D' }
    if (s.status === 'processing') return { label: '⚙', bg: '#E6F0F4', color: '#037894' }
    if (s.status === 'failed') return { label: '⚠', bg: '#FFF0EE', color: '#FF4F31' }
    const score = s.overall_score || 0
    if (score >= 75) return { label: `${score}`, bg: '#E6F4F1', color: '#005353' }
    if (score >= 50) return { label: `${score}`, bg: '#FEF8E6', color: '#DE9733' }
    return { label: `${score}`, bg: '#FFF0EE', color: '#FF4F31' }
  }

  const activeApplicants = applicants.filter(a =>
    !['tidak_cocok', 'mengundurkan_diri', 'tidak_hadir_interview', 'penawaran_ditolak'].includes(a.pipeline_stage)
  )
  const avgScore = (() => {
    const scored = applicants.filter(a => a.applicant_quest_scores?.[0]?.overall_score)
    if (scored.length === 0) return null
    return Math.round(scored.reduce((sum, a) => sum + (a.applicant_quest_scores?.[0]?.overall_score || 0), 0) / scored.length)
  })()

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .jd-grid { grid-template-columns: 1fr !important; }
          .jd-header-row { flex-direction: column !important; gap: 12px !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>

        {/* Top bar */}
        <div style={{ backgroundColor: '#020000', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={() => router.push('/dashboard/hrd/jobs')}
            style={{ color: 'rgba(228,222,216,0.5)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: 0 }}>
            <ArrowLeft size={15} /> Job Posting
          </button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={toggleActive} disabled={togglingActive}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: job.is_active ? '#8FC6C5' : '#8A8A8D', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              {job.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {job.is_active ? 'Aktif' : 'Nonaktif'}
            </button>
            <a href={`/apply?job=${encodeURIComponent(job.job_id)}`} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
              <ExternalLink size={13} /> Preview Apply
            </a>
          </div>
        </div>

        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px' }}>

          {/* Job header card */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1.5px solid #E8E4E0', padding: '28px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }} className="jd-header-row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', letterSpacing: '1.5px' }}>{job.job_id}</span>
                  {job.is_urgent && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 10px', borderRadius: '6px', backgroundColor: '#FFF0EE', color: '#FF4F31' }}>URGENT</span>}
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 10px', borderRadius: '6px', backgroundColor: job.is_active ? '#E6F4F1' : '#F0EEEC', color: job.is_active ? '#005353' : '#8A8A8D' }}>
                    {job.is_active ? 'AKTIF' : 'NONAKTIF'}
                  </span>
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#020000', margin: '0 0 4px', lineHeight: 1.15 }}>{job.title}</h1>
                <p style={{ fontSize: '15px', color: '#037894', fontWeight: 600, margin: 0 }}>{job.department} · {job.entity.replace('_', ' ')}</p>
              </div>
              {job.salary_display && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Gaji</p>
                  <p style={{ fontSize: '18px', fontWeight: 800, color: '#005353', margin: 0 }}>{job.salary_display}</p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', paddingTop: '20px', borderTop: '1px solid #F0EEEC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <MapPin size={14} color="#037894" />
                <div>
                  <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>Lokasi</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#020000', margin: 0 }}>{job.location}{job.outlet ? ` · ${job.outlet}` : ''}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Clock size={14} color="#037894" />
                <div>
                  <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>Tipe</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#020000', margin: 0 }}>{job.employment_type}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Users size={14} color="#037894" />
                <div>
                  <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>Pelamar</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#020000', margin: 0 }}>{applicants.length} total · {activeApplicants.length} aktif</p>
                </div>
              </div>
              {job.min_experience_years > 0 && (
                <div>
                  <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>Min. Pengalaman</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#020000', margin: 0 }}>{job.min_experience_years} tahun</p>
                </div>
              )}
              {avgScore !== null && (
                <div>
                  <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>Rata-rata Quest</p>
                  <p style={{ fontSize: '13px', fontWeight: 800, color: avgScore >= 75 ? '#005353' : avgScore >= 50 ? '#DE9733' : '#FF4F31', margin: 0 }}>{avgScore} / 100</p>
                </div>
              )}
              {job.deadline && (
                <div>
                  <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>Deadline</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#DE9733', margin: 0 }}>
                    {new Date(job.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Main grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }} className="jd-grid">

            {/* Left — job content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {job.description && (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', padding: '24px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 14px' }}>Tentang Posisi</h3>
                  <p style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{job.description}</p>
                </div>
              )}
              {job.responsibilities && (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', padding: '24px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 14px' }}>Tanggung Jawab</h3>
                  {job.responsibilities.split('\n').filter(l => l.trim()).map((line, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ color: '#037894', fontWeight: 700, flexShrink: 0 }}>—</span>
                      <p style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.6, margin: 0 }}>{line.replace(/^[-•]\s*/, '')}</p>
                    </div>
                  ))}
                </div>
              )}
              {job.requirements && (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', padding: '24px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 14px' }}>Persyaratan</h3>
                  {job.requirements.split('\n').filter(l => l.trim()).map((line, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ color: '#82A13B', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <p style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.6, margin: 0 }}>{line.replace(/^[-•]\s*/, '')}</p>
                    </div>
                  ))}
                </div>
              )}
              {job.benefits && (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', padding: '24px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 14px' }}>Benefit</h3>
                  {job.benefits.split('\n').filter(l => l.trim()).map((line, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ color: '#DE9733', fontWeight: 700, flexShrink: 0 }}>★</span>
                      <p style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.6, margin: 0 }}>{line.replace(/^[-•]\s*/, '')}</p>
                    </div>
                  ))}
                </div>
              )}
              {job.ai_screening_notes && (
                <div style={{ backgroundColor: 'rgba(3,120,148,0.04)', borderRadius: '16px', border: '1.5px solid rgba(3,120,148,0.2)', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Zap size={14} color="#037894" />
                    <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>Catatan Quest AI</h3>
                  </div>
                  <p style={{ fontSize: '13px', color: '#4C4845', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{job.ai_screening_notes}</p>
                </div>
              )}
            </div>

            {/* Right — applicants panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#020000', borderRadius: '16px', padding: '20px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#8FC6C5', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 16px' }}>Pipeline Stats</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { label: 'Total', value: applicants.length, color: '#fff' },
                    { label: 'Aktif', value: activeApplicants.length, color: '#8FC6C5' },
                    { label: 'Scored', value: applicants.filter(a => a.applicant_quest_scores?.[0]?.status === 'completed').length, color: '#82A13B' },
                    { label: 'Diterima', value: applicants.filter(a => ['diterima', 'onboarded', 'karyawan_tetap'].includes(a.pipeline_stage)).length, color: '#DE9733' },
                  ].map(stat => (
                    <div key={stat.label} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px' }}>
                      <p style={{ fontSize: '22px', fontWeight: 800, color: stat.color, margin: '0 0 2px' }}>{stat.value}</p>
                      <p style={{ fontSize: '10px', color: 'rgba(228,222,216,0.4)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0EEEC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#020000', margin: 0 }}>Pelamar</h3>
                  <button onClick={() => router.push('/dashboard/hrd/rekrutmen')}
                    style={{ fontSize: '12px', color: '#037894', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Lihat semua →
                  </button>
                </div>
                {applicants.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center' }}>
                    <p style={{ fontSize: '28px', margin: '0 0 8px' }}>📋</p>
                    <p style={{ fontSize: '13px', color: '#8A8A8D', margin: 0 }}>Belum ada pelamar untuk posisi ini</p>
                  </div>
                ) : (
                  <div>
                    {applicants.slice(0, 10).map((applicant, idx) => {
                      const quest = getQuestBadge(applicant.applicant_quest_scores)
                      return (
                        <div key={applicant.id}
                          onClick={() => router.push(`/dashboard/hrd/rekrutmen/${applicant.id}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 20px', cursor: 'pointer', borderBottom: idx < Math.min(applicants.length, 10) - 1 ? '1px solid #F7F5F2' : 'none' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFAF9'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#E4DED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#4C4845' }}>{applicant.full_name[0]}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#020000', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{applicant.full_name}</p>
                            <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>{stageLabel[applicant.pipeline_stage] || applicant.pipeline_stage}</p>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', backgroundColor: quest.bg, color: quest.color, flexShrink: 0 }}>✦ {quest.label}</span>
                        </div>
                      )
                    })}
                    {applicants.length > 10 && (
                      <div style={{ padding: '12px 20px', textAlign: 'center', borderTop: '1px solid #F0EEEC' }}>
                        <button onClick={() => router.push('/dashboard/hrd/rekrutmen')}
                          style={{ fontSize: '12px', color: '#8A8A8D', background: 'none', border: 'none', cursor: 'pointer' }}>
                          +{applicants.length - 10} pelamar lainnya
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}