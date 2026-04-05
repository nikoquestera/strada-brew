'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { JobPosting } from '@/lib/types'
import { MapPin, Clock, Users, Zap, ArrowLeft } from 'lucide-react'

export default function ApplyPage() {
  const supabase = createClient()
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [view, setView] = useState<'jobs' | 'detail' | 'form'>('jobs')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formTopRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', birth_date: '',
    domicile: '', instagram_url: '', position_applied: '',
    outlet_preference: '', source: 'Portal',
    has_cafe_experience: false, cafe_experience_years: '0',
    cafe_experience_detail: '', has_barista_cert: false,
    cert_detail: '', education_level: '', motivation: '',
  })
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  // Load jobs & handle ?job= param
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('job_postings').select('*').eq('is_active', true).order('created_at', { ascending: false })
      setJobs(data || [])
      setLoadingJobs(false)

      // Pre-select job from URL param
      const params = new URLSearchParams(window.location.search)
      const jobId = params.get('job')
      if (jobId && data) {
        const found = data.find((j: JobPosting) => j.job_id === jobId)
        if (found) { setSelectedJob(found); setView('detail') }
      }
    }
    load()
  }, [])

  function startApply(job: JobPosting) {
    setSelectedJob(job)
    setForm(f => ({ ...f, position_applied: job.title, outlet_preference: job.outlet || '' }))
    setView('form')
    setStep(1)
    setTimeout(() => formTopRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function selectJob(job: JobPosting) {
    setSelectedJob(job)
    setView('detail')
    window.scrollTo({ top: 0, behavior: 'smooth' })

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    setFileError('')
    const newFiles = [...files]
    for (const file of selected) {
      if (file.type !== 'application/pdf') { setFileError('Hanya file PDF.'); continue }
      if (file.size > 3 * 1024 * 1024) { setFileError(`${file.name} melebihi 3MB.`); continue }
      if (newFiles.length >= 2) { setFileError('Maksimal 2 file.'); break }
      if (!newFiles.find(f => f.name === file.name)) newFiles.push(file)
    }
    setFiles(newFiles)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const payload = {
      full_name: form.full_name, email: form.email, phone: form.phone,
      birth_date: form.birth_date || null, domicile: form.domicile || null,
      instagram_url: form.instagram_url ? `@${form.instagram_url}` : null,
      position_applied: form.position_applied,
      outlet_preference: form.outlet_preference || null,
      job_posting_id: selectedJob?.id || null,
      source: 'Portal',
      has_cafe_experience: form.has_cafe_experience,
      cafe_experience_years: parseFloat(form.cafe_experience_years) || 0,
      cafe_experience_detail: form.cafe_experience_detail || null,
      has_barista_cert: form.has_barista_cert,
      cert_detail: form.cert_detail || null,
      education_level: form.education_level || null,
      hr_notes: form.motivation || null,
      status: 'new',
      pipeline_stage: 'baru_masuk',
    }
    const { data, error: err } = await supabase.from('applicants').insert([payload]).select().single()
    if (err) { setError('Terjadi kesalahan. Coba lagi.'); setLoading(false); return }

    if (files.length > 0 && data) {
      for (const file of files) {
        await supabase.storage.from('documents').upload(`applicants/${data.id}/${file.name}`, file)
      }
    }

    // Update applicant count on job posting
    if (selectedJob) {
      await supabase.from('job_postings').update({ applicant_count: (selectedJob.applicant_count || 0) + 1 }).eq('id', selectedJob.id)
    }

    fetch('/api/quest/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicant_id: data.id }) }).catch(() => {})
    fetch('/api/notify/new-applicant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicant: payload }) }).catch(() => {})

    setSubmitted(true)
  }

  const inp = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
  const ist = { border: '1.5px solid #D4CFC9', backgroundColor: '#FAFAF9', color: '#020000' }
  const foc = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.target.style.borderColor = '#037894'; e.target.style.boxShadow = '0 0 0 3px rgba(3,120,148,0.08)' },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.target.style.borderColor = '#D4CFC9'; e.target.style.boxShadow = 'none' }
  }

  // Header — shared
  const Header = () => (
    <div style={{ backgroundColor: '#020000', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
      <div>
        <span style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', fontStyle: 'italic' }}>Strada</span>
        <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '3px', color: '#037894', textTransform: 'uppercase', marginLeft: '6px' }}>COFFEE</span>
      </div>
      <a href="https://stradacoffee.com" style={{ fontSize: '12px', color: 'rgba(228,222,216,0.45)', textDecoration: 'none' }}>stradacoffee.com ↗</a>
    </div>
  )

  // SUCCESS
  if (submitted) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>
      <Header />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#037894', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg style={{ width: '36px', height: '36px', color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#020000', margin: '0 0 8px' }}>Lamaran Terkirim!</h2>
          {selectedJob && <p style={{ fontSize: '14px', color: '#037894', fontWeight: 600, margin: '0 0 8px' }}>{selectedJob.title} · {selectedJob.location}</p>}
          <p style={{ fontSize: '14px', color: '#4C4845', margin: '0 0 6px' }}>Terima kasih, <strong>{form.full_name}</strong>.</p>
          <p style={{ fontSize: '13px', color: '#8A8A8D', margin: '0 0 28px', lineHeight: 1.6 }}>Tim HR kami akan menghubungi kamu dalam 3–5 hari kerja jika profil kamu sesuai.</p>
          <a href="https://stradacoffee.com" style={{ display: 'inline-block', padding: '12px 32px', borderRadius: '12px', backgroundColor: '#020000', color: '#fff', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>← Kembali ke Strada Coffee</a>
        </div>
      </div>
    </div>
  )

  // JOB DETAIL VIEW
  if (view === 'detail' && selectedJob) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>
      <Header />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>
        <button onClick={() => setView('jobs')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#8A8A8D', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '24px' }}>
          <ArrowLeft size={14} /> Semua posisi
        </button>

        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1.5px solid #E8E4E0', padding: '28px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', letterSpacing: '1px' }}>{selectedJob.job_id}</span>
                {selectedJob.is_urgent && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 10px', borderRadius: '6px', backgroundColor: '#FFF0EE', color: '#FF4F31' }}>URGENT</span>}
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#020000', margin: '0 0 4px' }}>{selectedJob.title}</h1>
              <p style={{ fontSize: '14px', color: '#037894', fontWeight: 600, margin: 0 }}>{selectedJob.department} · {selectedJob.entity.replace('_', ' ')}</p>
            </div>
            {selectedJob.salary_display && (
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#005353', backgroundColor: '#E6F4F1', padding: '8px 16px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                {selectedJob.salary_display}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', paddingTop: '16px', borderTop: '1px solid #F0EEEC' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4C4845' }}>
              <MapPin size={13} color="#037894" /> {selectedJob.location}{selectedJob.outlet ? ` · ${selectedJob.outlet}` : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4C4845' }}>
              <Clock size={13} color="#037894" /> {selectedJob.employment_type}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4C4845' }}>
              <Users size={13} color="#037894" /> {selectedJob.applicant_count || 0} pelamar
            </span>
            {selectedJob.min_experience_years > 0 && (
              <span style={{ fontSize: '13px', color: '#4C4845' }}>Min. {selectedJob.min_experience_years} thn pengalaman</span>
            )}
            {selectedJob.deadline && (
              <span style={{ fontSize: '13px', color: '#DE9733', fontWeight: 600 }}>
                Deadline: {new Date(selectedJob.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
          {selectedJob.description && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', padding: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Tentang Posisi Ini</h3>
              <p style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedJob.description}</p>
            </div>
          )}
          {selectedJob.responsibilities && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', padding: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Tanggung Jawab</h3>
              <div style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.8 }}>
                {selectedJob.responsibilities.split('\n').map((line: string, i: number) => (
                  <p key={i} style={{ margin: '0 0 6px' }}>{line}</p>
                ))}
              </div>
            </div>
          )}
          {selectedJob.requirements && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', padding: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Persyaratan</h3>
              <div style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.8 }}>
                {selectedJob.requirements.split('\n').map((line: string, i: number) => (
                  <p key={i} style={{ margin: '0 0 6px' }}>{line}</p>
                ))}
              </div>
            </div>
          )}
          {selectedJob.benefits && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', padding: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Benefit</h3>
              <div style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.8 }}>
                {selectedJob.benefits.split('\n').map((line: string, i: number) => (
                  <p key={i} style={{ margin: '0 0 6px' }}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', bottom: '20px' }}>
          <button onClick={() => startApply(selectedJob)}
            style={{ width: '100%', padding: '16px', borderRadius: '14px', backgroundColor: '#020000', color: '#fff', fontWeight: 800, fontSize: '16px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(2,0,0,0.25)' }}>
            Apply untuk Posisi Ini →
          </button>
        </div>
      </div>
    </div>
  )

  // JOB LISTING VIEW
  if (view === 'jobs') return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>
      <Header />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: '#037894', textTransform: 'uppercase', margin: '0 0 8px' }}>Karir</p>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#020000', margin: '0 0 8px' }}>Posisi yang Tersedia</h1>
          <p style={{ fontSize: '14px', color: '#8A8A8D', margin: 0 }}>Pilih posisi yang sesuai dengan passion dan keahlian kamu</p>
        </div>

        {loadingJobs ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#8A8A8D', fontSize: '14px' }}>Memuat posisi tersedia...</div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#fff', borderRadius: '20px', border: '1.5px solid #E8E4E0' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>☕</p>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#020000', marginBottom: '6px' }}>Belum ada posisi terbuka</p>
            <p style={{ fontSize: '13px', color: '#8A8A8D' }}>Cek kembali dalam beberapa waktu atau kirim CV ke karir@stradacoffee.com</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jobs.map(job => (
              <div key={job.id} style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', padding: '20px 24px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#037894'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(3,120,148,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E8E4E0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#8A8A8D', letterSpacing: '1px' }}>{job.job_id}</span>
                      {job.is_urgent && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FFF0EE', color: '#FF4F31' }}>URGENT</span>}
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#020000', margin: '0 0 4px' }}>{job.title}</h3>
                    <p style={{ fontSize: '13px', color: '#037894', fontWeight: 600, margin: '0 0 10px' }}>{job.department} · {job.entity.replace('_', ' ')}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#4C4845' }}>
                        <MapPin size={11} color="#8A8A8D" /> {job.location}{job.outlet ? ` · ${job.outlet}` : ''}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#4C4845' }}>
                        <Clock size={11} color="#8A8A8D" /> {job.employment_type}
                      </span>
                      {job.salary_display && (
                        <span style={{ fontSize: '12px', color: '#005353', fontWeight: 600 }}>{job.salary_display}</span>
                      )}
                      {job.min_experience_years > 0 && (
                        <span style={{ fontSize: '12px', color: '#4C4845' }}>Min. {job.min_experience_years} thn pengalaman</span>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: '#4C4845', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {job.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#8A8A8D' }}>
                      <Users size={11} /> {job.applicant_count} pelamar
                    </div>
                    {job.deadline && (
                      <p style={{ fontSize: '11px', color: '#DE9733', margin: 0 }}>
                        Deadline: {new Date(job.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                    <button onClick={() => selectJob(job)}
                      style={{ padding: '10px 24px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Apply Now →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <p style={{ fontSize: '13px', color: '#8A8A8D' }}>
            Tidak menemukan posisi yang tepat?{' '}
            <a href="mailto:karir@stradacoffee.com" style={{ color: '#037894', fontWeight: 600 }}>Kirim CV ke karir@stradacoffee.com</a>
          </p>
        </div>
      </div>
    </div>
  )

  // FORM VIEW
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }} ref={formTopRef}>
      <Header />

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* Back + job info */}
        <div style={{ marginBottom: '24px' }}>
          <button onClick={() => setView('jobs')} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#8A8A8D', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '16px' }}>
            <ArrowLeft size={14} /> Semua posisi
          </button>
          {selectedJob && (
            <div style={{ padding: '16px 20px', borderRadius: '14px', backgroundColor: '#fff', border: '1.5px solid rgba(3,120,148,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', letterSpacing: '1px', margin: '0 0 3px' }}>{selectedJob.job_id}</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#020000', margin: '0 0 3px' }}>{selectedJob.title}</p>
                  <p style={{ fontSize: '12px', color: '#037894', margin: 0 }}>{selectedJob.location}{selectedJob.outlet ? ` · ${selectedJob.outlet}` : ''}</p>
                </div>
                {selectedJob.salary_display && (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#005353', backgroundColor: '#E6F4F1', padding: '4px 10px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                    {selectedJob.salary_display}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Progress */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: '#8A8A8D', margin: '0 0 12px' }}>
            Langkah {step} dari 3 — {['Data Diri', 'Pengalaman', 'Finalisasi'][step - 1]}
          </p>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ flex: 1, height: '4px', borderRadius: '4px', backgroundColor: step >= s ? '#037894' : '#E8E4E0', transition: 'background 0.2s' }} />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* STEP 1 */}
          {step === 1 && (
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '28px', border: '1.5px solid #E8E4E0', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#020000', margin: '0 0 20px' }}>Data Diri</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '5px' }}>Nama Lengkap <span style={{ color: '#FF4F31' }}>*</span></label>
                  <input className={inp} style={ist} {...foc} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Sesuai KTP" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '5px' }}>Email <span style={{ color: '#FF4F31' }}>*</span></label>
                    <input type="email" className={inp} style={ist} {...foc} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@kamu.com" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '5px' }}>No. HP <span style={{ color: '#FF4F31' }}>*</span></label>
                    <input className={inp} style={ist} {...foc} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08xxxxxxxxxx" required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '5px' }}>Tanggal Lahir</label>
                    <input type="date" className={inp} style={ist} {...foc} value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '5px' }}>Domisili</label>
                    <input className={inp} style={ist} {...foc} value={form.domicile} onChange={e => set('domicile', e.target.value)} placeholder="Kota kamu" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '5px' }}>Instagram</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#8A8A8D' }}>@</span>
                    <input className={inp} style={{ ...ist, paddingLeft: '32px' }} {...foc} value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)} placeholder="username_kamu" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '5px' }}>Pendidikan Terakhir</label>
                  <select className={inp} style={ist} {...foc} value={form.education_level} onChange={e => set('education_level', e.target.value)}>
                    <option value="">Pilih pendidikan</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA/SMK</option>
                    <option value="D3">D3</option>
                    <option value="S1">S1</option>
                    <option value="S2">S2+</option>
                  </select>
                </div>
              </div>
              {error && <p style={{ fontSize: '13px', color: '#FF4F31', marginTop: '12px' }}>{error}</p>}
              <button type="button" onClick={() => {
                if (!form.full_name || !form.email || !form.phone) { setError('Lengkapi nama, email, dan nomor HP'); return }
                setError(''); setStep(2)
              }} style={{ width: '100%', marginTop: '20px', padding: '14px', borderRadius: '12px', backgroundColor: '#037894', color: '#fff', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer' }}>
                Lanjut →
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '28px', border: '1.5px solid #E8E4E0', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#020000', margin: '0 0 20px' }}>Posisi & Pengalaman</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Position — prefilled if from job card */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '5px' }}>Posisi yang Dilamar <span style={{ color: '#FF4F31' }}>*</span></label>
                  {selectedJob ? (
                    <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: 'rgba(3,120,148,0.05)', border: '1.5px solid rgba(3,120,148,0.2)', fontSize: '14px', fontWeight: 600, color: '#037894' }}>
                      {selectedJob.title} — {selectedJob.job_id}
                    </div>
                  ) : (
                    <select className={inp} style={ist} {...foc} value={form.position_applied} onChange={e => set('position_applied', e.target.value)} required>
                      <option value="">Pilih posisi</option>
                      <option value="Barista">Barista</option>
                      <option value="Senior Barista">Senior Barista</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Kitchen Staff">Kitchen Staff</option>
                      <option value="Trainer">Trainer / Academy</option>
                      <option value="Roastery Staff">Roastery Staff</option>
                      <option value="HO Staff">HO Staff</option>
                    </select>
                  )}
                </div>

                {!selectedJob && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '5px' }}>Preferensi Outlet</label>
                    <select className={inp} style={ist} {...foc} value={form.outlet_preference} onChange={e => set('outlet_preference', e.target.value)}>
                      <option value="">Tidak ada preferensi</option>
                      {['Kelapa Gading', 'MKG', 'BSD', 'SMS', 'SMB Gold Lounge', 'Semarang'].map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Cafe experience toggle */}
                <div style={{ padding: '16px', borderRadius: '14px', backgroundColor: '#F7F5F2', border: '1px solid #E8E4E0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#020000', margin: '0 0 2px' }}>Pengalaman di kafe?</p>
                      <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>Specialty / coffee shop</p>
                    </div>
                    <button type="button" onClick={() => set('has_cafe_experience', !form.has_cafe_experience)}
                      style={{ width: '46px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: form.has_cafe_experience ? '#037894' : '#D4CFC9', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', top: '3px', width: '20px', height: '20px', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: form.has_cafe_experience ? 'translateX(23px)' : 'translateX(3px)' }} />
                    </button>
                  </div>
                  {form.has_cafe_experience && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E8E4E0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <select className={inp} style={ist} {...foc} value={form.cafe_experience_years} onChange={e => set('cafe_experience_years', e.target.value)}>
                        <option value="0.5">Kurang dari 1 tahun</option>
                        <option value="1">1 tahun</option>
                        <option value="2">2 tahun</option>
                        <option value="3">3 tahun</option>
                        <option value="5">4–5 tahun</option>
                        <option value="6">Lebih dari 5 tahun</option>
                      </select>
                      <input className={inp} style={ist} {...foc} value={form.cafe_experience_detail} onChange={e => set('cafe_experience_detail', e.target.value)} placeholder="Di kafe mana saja?" />
                    </div>
                  )}
                </div>

                {/* Cert toggle */}
                <div style={{ padding: '16px', borderRadius: '14px', backgroundColor: '#F7F5F2', border: '1px solid #E8E4E0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#020000', margin: '0 0 2px' }}>Punya sertifikasi barista?</p>
                      <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>SCA, SCAI, atau lainnya</p>
                    </div>
                    <button type="button" onClick={() => set('has_barista_cert', !form.has_barista_cert)}
                      style={{ width: '46px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: form.has_barista_cert ? '#037894' : '#D4CFC9', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', top: '3px', width: '20px', height: '20px', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: form.has_barista_cert ? 'translateX(23px)' : 'translateX(3px)' }} />
                    </button>
                  </div>
                  {form.has_barista_cert && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E8E4E0' }}>
                      <input className={inp} style={ist} {...foc} value={form.cert_detail} onChange={e => set('cert_detail', e.target.value)} placeholder="Nama sertifikasi dan tahun" />
                    </div>
                  )}
                </div>
              </div>
              {error && <p style={{ fontSize: '13px', color: '#FF4F31', marginTop: '12px' }}>{error}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setStep(1)} style={{ padding: '14px', borderRadius: '12px', border: '1.5px solid #D4CFC9', backgroundColor: 'transparent', color: '#4C4845', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>← Kembali</button>
                <button type="button" onClick={() => {
                  if (!form.position_applied && !selectedJob) { setError('Pilih posisi'); return }
                  setError(''); setStep(3)
                }} style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#037894', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer' }}>Lanjut →</button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '28px', border: '1.5px solid #E8E4E0', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#020000', margin: '0 0 20px' }}>Finalisasi</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '5px' }}>Kenapa ingin bergabung dengan Strada?</label>
                  <textarea className={inp} style={{ ...ist, resize: 'none' }} {...foc} value={form.motivation} onChange={e => set('motivation', e.target.value)} rows={4} placeholder="Ceritakan motivasimu..." />
                </div>

                {/* Upload CV */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '4px' }}>Upload CV</label>
                  <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '0 0 10px' }}>PDF · Maks 3MB · Maks 2 file</p>
                  {files.length < 2 && (
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', borderRadius: '14px', border: '2px dashed #D4CFC9', backgroundColor: '#FAFAF9', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#037894'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#D4CFC9'}>
                      <svg style={{ width: '28px', height: '28px', color: '#037894', marginBottom: '8px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#037894', margin: '0 0 2px' }}>Klik untuk upload PDF</p>
                      <input ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display: 'none' }} onChange={handleFileAdd} />
                    </label>
                  )}
                  {files.map(f => (
                    <div key={f.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(3,120,148,0.05)', border: '1px solid rgba(3,120,148,0.15)', marginTop: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#020000' }}>{f.name} <span style={{ color: '#8A8A8D' }}>({(f.size / 1024 / 1024).toFixed(1)}MB)</span></span>
                      <button type="button" onClick={() => setFiles(fs => fs.filter(x => x.name !== f.name))} style={{ fontSize: '12px', fontWeight: 600, color: '#FF4F31', background: 'none', border: 'none', cursor: 'pointer' }}>Hapus</button>
                    </div>
                  ))}
                  {fileError && <p style={{ fontSize: '12px', color: '#FF4F31', marginTop: '6px' }}>{fileError}</p>}
                </div>

                {/* Summary */}
                <div style={{ padding: '16px', borderRadius: '14px', backgroundColor: '#F7F5F2' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#8A8A8D', textTransform: 'uppercase', margin: '0 0 10px' }}>Ringkasan</p>
                  {[
                    ['Nama', form.full_name],
                    ['Posisi', selectedJob ? `${selectedJob.title} (${selectedJob.job_id})` : form.position_applied],
                    ['Lokasi', selectedJob ? `${selectedJob.location}${selectedJob.outlet ? ` · ${selectedJob.outlet}` : ''}` : '-'],
                    ['Pengalaman', form.has_cafe_experience ? `${form.cafe_experience_years} thn` : 'Belum ada'],
                    ['Dokumen', files.length > 0 ? `${files.length} file` : 'Tidak ada'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #E8E4E0' }}>
                      <span style={{ fontSize: '12px', color: '#8A8A8D' }}>{k}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#020000' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FFF0EE', color: '#FF4F31', fontSize: '13px', marginTop: '12px' }}>{error}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setStep(2)} style={{ padding: '14px', borderRadius: '12px', border: '1.5px solid #D4CFC9', backgroundColor: 'transparent', color: '#4C4845', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>← Kembali</button>
                <button type="submit" disabled={loading} style={{ padding: '14px', borderRadius: '12px', backgroundColor: loading ? '#8A8A8D' : '#020000', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Mengirim...' : 'Kirim Lamaran ☕'}
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: '11px', color: '#8A8A8D', marginTop: '12px' }}>Data kamu aman dan hanya untuk proses rekrutmen Strada Coffee.</p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}