'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter as useNextRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Clock, DollarSign, ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Check } from 'lucide-react'

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

  // ── SUCCESS ────────────────────────────────────────────────
  if (submitted) return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-10 md:p-12 max-w-lg w-full text-center border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">Lamaran Terkirim!</h2>
        <p className="text-base text-gray-600 leading-relaxed mb-4">
          Terima kasih <strong className="text-gray-900">{form.full_name}</strong>! Lamaran untuk posisi <strong className="text-gray-900">{form.position_applied}</strong> sudah kami terima.
        </p>
        <p className="text-sm text-gray-500 leading-relaxed">
          Tim HR Strada Coffee akan menghubungi Anda di nomor <strong className="text-gray-900">{form.phone}</strong> dalam 3–5 hari kerja.
        </p>
        
        <div className="mt-8 p-5 rounded-2xl bg-blue-50/50 border border-blue-100 text-left flex gap-4 items-start">
          <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
            <span className="text-lg">✨</span>
          </div>
          <div>
            <p className="text-sm font-bold text-strada-blue mb-1">Quest AI sedang menganalisa profil Anda</p>
            <p className="text-[13px] text-gray-500">Seleksi awal dilakukan secara otomatis dan objektif oleh AI untuk memastikan kecocokan profil.</p>
          </div>
        </div>
        
        <div className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium tracking-wide">STRADA COFFEE · EST. 2012</p>
        </div>
      </div>
    </div>
  )

  // ── LOADING ────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-strada-blue rounded-full animate-spin" />
        <p className="text-gray-500 font-medium text-sm">Memuat data...</p>
      </div>
    </div>
  )

  // ── JOB LIST ───────────────────────────────────────────────
  if (!selectedJob) return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-30 px-6 py-4 flex flex-col items-center shadow-sm">
        <img src="/strada-logo.svg" alt="Strada Coffee" className="h-8 w-auto filter grayscale contrast-200 mb-1" />
        <p className="text-[11px] font-bold text-gray-400 tracking-[0.2em] uppercase">Bergabunglah bersama tim kami</p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">Posisi Tersedia</h1>
          <p className="text-base text-gray-500">
            {jobs.length > 0 ? `Temukan peran yang sesuai dengan passion Anda dari ${jobs.length} posisi terbuka.` : 'Belum ada posisi terbuka saat ini'}
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-20 px-6 bg-white rounded-[32px] border border-gray-100 shadow-sm">
            <span className="text-5xl mb-4 block">☕</span>
            <p className="text-xl font-bold text-gray-900 mb-2">Belum ada posisi terbuka</p>
            <p className="text-gray-500">Pantau terus halaman ini untuk lowongan terbaru dari Strada Coffee.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {jobs.map(job => (
              <div key={job.id} 
                onClick={() => nextRouter.push(`/jobs/${job.job_id}`)}
                className="group bg-white rounded-3xl p-6 border border-gray-200/60 shadow-sm hover:shadow-md hover:border-strada-blue/30 transition-all duration-300 cursor-pointer flex flex-col md:flex-row md:items-center gap-6">
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight group-hover:text-strada-blue transition-colors">{job.title}</h3>
                    {job.is_urgent && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-strada-coral tracking-wide uppercase">URGENT</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-strada-blue mb-4">{job.department}</p>
                  
                  <div className="flex flex-wrap gap-4 gap-y-2 text-sm text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5"><MapPin size={16} className="text-gray-400" /> {job.location}{job.outlet ? ` · ${job.outlet}` : ''}</span>
                    <span className="flex items-center gap-1.5"><Clock size={16} className="text-gray-400" /> {job.employment_type}</span>
                    {job.salary_display && (
                      <span className="flex items-center gap-1.5"><DollarSign size={16} className="text-gray-400" /> {job.salary_display}</span>
                    )}
                  </div>
                  
                  {job.description && (
                    <p className="text-sm text-gray-500 mt-4 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center justify-end">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 text-gray-700 font-bold rounded-full group-hover:bg-strada-blue group-hover:text-white transition-colors duration-300 text-sm">
                    Lihat Detail <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase">STRADA COFFEE · EST. 2012</p>
        </div>
      </div>
    </div>
  )

  // ── FORM ───────────────────────────────────────────────────
  const STEPS = ['Data Diri', 'Pengalaman', 'Motivasi']

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-30 px-4 py-3 flex items-center shadow-sm gap-4">
        <button onClick={() => setSelectedJob(null)} 
          className="p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <img src="/strada-logo.svg" alt="Strada Coffee" className="h-6 w-auto filter grayscale contrast-200" />
      </div>

      {/* Job banner */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Melamar Posisi</p>
            <p className="text-base font-extrabold text-gray-900 truncate flex items-center gap-2">
              {selectedJob.title}
              {selectedJob.outlet && <span className="text-gray-400 font-medium">· {selectedJob.outlet}</span>}
              {!selectedJob.is_active && <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 uppercase tracking-wide">PREVIEW</span>}
            </p>
          </div>
          {!jobParam && (
            <button onClick={() => setSelectedJob(null)}
              className="text-xs font-bold text-strada-blue hover:text-strada-dark-teal transition-colors whitespace-nowrap bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full">
              Ganti Posisi
            </button>
          )}
        </div>
      </div>

      {/* Progress stepper */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between relative max-w-sm mx-auto">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full -z-10" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-strada-blue rounded-full -z-10 transition-all duration-500" 
               style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} />
          
          {STEPS.map((s, i) => {
            const active = step >= i + 1;
            const current = step === i + 1;
            return (
              <div key={s} className="flex flex-col items-center gap-2 bg-[#F5F5F7]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300 border-2 ${
                  active ? 'bg-strada-blue border-strada-blue text-white' : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {step > i + 1 ? <Check size={16} strokeWidth={3} /> : i + 1}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide absolute -bottom-6 whitespace-nowrap ${current ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Form content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-6">
        <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-gray-100 shadow-sm">
          
          {/* ── STEP 1: Data Diri ── */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Data Diri</h2>
                <p className="text-gray-500 text-sm mt-1">Lengkapi informasi dasar Anda. Kolom dengan <span className="text-red-500">*</span> wajib diisi.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-2">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input className="apple-input" value={form.full_name} onChange={e => set('full_name', e.target.value)}
                    placeholder="Sesuai identitas resmi" autoComplete="name" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                    <input type="email" className="apple-input" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="email@kamu.com" autoComplete="email" inputMode="email" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-2">No. HP / WhatsApp <span className="text-red-500">*</span></label>
                    <input className="apple-input" value={form.phone} onChange={e => set('phone', e.target.value)}
                      placeholder="08xxxxxxxxxx" autoComplete="tel" inputMode="tel" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-2">Tanggal Lahir</label>
                    <input type="date" className="apple-input" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-2">Domisili Saat Ini <span className="text-red-500">*</span></label>
                    <input className="apple-input" value={form.domicile} onChange={e => set('domicile', e.target.value)}
                      placeholder="Kota, Kecamatan" />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-2">Pendidikan Terakhir</label>
                  <select className={`apple-input ${!form.education_level && 'text-gray-400'}`} 
                    value={form.education_level} onChange={e => set('education_level', e.target.value)}>
                    <option value="" disabled>Pilih tingkat pendidikan...</option>
                    <option value="SMA" className="text-gray-900">SMA / SMK / Sederajat</option>
                    <option value="D3" className="text-gray-900">Diploma (D3)</option>
                    <option value="S1" className="text-gray-900">Sarjana (S1)</option>
                    <option value="S2" className="text-gray-900">Magister (S2) ke atas</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-gray-100 flex justify-end">
                <button onClick={() => {
                  if (!form.full_name || !form.email || !form.phone || !form.domicile) {
                    alert('Mohon lengkapi data wajib (Nama, Email, HP, Domisili) terlebih dahulu.')
                    return
                  }
                  setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' })
                }} className="apple-btn-primary w-full md:w-auto flex items-center justify-center gap-2 text-base px-8 py-3.5">
                  Lanjutkan <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Pengalaman ── */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Pengalaman Kerja</h2>
                <p className="text-gray-500 text-sm mt-1">Belum punya pengalaman? Tidak masalah, Anda tetap bisa melamar.</p>
              </div>

              <div className="space-y-5">
                {/* Cafe experience toggle */}
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/60 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-bold text-gray-900 mb-1">Pengalaman di F&B / Hospitality?</p>
                      <p className="text-[13px] text-gray-500">Kafe, restoran, hotel, atau coffee shop.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={form.has_cafe_experience} onChange={() => set('has_cafe_experience', !form.has_cafe_experience)} />
                      <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-strada-blue"></div>
                    </label>
                  </div>
                  
                  {form.has_cafe_experience && (
                    <div className="mt-5 pt-5 border-t border-gray-200/60 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                      <div>
                        <label className="block text-[13px] font-bold text-gray-700 mb-2">Lama Pengalaman</label>
                        <select className="apple-input" value={form.cafe_experience_years} onChange={e => set('cafe_experience_years', parseFloat(e.target.value))}>
                          <option value="0">Kurang dari 6 bulan</option>
                          <option value="0.5">6 bulan – 1 tahun</option>
                          <option value="1">1 tahun</option>
                          <option value="1.5">1,5 tahun</option>
                          <option value="2">2 tahun</option>
                          <option value="3">3 tahun</option>
                          <option value="4">4 tahun</option>
                          <option value="5">Lebih dari 5 tahun</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-gray-700 mb-2">Detail Tempat</label>
                        <input className="apple-input" value={form.cafe_experience_detail} onChange={e => set('cafe_experience_detail', e.target.value)}
                          placeholder="Contoh: Barista di Kopi Kenangan, Jakarta" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Barista cert toggle */}
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/60 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-bold text-gray-900 mb-1">Memiliki Sertifikasi Profesional?</p>
                      <p className="text-[13px] text-gray-500">SCA, SCAI, BNSP, atau sejenisnya.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={form.has_barista_cert} onChange={() => set('has_barista_cert', !form.has_barista_cert)} />
                      <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-strada-blue"></div>
                    </label>
                  </div>
                  
                  {form.has_barista_cert && (
                    <div className="mt-5 pt-5 border-t border-gray-200/60 animate-in fade-in zoom-in-95 duration-300">
                      <label className="block text-[13px] font-bold text-gray-700 mb-2">Nama/Jenis Sertifikasi</label>
                      <input className="apple-input" value={form.cert_detail} onChange={e => set('cert_detail', e.target.value)}
                        placeholder="Contoh: SCA Barista Skills Foundation" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-2 flex items-center gap-2">
                    Profil Instagram <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">OPSIONAL</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">@</span>
                    <input className="apple-input pl-9" value={form.instagram_url} onChange={e => set('instagram_url', e.target.value.replace('@',''))}
                      placeholder="username" autoCapitalize="none" />
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-gray-100 flex flex-col-reverse md:flex-row justify-between gap-4">
                <button onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="apple-btn-secondary w-full md:w-auto flex items-center justify-center gap-2 text-base px-8 py-3.5">
                  <ArrowLeft size={18} /> Kembali
                </button>
                <button onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="apple-btn-primary w-full md:w-auto flex items-center justify-center gap-2 text-base px-8 py-3.5">
                  Lanjutkan <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Motivasi & Submit ── */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Motivasi & Penutup</h2>
                <p className="text-gray-500 text-sm mt-1">Satu langkah lagi untuk mengirimkan lamaran Anda.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[14px] font-bold text-gray-900 mb-3">Mengapa Anda tertarik bergabung dengan Strada Coffee?</label>
                  <textarea className="apple-input min-h-[120px] resize-y leading-relaxed text-[15px]"
                    value={form.hr_notes} onChange={e => set('hr_notes', e.target.value)}
                    placeholder="Ceritakan motivasi, harapan, atau hal unik tentang diri Anda..." />
                  <p className="text-[12px] text-gray-500 font-medium mt-2 flex items-center gap-1.5">
                    <span className="text-strada-amber">💡</span> Jawaban yang tulus dan personal akan menjadi nilai tambah.
                  </p>
                </div>

                {/* Summary card */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200/60">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Ringkasan Lamaran</p>
                  <div className="space-y-3">
                    {[
                      ['Posisi', selectedJob?.title || form.position_applied, true],
                      ['Nama Lengkap', form.full_name, false],
                      ['Email & HP', `${form.email} · ${form.phone}`, false],
                      ['Domisili', form.domicile, false],
                      ['Pengalaman F&B', form.has_cafe_experience ? `${form.cafe_experience_years} tahun` : 'Belum ada', false],
                    ].map(([label, value, highlight], idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 pb-3 border-b border-gray-200/50 last:border-0 last:pb-0">
                        <span className="text-[13px] font-semibold text-gray-500 sm:w-32 shrink-0">{label as string}</span>
                        <span className={`text-[14px] ${highlight ? 'font-extrabold text-strada-blue' : 'font-medium text-gray-900'} break-words`}>{value as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-gray-100 flex flex-col-reverse md:flex-row justify-between gap-4">
                <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="apple-btn-secondary w-full md:w-auto flex items-center justify-center gap-2 text-base px-8 py-3.5">
                  <ArrowLeft size={18} /> Kembali
                </button>
                <button onClick={handleSubmit} disabled={submitting} 
                  className={`apple-btn-primary w-full md:w-auto flex items-center justify-center gap-2 text-base px-8 py-3.5 ${
                    submitting ? 'opacity-70 cursor-not-allowed bg-strada-blue/80' : ''
                  }`}>
                  {submitting ? 'Mengirim Data...' : 'Kirim Lamaran Sekarang'} <CheckCircle2 size={18} />
                </button>
              </div>

              <p className="text-center text-[12px] font-medium text-gray-400 mt-6">
                Dengan menekan tombol kirim, Anda menyetujui penggunaan data untuk keperluan rekrutmen internal.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-strada-blue rounded-full animate-spin" />
        </div>
      </div>
    }>
      <ApplyContent />
    </Suspense>
  )
}
