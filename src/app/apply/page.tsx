'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter as useNextRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ApplyContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const nextRouter = useNextRouter()
  const jobParam = searchParams.get('job')

  const [jobs, setJobs] = useState<any[]>([])
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [step, setStep] = useState(1)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    domicile: '',
    position_applied: '',
    outlet_preference: '',
    has_cafe_experience: false,
    cafe_experience_years: 0,
    cafe_experience_detail: '',
    has_barista_cert: false,
    cert_detail: '',
    education_level: '',
    instagram_url: '',
    hr_notes: '',
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { loadJobs() }, [])

  async function loadJobs() {
    const { data } = await supabase
      .from('job_postings')
      .select('id, job_id, title, department, location, outlet, employment_type, salary_display, description, requirements, is_urgent')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (data) {
      setJobs(data)
      if (jobParam) {
        const found = data.find((j: any) => j.job_id === jobParam)
        if (found) {
          setSelectedJob(found)
          setForm(f => ({ ...f, position_applied: found.title, outlet_preference: found.outlet || found.location }))
        } else {
          const { data: specificJob } = await supabase
            .from('job_postings')
            .select('id, job_id, title, department, location, outlet, employment_type, salary_display, description, requirements, is_urgent, is_active')
            .eq('job_id', jobParam)
            .single()
          if (specificJob) {
            setSelectedJob(specificJob)
            setForm(f => ({ ...f, position_applied: specificJob.title, outlet_preference: specificJob.outlet || specificJob.location }))
          }
        }
      }
    }
    setLoading(false)
  }

  function selectJob(job: any) {
    setSelectedJob(job)
    setForm(f => ({ ...f, position_applied: job.title, outlet_preference: job.outlet || job.location }))
    setStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const { data: newApplicant } = await supabase
        .from('applicants')
        .insert([{
          ...form,
          job_posting_id: selectedJob?.id ?? null,
          source: 'website',
          status: 'new',
          pipeline_stage: 'baru_masuk',
        }])
        .select('id')
        .single()

      if (newApplicant?.id) {
        await supabase.from('applicant_quest_scores').insert([{
          applicant_id: newApplicant.id,
          status: 'pending',
        }])
        try {
          await fetch('/api/notify/new-applicant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicant_id: newApplicant.id,
              ...form,
              position_applied: form.position_applied || selectedJob?.title || '-',
            }),
          })
        } catch { /* non-blocking */ }
        try {
          fetch('/api/quest/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ applicant_id: newApplicant.id }),
          })
        } catch { /* non-blocking */ }
      }
      setSubmitted(true)
    } catch {
      alert('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── shared styles ─────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: '14px',
    border: '1.5px solid #E8E4E0', fontSize: '16px', outline: 'none',
    backgroundColor: '#fff', boxSizing: 'border-box',
    color: '#020000', fontFamily: 'inherit', WebkitAppearance: 'none',
  }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 700, color: '#4C4845', marginBottom: '8px' }
  const btn: React.CSSProperties = { width: '100%', padding: '16px', borderRadius: '14px', fontSize: '16px', fontWeight: 700, border: 'none', cursor: 'pointer', minHeight: '52px' }

  // ── SUCCESS ────────────────────────────────────────────────
  if (submitted) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '40px 28px', maxWidth: '460px', width: '100%', textAlign: 'center', border: '1.5px solid #E8E4E0', boxShadow: '0 4px 32px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#020000', margin: '0 0 12px', lineHeight: 1.2 }}>Lamaran Terkirim!</h2>
        <p style={{ fontSize: '15px', color: '#4C4845', lineHeight: 1.7, margin: '0 0 8px' }}>
          Terima kasih <strong>{form.full_name}</strong>! Lamaran untuk posisi <strong>{form.position_applied}</strong> sudah kami terima.
        </p>
        <p style={{ fontSize: '14px', color: '#8A8A8D', lineHeight: 1.6, margin: 0 }}>
          Tim HR Strada Coffee akan menghubungi kamu di nomor <strong>{form.phone}</strong> dalam 3–5 hari kerja.
        </p>
        <div style={{ marginTop: '24px', padding: '16px', borderRadius: '14px', backgroundColor: 'rgba(3,120,148,0.06)', border: '1px solid rgba(3,120,148,0.15)' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#037894', fontWeight: 700 }}>✦ Quest AI sedang menganalisa profil kamu</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8A8A8D' }}>Seleksi awal dilakukan secara otomatis oleh AI</p>
        </div>
        <div style={{ marginTop: '24px', padding: '12px 0', borderTop: '1px solid #F0EEEC' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#8A8A8D', fontStyle: 'italic' }}>strada coffee · est. 2012</p>
        </div>
      </div>
    </div>
  )

  // ── LOADING ────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8A8A8D', fontSize: '15px' }}>Memuat posisi tersedia...</p>
    </div>
  )

  // ── JOB LIST ───────────────────────────────────────────────
  if (!selectedJob) return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
        .job-card { transition: all 0.15s; cursor: pointer; }
        .job-card:hover { border-color: #037894 !important; box-shadow: 0 4px 20px rgba(3,120,148,0.12) !important; transform: translateY(-1px); }
        .job-card:active { transform: scale(0.99); }
        @media (max-width: 480px) {
          .job-meta { flex-direction: column !important; gap: 4px !important; }
          .job-lamar-btn { padding: 10px 14px !important; font-size: 13px !important; }
        }
      `}</style>
      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>

        {/* Header */}
        <div style={{ backgroundColor: '#020000', padding: '28px 20px 24px', textAlign: 'center' }}>
          <img src="/strada-logo.svg" alt="Strada Coffee" style={{ height: '44px', width: 'auto', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(228,222,216,0.6)', margin: 0, letterSpacing: '1px' }}>Bergabunglah bersama tim kami</p>
        </div>

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '28px 16px 48px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#020000', margin: '0 0 6px' }}>Posisi yang Tersedia</h1>
            <p style={{ fontSize: '14px', color: '#8A8A8D', margin: 0 }}>
              {jobs.length > 0 ? `${jobs.length} posisi terbuka · Pilih yang sesuai passion kamu` : 'Belum ada posisi terbuka saat ini'}
            </p>
          </div>

          {jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#fff', borderRadius: '20px', border: '1.5px solid #E8E4E0' }}>
              <p style={{ fontSize: '40px', margin: '0 0 12px' }}>☕</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#020000', margin: '0 0 8px' }}>Belum ada posisi terbuka</p>
              <p style={{ fontSize: '14px', color: '#8A8A8D', margin: 0, lineHeight: 1.6 }}>Pantau terus halaman ini untuk lowongan terbaru dari Strada Coffee.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {jobs.map(job => (
                <div key={job.id} className="job-card"
                  onClick={() => nextRouter.push(`/jobs/${job.job_id}`)}
                  style={{ backgroundColor: '#fff', borderRadius: '18px', padding: '20px', border: '1.5px solid #E8E4E0' }}>

                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#020000', margin: 0, lineHeight: 1.2 }}>{job.title}</h3>
                        {job.is_urgent && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#FFF0EE', color: '#FF4F31', flexShrink: 0 }}>URGENT</span>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', color: '#037894', fontWeight: 700, margin: 0 }}>{job.department}</p>
                    </div>
                    <div className="job-lamar-btn" style={{ flexShrink: 0, padding: '10px 18px', borderRadius: '12px', backgroundColor: '#037894', color: '#fff', fontSize: '14px', fontWeight: 700, minHeight: '44px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                      Lihat →
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="job-meta" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#4C4845', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📍 {job.location}{job.outlet ? ` · ${job.outlet}` : ''}
                    </span>
                    <span style={{ fontSize: '13px', color: '#4C4845', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ⏰ {job.employment_type}
                    </span>
                    {job.salary_display && (
                      <span style={{ fontSize: '13px', color: '#4C4845', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        💰 {job.salary_display}
                      </span>
                    )}
                  </div>

                  {/* Short description */}
                  {job.description && (
                    <p style={{ fontSize: '13px', color: '#8A8A8D', margin: '10px 0 0', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {job.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#8A8A8D', margin: '32px 0 0', fontStyle: 'italic' }}>
            strada coffee · CV Kopi Terbaik Nusantara · est. 2012
          </p>
        </div>
      </div>
    </>
  )

  // ── FORM ───────────────────────────────────────────────────
  const STEPS = ['Data Diri', 'Pengalaman', 'Motivasi']

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; background: #F7F5F2; }
        input, select, textarea { -webkit-appearance: none; appearance: none; }
        input:focus, select:focus, textarea:focus { border-color: #037894 !important; box-shadow: 0 0 0 3px rgba(3,120,148,0.1); }
        .apply-back:hover { color: rgba(228,222,216,0.9) !important; }
        .apply-secondary:hover { background: #E8E4E0 !important; }
        .apply-primary:hover:not(:disabled) { background: #026a80 !important; }
        .apply-submit:hover:not(:disabled) { background: #1a1818 !important; }
        @media (max-width: 540px) {
          .form-row-2 { grid-template-columns: 1fr !important; }
          .form-btn-row { flex-direction: column-reverse !important; }
          .form-btn-row button { flex: none !important; width: 100% !important; }
          .apply-summary-label { width: 100px !important; font-size: 12px !important; }
          .apply-summary-value { font-size: 12px !important; }
          .step-label { font-size: 10px !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>

        {/* Header */}
        <div style={{ backgroundColor: '#020000', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => setSelectedJob(null)} className="apply-back"
            style={{ color: 'rgba(228,222,216,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', padding: '4px 8px 4px 0', lineHeight: 1, flexShrink: 0, transition: 'color 0.15s' }}>
            ←
          </button>
          <img src="/strada-logo.svg" alt="Strada Coffee" style={{ height: '32px', width: 'auto' }} />
        </div>

        {/* Job banner */}
        <div style={{ backgroundColor: 'rgba(3,120,148,0.07)', borderBottom: '1px solid rgba(3,120,148,0.15)', padding: '12px 20px' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#8A8A8D' }}>Melamar untuk</p>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#037894', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedJob.title}
                {selectedJob.outlet && <span style={{ fontSize: '12px', fontWeight: 500, color: '#8A8A8D' }}> · {selectedJob.outlet}</span>}
                {!selectedJob.is_active && <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FEF8E6', color: '#DE9733', fontWeight: 700 }}>PREVIEW</span>}
              </p>
            </div>
            {!jobParam && (
              <button onClick={() => setSelectedJob(null)}
                style={{ fontSize: '12px', color: '#037894', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '4px' }}>
                Ganti
              </button>
            )}
          </div>
        </div>

        {/* Progress stepper */}
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #F0EEEC', padding: '16px 20px' }}>
          <div style={{ display: 'flex', maxWidth: '400px', margin: '0 auto' }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {i > 0 && (
                  <div style={{ position: 'absolute', left: '-50%', top: '15px', width: '100%', height: '2px', backgroundColor: step > i ? '#037894' : '#E8E4E0', transition: 'background-color 0.3s' }} />
                )}
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, position: 'relative', zIndex: 1, transition: 'all 0.3s', backgroundColor: step > i + 1 ? '#037894' : step === i + 1 ? '#020000' : '#F0EEEC', color: step >= i + 1 ? '#fff' : '#8A8A8D' }}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className="step-label" style={{ fontSize: '11px', marginTop: '5px', color: step === i + 1 ? '#020000' : '#8A8A8D', fontWeight: step === i + 1 ? 700 : 400, textAlign: 'center' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form content */}
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 16px 48px' }}>

          {/* ── STEP 1: Data Diri ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#020000', margin: '0 0 4px' }}>Data Diri</h2>
                <p style={{ fontSize: '13px', color: '#8A8A8D', margin: 0 }}>Semua kolom bertanda * wajib diisi</p>
              </div>

              <div>
                <label style={lbl}>Nama Lengkap <span style={{ color: '#FF4F31' }}>*</span></label>
                <input style={inp} value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  placeholder="Sesuai KTP" autoComplete="name" />
              </div>

              <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>Email <span style={{ color: '#FF4F31' }}>*</span></label>
                  <input type="email" style={inp} value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="email@kamu.com" autoComplete="email" inputMode="email" />
                </div>
                <div>
                  <label style={lbl}>No. HP <span style={{ color: '#FF4F31' }}>*</span></label>
                  <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="08xxxxxxxxxx" autoComplete="tel" inputMode="tel" />
                </div>
              </div>

              <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>Tanggal Lahir</label>
                  <input type="date" style={inp} value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Domisili <span style={{ color: '#FF4F31' }}>*</span></label>
                  <input style={inp} value={form.domicile} onChange={e => set('domicile', e.target.value)}
                    placeholder="Kota, Kecamatan" />
                </div>
              </div>

              <div>
                <label style={lbl}>Pendidikan Terakhir</label>
                <select style={{ ...inp, color: form.education_level ? '#020000' : '#8A8A8D' }} value={form.education_level} onChange={e => set('education_level', e.target.value)}>
                  <option value="">Pilih pendidikan...</option>
                  <option value="SMA">SMA / SMK</option>
                  <option value="D3">D3</option>
                  <option value="S1">S1</option>
                  <option value="S2">S2 ke atas</option>
                </select>
              </div>

              <button onClick={() => {
                if (!form.full_name || !form.email || !form.phone || !form.domicile) {
                  alert('Lengkapi data wajib terlebih dahulu (Nama, Email, HP, Domisili)')
                  return
                }
                setStep(2)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }} className="apply-primary" style={{ ...btn, backgroundColor: '#037894', color: '#fff', transition: 'background-color 0.15s' }}>
                Lanjut ke Pengalaman →
              </button>
            </div>
          )}

          {/* ── STEP 2: Pengalaman ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#020000', margin: '0 0 4px' }}>Pengalaman Kerja</h2>
                <p style={{ fontSize: '13px', color: '#8A8A8D', margin: 0 }}>Tidak punya pengalaman? Tetap bisa melamar!</p>
              </div>

              {/* Cafe experience toggle */}
              <div style={{ padding: '18px', borderRadius: '16px', backgroundColor: '#fff', border: '1.5px solid #E8E4E0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: '#020000' }}>Pengalaman di kafe / F&B?</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#8A8A8D' }}>Termasuk restoran, coffee shop, hotel</p>
                  </div>
                  <button type="button" onClick={() => set('has_cafe_experience', !form.has_cafe_experience)}
                    style={{ width: '52px', height: '30px', borderRadius: '15px', border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: form.has_cafe_experience ? '#037894' : '#D4CFC9', flexShrink: 0, transition: 'background-color 0.2s' }}>
                    <span style={{ position: 'absolute', top: '4px', width: '22px', height: '22px', backgroundColor: '#fff', borderRadius: '50%', transition: 'transform 0.2s', transform: form.has_cafe_experience ? 'translateX(24px)' : 'translateX(4px)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                  </button>
                </div>
                {form.has_cafe_experience && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F0EEEC' }}>
                    <div>
                      <label style={lbl}>Berapa lama?</label>
                      <select style={inp} value={form.cafe_experience_years} onChange={e => set('cafe_experience_years', parseFloat(e.target.value))}>
                        <option value="0">Kurang dari 6 bulan</option>
                        <option value="0.5">6 bulan – 1 tahun</option>
                        <option value="1">1 tahun</option>
                        <option value="1.5">1,5 tahun</option>
                        <option value="2">2 tahun</option>
                        <option value="3">3 tahun</option>
                        <option value="4">4 tahun</option>
                        <option value="5">5 tahun ke atas</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Di mana saja?</label>
                      <input style={inp} value={form.cafe_experience_detail} onChange={e => set('cafe_experience_detail', e.target.value)}
                        placeholder="Nama tempat atau kota" />
                    </div>
                  </div>
                )}
              </div>

              {/* Barista cert toggle */}
              <div style={{ padding: '18px', borderRadius: '16px', backgroundColor: '#fff', border: '1.5px solid #E8E4E0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: '#020000' }}>Punya sertifikasi barista?</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#8A8A8D' }}>SCA, SCAI, atau lainnya</p>
                  </div>
                  <button type="button" onClick={() => set('has_barista_cert', !form.has_barista_cert)}
                    style={{ width: '52px', height: '30px', borderRadius: '15px', border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: form.has_barista_cert ? '#037894' : '#D4CFC9', flexShrink: 0, transition: 'background-color 0.2s' }}>
                    <span style={{ position: 'absolute', top: '4px', width: '22px', height: '22px', backgroundColor: '#fff', borderRadius: '50%', transition: 'transform 0.2s', transform: form.has_barista_cert ? 'translateX(24px)' : 'translateX(4px)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                  </button>
                </div>
                {form.has_barista_cert && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F0EEEC' }}>
                    <label style={lbl}>Jenis sertifikasi</label>
                    <input style={inp} value={form.cert_detail} onChange={e => set('cert_detail', e.target.value)}
                      placeholder="e.g. SCA Barista Skills Foundation" />
                  </div>
                )}
              </div>

              <div>
                <label style={lbl}>Instagram <span style={{ fontSize: '12px', fontWeight: 500, color: '#8A8A8D' }}>(opsional)</span></label>
                <input style={inp} value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)}
                  placeholder="@username" autoCapitalize="none" />
              </div>

              <div className="form-btn-row" style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="apply-secondary"
                  style={{ ...btn, flex: 1, backgroundColor: '#F0EEEC', color: '#4C4845', transition: 'background-color 0.15s' }}>
                  ← Kembali
                </button>
                <button onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="apply-primary"
                  style={{ ...btn, flex: 2, backgroundColor: '#037894', color: '#fff', transition: 'background-color 0.15s' }}>
                  Lanjut →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Motivasi & Submit ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#020000', margin: '0 0 4px' }}>Pesan untuk Tim HR</h2>
                <p style={{ fontSize: '13px', color: '#8A8A8D', margin: 0 }}>Ceritakan sedikit tentang dirimu</p>
              </div>

              <div>
                <label style={lbl}>Kenapa kamu tertarik bergabung dengan Strada Coffee?</label>
                <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
                  value={form.hr_notes} onChange={e => set('hr_notes', e.target.value)}
                  rows={5} placeholder="Ceritakan motivasimu, pengalaman yang relevan, atau hal lain yang ingin disampaikan ke tim HR Strada..." />
                <p style={{ fontSize: '12px', color: '#8A8A8D', margin: '6px 0 0' }}>💡 Jawaban yang spesifik dan personal membuat lamaran kamu lebih menonjol</p>
              </div>

              {/* Summary card */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '18px', border: '1.5px solid #E8E4E0' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 14px' }}>Ringkasan Lamaran</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    ['Posisi', selectedJob?.title || form.position_applied, true],
                    ['Nama', form.full_name, false],
                    ['Email', form.email, false],
                    ['HP', form.phone, false],
                    ['Domisili', form.domicile, false],
                    ['Pendidikan', form.education_level || '-', false],
                    ['Pengalaman kafe', form.has_cafe_experience ? `${form.cafe_experience_years} tahun` : 'Belum ada', false],
                    ['Sertifikasi', form.has_barista_cert ? (form.cert_detail || 'Ada') : 'Tidak ada', false],
                  ].map(([label, value, highlight]) => (
                    <div key={label as string} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', paddingBottom: '8px', borderBottom: '1px solid #F7F5F2' }}>
                      <span className="apply-summary-label" style={{ fontSize: '12px', color: '#8A8A8D', width: '110px', flexShrink: 0, paddingTop: '1px' }}>{label as string}</span>
                      <span className="apply-summary-value" style={{ fontSize: '13px', color: highlight ? '#037894' : '#020000', fontWeight: highlight ? 800 : 500, flex: 1, wordBreak: 'break-word' }}>{value as string}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-btn-row" style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="apply-secondary"
                  style={{ ...btn, flex: 1, backgroundColor: '#F0EEEC', color: '#4C4845', transition: 'background-color 0.15s' }}>
                  ← Kembali
                </button>
                <button onClick={handleSubmit} disabled={submitting} className="apply-submit"
                  style={{ ...btn, flex: 2, backgroundColor: submitting ? '#8A8A8D' : '#020000', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background-color 0.15s' }}>
                  {submitting ? '⏳ Mengirim...' : '✓ Kirim Lamaran'}
                </button>
              </div>

              <p style={{ textAlign: 'center', fontSize: '12px', color: '#8A8A8D', margin: 0 }}>
                Dengan mengirim lamaran, kamu menyetujui penggunaan data untuk keperluan rekrutmen Strada Coffee.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#F7F5F2' }}>
        <p style={{ color: '#8A8A8D', fontSize: '15px', fontFamily: 'sans-serif' }}>Memuat...</p>
      </div>
    }>
      <ApplyContent />
    </Suspense>
  )
}
