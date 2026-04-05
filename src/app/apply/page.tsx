'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Separate component that uses useSearchParams (needs Suspense)
function ApplyContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const jobParam = searchParams.get('job') // e.g. STR-BAR-001

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

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
    // Load all active jobs
    const { data } = await supabase
      .from('job_postings')
      .select('id, job_id, title, department, location, outlet, employment_type, salary_display, description, requirements, is_urgent')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (data) {
      setJobs(data)

      // If job param provided, pre-select that job (even if not active, for preview)
      if (jobParam) {
        // Try to find in active jobs first
        const found = data.find((j: any) => j.job_id === jobParam)
        if (found) {
          setSelectedJob(found)
          setForm(f => ({ ...f, position_applied: found.title, outlet_preference: found.outlet || found.location }))
        } else {
          // Load this specific job regardless of active status (for internal preview)
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
          source: 'website',
          status: 'new',
          pipeline_stage: 'baru_masuk',
        }])
        .select('id')
        .single()

      if (newApplicant?.id) {
        // Create quest score queue
        await supabase.from('applicant_quest_scores').insert([{
          applicant_id: newApplicant.id,
          status: 'pending',
        }])

        // Notify HRD
        try {
          await fetch('/api/notify/new-applicant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ applicant_id: newApplicant.id }),
          })
        } catch { /* non-blocking */ }

        // Auto-trigger Quest scoring
        try {
          fetch('/api/quest/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ applicant_id: newApplicant.id }),
          })
        } catch { /* non-blocking */ }
      }

      setSubmitted(true)
    } catch (err) {
      alert('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  const inp = {
    width: '100%', padding: '12px 14px', borderRadius: '12px',
    border: '1.5px solid #E8E4E0', fontSize: '14px', outline: 'none',
    backgroundColor: '#fff', boxSizing: 'border-box' as const,
  }
  const lbl = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#4C4845', marginBottom: '6px' } as const

  // SUCCESS STATE
  if (submitted) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '48px 40px', maxWidth: '480px', width: '100%', textAlign: 'center', border: '1.5px solid #E8E4E0' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#020000', margin: '0 0 10px' }}>Lamaran Terkirim!</h2>
        <p style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.6, marginBottom: '8px' }}>
          Terima kasih <strong>{form.full_name}</strong>! Lamaran kamu untuk posisi <strong>{form.position_applied}</strong> sudah kami terima.
        </p>
        <p style={{ fontSize: '13px', color: '#8A8A8D', lineHeight: 1.6 }}>
          Tim HR Strada Coffee akan menghubungi kamu melalui nomor {form.phone} dalam 3–5 hari kerja.
        </p>
        <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(3,120,148,0.05)', border: '1px solid rgba(3,120,148,0.15)' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#037894', fontWeight: 600 }}>
            ✦ Quest AI sedang menganalisa profil kamu
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8A8A8D' }}>
            Proses seleksi awal dilakukan secara otomatis
          </p>
        </div>
      </div>
    </div>
  )

  // JOB LIST — if no job selected and no job param
  if (!selectedJob && !loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#020000', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '28px', fontWeight: 800, color: '#fff', fontStyle: 'italic', margin: '0 0 4px' }}>Strada Coffee</p>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '4px', color: '#037894', textTransform: 'uppercase', margin: 0 }}>Bergabung Bersama Kami</p>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#020000', margin: '0 0 6px' }}>Posisi yang Tersedia</h2>
        <p style={{ fontSize: '14px', color: '#8A8A8D', margin: '0 0 24px' }}>Pilih posisi yang sesuai dengan keahlian dan passion kamu</p>

        {jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0' }}>
            <p style={{ fontSize: '32px', marginBottom: '10px' }}>☕</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#020000' }}>Belum ada posisi terbuka saat ini</p>
            <p style={{ fontSize: '13px', color: '#8A8A8D' }}>Pantau terus halaman ini untuk update posisi terbaru.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jobs.map(job => (
              <div key={job.id}
                onClick={() => selectJob(job)}
                style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid #E8E4E0', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#037894'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(3,120,148,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E8E4E0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#020000', margin: 0 }}>{job.title}</h3>
                      {job.is_urgent && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FFF0EE', color: '#FF4F31' }}>URGENT</span>}
                    </div>
                    <p style={{ fontSize: '13px', color: '#037894', fontWeight: 600, margin: '0 0 6px' }}>{job.department}</p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: '#8A8A8D' }}>📍 {job.location}{job.outlet ? ` · ${job.outlet}` : ''}</span>
                      <span style={{ fontSize: '12px', color: '#8A8A8D' }}>⏰ {job.employment_type}</span>
                      {job.salary_display && <span style={{ fontSize: '12px', color: '#8A8A8D' }}>💰 {job.salary_display}</span>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, marginLeft: '12px', padding: '8px 16px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                    Lamar →
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // FORM — job selected
  const STEPS = ['Data Diri', 'Pengalaman', 'Dokumen']

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#020000', padding: '16px 24px' }}>
        <p style={{ fontSize: '20px', fontWeight: 800, color: '#fff', fontStyle: 'italic', margin: '0 0 2px' }}>Strada Coffee</p>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: '#037894', textTransform: 'uppercase', margin: 0 }}>Form Lamaran Kerja</p>
      </div>

      {/* Job info banner */}
      {selectedJob && (
        <div style={{ backgroundColor: 'rgba(3,120,148,0.06)', borderBottom: '1px solid rgba(3,120,148,0.15)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#8A8A8D' }}>Melamar untuk posisi: </span>
            <strong style={{ fontSize: '14px', color: '#037894' }}>{selectedJob.title}</strong>
            {selectedJob.outlet && <span style={{ fontSize: '12px', color: '#8A8A8D' }}> · {selectedJob.outlet}</span>}
            {!selectedJob.is_active && (
              <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FEF8E6', color: '#DE9733', fontWeight: 700 }}>PREVIEW</span>
            )}
          </div>
          {!jobParam && (
            <button onClick={() => setSelectedJob(null)} style={{ fontSize: '12px', color: '#8A8A8D', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Ganti posisi
            </button>
          )}
        </div>
      )}

      {/* Progress steps */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #E8E4E0', padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: '0', maxWidth: '480px', margin: '0 auto' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i > 0 && <div style={{ position: 'absolute', left: '-50%', top: '14px', width: '100%', height: '2px', backgroundColor: step > i ? '#037894' : '#E8E4E0' }} />}
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, position: 'relative', zIndex: 1, backgroundColor: step > i + 1 ? '#037894' : step === i + 1 ? '#020000' : '#F0EEEC', color: step >= i + 1 ? '#fff' : '#8A8A8D' }}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '11px', marginTop: '4px', color: step === i + 1 ? '#020000' : '#8A8A8D', fontWeight: step === i + 1 ? 700 : 400 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 20px' }}>

        {/* STEP 1: Data Diri */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: 0 }}>Data Diri</h2>
            <div>
              <label style={lbl}>Nama Lengkap <span style={{ color: '#FF4F31' }}>*</span></label>
              <input style={inp} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Sesuai KTP" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Email <span style={{ color: '#FF4F31' }}>*</span></label>
                <input type="email" style={inp} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@kamu.com" />
              </div>
              <div>
                <label style={lbl}>No. HP <span style={{ color: '#FF4F31' }}>*</span></label>
                <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08xxxxxxxxxx" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Tanggal Lahir</label>
                <input type="date" style={inp} value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Domisili <span style={{ color: '#FF4F31' }}>*</span></label>
                <input style={inp} value={form.domicile} onChange={e => set('domicile', e.target.value)} placeholder="Kelapa Gading, Jakarta" />
              </div>
            </div>
            <div>
              <label style={lbl}>Pendidikan Terakhir</label>
              <select style={inp} value={form.education_level} onChange={e => set('education_level', e.target.value)}>
                <option value="">Pilih...</option>
                <option value="SMA">SMA/SMK</option>
                <option value="D3">D3</option>
                <option value="S1">S1</option>
                <option value="S2">S2+</option>
              </select>
            </div>
            <button onClick={() => { if (!form.full_name || !form.email || !form.phone || !form.domicile) { alert('Lengkapi data wajib terlebih dahulu'); return }; setStep(2) }}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', backgroundColor: '#037894', color: '#fff', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer' }}>
              Lanjut →
            </button>
          </div>
        )}

        {/* STEP 2: Pengalaman */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: 0 }}>Pengalaman Kerja</h2>

            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#F7F5F2', border: '1px solid #E8E4E0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.has_cafe_experience ? '12px' : 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: '#020000' }}>Punya pengalaman di kafe/F&B?</label>
                <button type="button" onClick={() => set('has_cafe_experience', !form.has_cafe_experience)}
                  style={{ width: '46px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: form.has_cafe_experience ? '#037894' : '#D4CFC9', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: '3px', width: '20px', height: '20px', backgroundColor: '#fff', borderRadius: '50%', transition: 'transform 0.2s', transform: form.has_cafe_experience ? 'translateX(23px)' : 'translateX(3px)' }} />
                </button>
              </div>
              {form.has_cafe_experience && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  <div>
                    <label style={lbl}>Berapa tahun?</label>
                    <select style={inp} value={form.cafe_experience_years} onChange={e => set('cafe_experience_years', parseInt(e.target.value))}>
                      {[0, 0.5, 1, 1.5, 2, 3, 4, 5].map(y => <option key={y} value={y}>{y === 0 ? 'Kurang dari 6 bulan' : `${y} tahun`}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Di mana saja?</label>
                    <input style={inp} value={form.cafe_experience_detail} onChange={e => set('cafe_experience_detail', e.target.value)} placeholder="Nama tempat / kota" />
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#F7F5F2', border: '1px solid #E8E4E0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.has_barista_cert ? '12px' : 0 }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: '#020000' }}>Punya sertifikasi barista?</label>
                <button type="button" onClick={() => set('has_barista_cert', !form.has_barista_cert)}
                  style={{ width: '46px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: form.has_barista_cert ? '#037894' : '#D4CFC9', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: '3px', width: '20px', height: '20px', backgroundColor: '#fff', borderRadius: '50%', transition: 'transform 0.2s', transform: form.has_barista_cert ? 'translateX(23px)' : 'translateX(3px)' }} />
                </button>
              </div>
              {form.has_barista_cert && (
                <div style={{ marginTop: '12px' }}>
                  <label style={lbl}>Jenis sertifikasi</label>
                  <input style={inp} value={form.cert_detail} onChange={e => set('cert_detail', e.target.value)} placeholder="e.g. SCA Barista Skills, SCAI" />
                </div>
              )}
            </div>

            <div>
              <label style={lbl}>Instagram (opsional)</label>
              <input style={inp} value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)} placeholder="@username" />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1.5px solid #E8E4E0', backgroundColor: 'transparent', color: '#4C4845', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>← Kembali</button>
              <button onClick={() => setStep(3)} style={{ flex: 2, padding: '14px', borderRadius: '12px', backgroundColor: '#037894', color: '#fff', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer' }}>Lanjut →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Motivasi & Submit */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: 0 }}>Pesan untuk Tim HR</h2>

            <div>
              <label style={lbl}>Kenapa kamu tertarik bergabung dengan Strada Coffee?</label>
              <textarea style={{ ...inp, resize: 'vertical' }} value={form.hr_notes} onChange={e => set('hr_notes', e.target.value)} rows={5}
                placeholder="Ceritakan motivasimu, pengalaman yang relevan, atau hal lain yang ingin disampaikan ke tim HR..." />
              <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '4px 0 0' }}>Tips: jawaban yang spesifik dan personal lebih baik daripada jawaban umum</p>
            </div>

            {/* Summary */}
            <div style={{ backgroundColor: '#F7F5F2', borderRadius: '14px', padding: '16px', border: '1px solid #E8E4E0' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px' }}>Ringkasan Lamaran</p>
              {[
                ['Posisi', selectedJob?.title || form.position_applied],
                ['Nama', form.full_name],
                ['Email', form.email],
                ['HP', form.phone],
                ['Domisili', form.domicile],
                ['Pendidikan', form.education_level || '-'],
                ['Pengalaman kafe', form.has_cafe_experience ? `${form.cafe_experience_years} tahun` : 'Belum ada'],
                ['Sertifikasi', form.has_barista_cert ? form.cert_detail || 'Ada' : 'Tidak ada'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#8A8A8D', width: '130px', flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: '13px', color: '#020000', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1.5px solid #E8E4E0', backgroundColor: 'transparent', color: '#4C4845', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>← Kembali</button>
              <button onClick={handleSubmit} disabled={submitting}
                style={{ flex: 2, padding: '14px', borderRadius: '12px', backgroundColor: submitting ? '#8A8A8D' : '#020000', color: '#fff', fontWeight: 700, fontSize: '15px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Mengirim...' : '✓ Kirim Lamaran'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: '#8A8A8D', fontSize: '14px' }}>Memuat...</p>
      </div>
    }>
      <ApplyContent />
    </Suspense>
  )
}
