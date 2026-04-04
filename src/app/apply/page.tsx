'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ApplyPage() {
  const supabase = createClient()
  const [step, setStep] = useState<'hero' | 1 | 2 | 3>('hero')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', birth_date: '',
    domicile: '', instagram_url: '', position_applied: '',
    outlet_preference: '', entity_target: '', source: 'Portal',
    has_cafe_experience: false, cafe_experience_years: '0',
    cafe_experience_detail: '', has_barista_cert: false,
    cert_detail: '', education_level: '', motivation: '',
  })

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    setFileError('')
    const newFiles = [...files]
    for (const file of selected) {
      if (file.type !== 'application/pdf') { setFileError('Hanya file PDF yang diterima.'); continue }
      if (file.size > 3 * 1024 * 1024) { setFileError(`${file.name} melebihi batas 3MB.`); continue }
      if (newFiles.length >= 2) { setFileError('Maksimal 2 file.'); break }
      if (!newFiles.find(f => f.name === file.name)) newFiles.push(file)
    }
    setFiles(newFiles)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(name: string) {
    setFiles(f => f.filter(x => x.name !== name))
  }

  async function uploadFiles(applicantId: string): Promise<string[]> {
    const paths: string[] = []
    for (const file of files) {
      const path = `applicants/${applicantId}/${file.name}`
      const { error } = await supabase.storage.from('documents').upload(path, file)
      if (!error) paths.push(path)
    }
    return paths
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      full_name: form.full_name, email: form.email, phone: form.phone,
      birth_date: form.birth_date || null, domicile: form.domicile || null,
      instagram_url: form.instagram_url || null,
      position_applied: form.position_applied,
      outlet_preference: form.outlet_preference || null,
      entity_target: form.entity_target || null,
      source: 'Portal',
      has_cafe_experience: form.has_cafe_experience,
      cafe_experience_years: parseFloat(form.cafe_experience_years) || 0,
      cafe_experience_detail: form.cafe_experience_detail || null,
      has_barista_cert: form.has_barista_cert,
      cert_detail: form.cert_detail || null,
      education_level: form.education_level || null,
      hr_notes: form.motivation || null,
      status: 'new',
    }

    const { data, error: insertError } = await supabase.from('applicants').insert([payload]).select().single()
    if (insertError) { setError('Terjadi kesalahan. Coba lagi.'); setLoading(false); return }

    if (files.length > 0 && data) await uploadFiles(data.id)
    setSubmitted(true)
  }

  const scrollToForm = () => {
    setStep(1)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const inp = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all bg-white"
  const inpStyle = { border: '1.5px solid rgba(3,120,148,0.2)' }
  const lbl = "block text-sm font-semibold mb-1.5"

  // SUCCESS
  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#020000' }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#037894' }}>
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Lamaran Terkirim!</h2>
        <p className="mb-2" style={{ color: '#E4DED8' }}>Terima kasih, <span className="font-semibold text-white">{form.full_name}</span>.</p>
        <p className="text-sm mb-8" style={{ color: '#8FC6C5' }}>Tim HR kami akan menghubungi kamu dalam 3–5 hari kerja jika profil kamu sesuai.</p>
        <p className="text-xs" style={{ color: 'rgba(228,222,216,0.4)' }}>Strada Coffee — Indonesia Specialty Coffee since 2012</p>
      </div>
    </div>
  )

  return (
    <div style={{ backgroundColor: '#020000', minHeight: '100vh' }}>

      {/* ── HERO ─────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(160deg, #020000 0%, #005353 60%, #037894 100%)', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

        {/* Batik pattern overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="batik" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="12" fill="none" stroke="#E4DED8" strokeWidth="1"/>
                <circle cx="30" cy="30" r="6" fill="none" stroke="#E4DED8" strokeWidth="0.5"/>
                <circle cx="0" cy="0" r="8" fill="none" stroke="#E4DED8" strokeWidth="0.8"/>
                <circle cx="60" cy="0" r="8" fill="none" stroke="#E4DED8" strokeWidth="0.8"/>
                <circle cx="0" cy="60" r="8" fill="none" stroke="#E4DED8" strokeWidth="0.8"/>
                <circle cx="60" cy="60" r="8" fill="none" stroke="#E4DED8" strokeWidth="0.8"/>
                <line x1="30" y1="18" x2="30" y2="8" stroke="#E4DED8" strokeWidth="0.5"/>
                <line x1="30" y1="42" x2="30" y2="52" stroke="#E4DED8" strokeWidth="0.5"/>
                <line x1="18" y1="30" x2="8" y2="30" stroke="#E4DED8" strokeWidth="0.5"/>
                <line x1="42" y1="30" x2="52" y2="30" stroke="#E4DED8" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#batik)"/>
          </svg>
        </div>

        {/* Nav */}
        <nav className="relative flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-wide text-white">Strada</span>
            <span className="font-bold text-xl px-2 py-0.5 rounded-lg" style={{ backgroundColor: '#037894', color: '#fff' }}>Coffee</span>
          </div>
          <a href="https://stradacoffee.com" className="text-sm transition-colors" style={{ color: 'rgba(228,222,216,0.6)' }}>
            ← Kembali ke website
          </a>
        </nav>

        {/* Hero content */}
        <div className="relative max-w-4xl mx-auto px-8 pt-16 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest mb-8" style={{ backgroundColor: 'rgba(3,120,148,0.25)', color: '#8FC6C5', border: '1px solid rgba(143,198,197,0.3)' }}>
            ☕ Indonesia Specialty Coffee Since 2012
          </div>

          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Bergabunglah dalam<br />
            <span style={{ color: '#037894' }}>Perjalanan Kopi</span><br />
            Terbaik Indonesia
          </h1>

          <p className="text-lg mb-4" style={{ color: 'rgba(228,222,216,0.7)', maxWidth: '560px', margin: '0 auto 2rem' }}>
            Strada Coffee hadir sejak 2012 untuk memperkenalkan specialty coffee terbaik Nusantara. Kami mencari orang-orang yang passionate, detail, dan siap bertumbuh bersama.
          </p>

          <button onClick={scrollToForm}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all"
            style={{ backgroundColor: '#037894', color: '#ffffff' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#025f76'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#037894'}>
            Daftar Sekarang
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </div>

        {/* Stats bar */}
        <div className="relative max-w-4xl mx-auto px-8 pb-20">
          <div className="grid grid-cols-3 gap-4">
            {[
              { number: '12+', label: 'Tahun Berdiri', sub: 'Sejak 2012' },
              { number: '6+', label: 'Outlet Aktif', sub: 'Jakarta & Semarang' },
              { number: '80+', label: 'Tim Strada', sub: 'Dan terus berkembang' },
            ].map(s => (
              <div key={s.label} className="text-center p-6 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-3xl font-bold mb-1" style={{ color: '#037894' }}>{s.number}</p>
                <p className="text-sm font-semibold text-white">{s.label}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(228,222,216,0.4)' }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KENAPA STRADA ────────────────────────────── */}
      <section className="py-24 px-8 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#037894' }}>Kenapa Bergabung</p>
          <h2 className="text-4xl font-bold text-white mb-4">Lebih dari Sekadar Pekerjaan</h2>
          <p className="text-base" style={{ color: 'rgba(228,222,216,0.6)', maxWidth: '480px', margin: '0 auto' }}>
            Di Strada, kamu bukan hanya membuat kopi — kamu merangkai pengalaman dan perjalanan bagi setiap tamu.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-16">
          {[
            { icon: '🏆', title: 'Quality First', desc: 'Kami hanya bekerja dengan specialty grade coffee 80+. Kamu akan belajar standar tertinggi industri kopi Indonesia.' },
            { icon: '📚', title: 'Terus Belajar', desc: 'Akses ke Strada Academy, sertifikasi SCA, dan training reguler bersama Q Grader & SCA Trainer berpengalaman.' },
            { icon: '🚀', title: 'Karir Berkembang', desc: 'Dari barista hingga supervisor, trainer, hingga manajemen — jalur karir yang jelas dan terstruktur.' },
            { icon: '🤝', title: 'Tim yang Solid', desc: 'Kultur kerja yang supportif, kolaboratif, dan saling menghargai. Tim kami adalah keluarga kedua.' },
            { icon: '💰', title: 'Kompensasi Kompetitif', desc: 'Gaji pokok, service charge, tunjangan BPJS, dan insentif performa yang adil dan transparan.' },
            { icon: '🌏', title: 'Ikut Berkembang', desc: 'Strada sedang ekspansi besar-besaran. Bergabung sekarang berarti kamu ikut membangun sejarahnya.' },
          ].map(b => (
            <div key={b.title} className="p-6 rounded-2xl flex gap-4" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(3,120,148,0.15)' }}>
              <span className="text-2xl flex-shrink-0">{b.icon}</span>
              <div>
                <h3 className="font-bold text-white mb-1">{b.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(228,222,216,0.55)' }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Story section */}
        <div className="rounded-2xl p-8 mb-8" style={{ backgroundColor: 'rgba(3,120,148,0.08)', border: '1px solid rgba(3,120,148,0.2)' }}>
          <div className="grid grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8FC6C5' }}>Cerita Kami</p>
              <h3 className="text-2xl font-bold text-white mb-4">Secangkir Kopi,<br />Serangkaian Perjalanan</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(228,222,216,0.65)' }}>
                Berawal dari passion Evani Jesslyn terhadap specialty coffee, Strada hadir di Semarang pada 2012. Kini dengan lebih dari 6 outlet di Jakarta dan Semarang, roastery sendiri, dan Strada Academy — kami terus tumbuh.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(228,222,216,0.65)' }}>
                Setiap cangkir yang kami sajikan adalah hasil dari perjalanan panjang — dari kebun kopi Nusantara, melalui proses roasting kami, hingga ke tangan kamu.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { year: '2012', event: 'Strada Coffee berdiri di Semarang' },
                { year: '2018', event: 'Ekspansi ke Jakarta, outlet pertama' },
                { year: '2020', event: 'Strada Roastery & Academy dibuka' },
                { year: '2024', event: '6+ outlet aktif, 80+ karyawan' },
                { year: '2025+', event: 'Ekspansi ke lokasi-lokasi baru' },
              ].map(t => (
                <div key={t.year} className="flex items-center gap-4">
                  <span className="text-xs font-bold w-10 flex-shrink-0" style={{ color: '#037894' }}>{t.year}</span>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#037894' }} />
                  <span className="text-sm" style={{ color: 'rgba(228,222,216,0.7)' }}>{t.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FORM ─────────────────────────────────────── */}
      <section ref={formRef} className="py-16 px-4" style={{ backgroundColor: '#E4DED8' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#037894' }}>Bergabung Bersama Kami</p>
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#020000' }}>Formulir Lamaran</h2>
            <p className="text-sm" style={{ color: '#4C4845' }}>Isi dengan lengkap dan jujur. Tim HR kami membaca setiap lamaran.</p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-0 mb-8">
            {[1, 2, 3].map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                    style={{
                      backgroundColor: step !== 'hero' && (step as number) >= s ? '#037894' : 'rgba(3,120,148,0.15)',
                      color: step !== 'hero' && (step as number) >= s ? '#ffffff' : '#037894',
                    }}>
                    {step !== 'hero' && (step as number) > s ? '✓' : s}
                  </div>
                  <span className="text-xs mt-1 font-medium" style={{ color: '#4C4845' }}>
                    {['Data Diri', 'Pengalaman', 'Finalisasi'][i]}
                  </span>
                </div>
                {i < 2 && <div className="flex-1 h-0.5 mx-2 mb-4" style={{ backgroundColor: step !== 'hero' && (step as number) > s ? '#037894' : 'rgba(3,120,148,0.2)' }} />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>

            {/* STEP 1 */}
            {(step === 'hero' || step === 1) && (
              <div className="rounded-2xl p-8 shadow-sm" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(3,120,148,0.12)' }}>
                <h3 className="font-bold text-lg mb-6" style={{ color: '#020000' }}>Data Diri</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={lbl} style={{ color: '#020000' }}>Nama Lengkap <span style={{ color: '#FF4F31' }}>*</span></label>
                      <input className={inp} style={inpStyle} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Sesuai KTP" required />
                    </div>
                    <div>
                      <label className={lbl} style={{ color: '#020000' }}>Email <span style={{ color: '#FF4F31' }}>*</span></label>
                      <input type="email" className={inp} style={inpStyle} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@kamu.com" required />
                    </div>
                    <div>
                      <label className={lbl} style={{ color: '#020000' }}>No. HP <span style={{ color: '#FF4F31' }}>*</span></label>
                      <input className={inp} style={inpStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08xxxxxxxxxx" required />
                    </div>
                    <div>
                      <label className={lbl} style={{ color: '#020000' }}>Tanggal Lahir</label>
                      <input type="date" className={inp} style={inpStyle} value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
                    </div>
                    <div>
                      <label className={lbl} style={{ color: '#020000' }}>Domisili</label>
                      <input className={inp} style={inpStyle} value={form.domicile} onChange={e => set('domicile', e.target.value)} placeholder="Kota domisili" />
                    </div>
                    <div className="col-span-2">
                      <label className={lbl} style={{ color: '#020000' }}>Instagram</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-sm" style={{ color: '#8A8A8D' }}>@</span>
                        <input className={`${inp} pl-8`} style={inpStyle} value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)} placeholder="username_kamu" />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className={lbl} style={{ color: '#020000' }}>Pendidikan Terakhir</label>
                      <select className={inp} style={inpStyle} value={form.education_level} onChange={e => set('education_level', e.target.value)}>
                        <option value="">Pilih</option>
                        <option value="SMP">SMP</option>
                        <option value="SMA">SMA/SMK</option>
                        <option value="D3">D3</option>
                        <option value="S1">S1</option>
                        <option value="S2">S2</option>
                      </select>
                    </div>
                  </div>
                </div>
                {error && <p className="text-sm mt-4" style={{ color: '#FF4F31' }}>{error}</p>}
                <button type="button" onClick={() => { if (!form.full_name || !form.email || !form.phone) { setError('Lengkapi nama, email, dan no. HP'); return } setError(''); setStep(2) }}
                  className="w-full mt-6 py-3.5 rounded-xl font-bold transition-all"
                  style={{ backgroundColor: '#037894', color: '#ffffff' }}>
                  Lanjut →
                </button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="rounded-2xl p-8 shadow-sm" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(3,120,148,0.12)' }}>
                <h3 className="font-bold text-lg mb-6" style={{ color: '#020000' }}>Posisi & Pengalaman</h3>
                <div className="space-y-4">
                  <div>
                    <label className={lbl} style={{ color: '#020000' }}>Posisi yang Dilamar <span style={{ color: '#FF4F31' }}>*</span></label>
                    <select className={inp} style={inpStyle} value={form.position_applied} onChange={e => set('position_applied', e.target.value)} required>
                      <option value="">Pilih posisi</option>
                      <option value="Barista">Barista</option>
                      <option value="Senior Barista">Senior Barista</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Kitchen Staff">Kitchen Staff</option>
                      <option value="Trainer">Trainer / Academy</option>
                      <option value="Roastery Staff">Roastery Staff</option>
                      <option value="HO Staff">HO Staff</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl} style={{ color: '#020000' }}>Preferensi Outlet</label>
                    <select className={inp} style={inpStyle} value={form.outlet_preference} onChange={e => set('outlet_preference', e.target.value)}>
                      <option value="">Tidak ada preferensi</option>
                      <option value="Kelapa Gading">Kelapa Gading</option>
                      <option value="MKG">MKG</option>
                      <option value="BSD">BSD</option>
                      <option value="SMS">SMS</option>
                      <option value="SMB">SMB Gold Lounge</option>
                      <option value="Semarang">Semarang</option>
                    </select>
                  </div>

                  {/* Toggle: Pengalaman */}
                  <div className="p-5 rounded-xl" style={{ backgroundColor: '#f5f0e8', border: '1px solid rgba(3,120,148,0.12)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#020000' }}>Pengalaman di kafe?</p>
                        <p className="text-xs" style={{ color: '#8A8A8D' }}>Kafe specialty / coffee shop</p>
                      </div>
                      <button type="button" onClick={() => set('has_cafe_experience', !form.has_cafe_experience)}
                        className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                        style={{ backgroundColor: form.has_cafe_experience ? '#037894' : '#d4cfc9' }}>
                        <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform"
                          style={{ transform: form.has_cafe_experience ? 'translateX(28px)' : 'translateX(4px)' }} />
                      </button>
                    </div>
                    {form.has_cafe_experience && (
                      <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid rgba(3,120,148,0.15)' }}>
                        <select className={inp} style={inpStyle} value={form.cafe_experience_years} onChange={e => set('cafe_experience_years', e.target.value)}>
                          <option value="0.5">Kurang dari 1 tahun</option>
                          <option value="1">1 tahun</option>
                          <option value="2">2 tahun</option>
                          <option value="3">3 tahun</option>
                          <option value="5">4–5 tahun</option>
                          <option value="6">Lebih dari 5 tahun</option>
                        </select>
                        <input className={inp} style={inpStyle} value={form.cafe_experience_detail} onChange={e => set('cafe_experience_detail', e.target.value)} placeholder="Di kafe mana saja?" />
                      </div>
                    )}
                  </div>

                  {/* Toggle: Sertifikasi */}
                  <div className="p-5 rounded-xl" style={{ backgroundColor: '#f5f0e8', border: '1px solid rgba(3,120,148,0.12)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#020000' }}>Punya sertifikasi barista?</p>
                        <p className="text-xs" style={{ color: '#8A8A8D' }}>SCA, SCAI, atau lainnya</p>
                      </div>
                      <button type="button" onClick={() => set('has_barista_cert', !form.has_barista_cert)}
                        className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                        style={{ backgroundColor: form.has_barista_cert ? '#037894' : '#d4cfc9' }}>
                        <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform"
                          style={{ transform: form.has_barista_cert ? 'translateX(28px)' : 'translateX(4px)' }} />
                      </button>
                    </div>
                    {form.has_barista_cert && (
                      <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(3,120,148,0.15)' }}>
                        <input className={inp} style={inpStyle} value={form.cert_detail} onChange={e => set('cert_detail', e.target.value)} placeholder="Nama sertifikasi dan tahun" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl font-semibold transition-all" style={{ border: '1.5px solid #037894', color: '#037894', backgroundColor: 'transparent' }}>← Kembali</button>
                  <button type="button" onClick={() => { if (!form.position_applied) { setError('Pilih posisi'); return } setError(''); setStep(3) }}
                    className="flex-1 py-3.5 rounded-xl font-bold transition-all" style={{ backgroundColor: '#037894', color: '#ffffff' }}>Lanjut →</button>
                </div>
                {error && <p className="text-sm mt-3 text-center" style={{ color: '#FF4F31' }}>{error}</p>}
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="rounded-2xl p-8 shadow-sm" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(3,120,148,0.12)' }}>
                <h3 className="font-bold text-lg mb-6" style={{ color: '#020000' }}>Finalisasi</h3>
                <div className="space-y-5">
                  <div>
                    <label className={lbl} style={{ color: '#020000' }}>Kenapa ingin bergabung dengan Strada?</label>
                    <textarea className={inp} style={{ ...inpStyle, resize: 'none' }} value={form.motivation} onChange={e => set('motivation', e.target.value)} rows={4} placeholder="Ceritakan motivasimu..." />
                  </div>

                  {/* Upload CV */}
                  <div>
                    <label className={lbl} style={{ color: '#020000' }}>Upload CV / Dokumen</label>
                    <p className="text-xs mb-3" style={{ color: '#8A8A8D' }}>Format PDF, maks 3MB per file, maks 2 file</p>

                    {files.length < 2 && (
                      <label className="flex flex-col items-center justify-center p-6 rounded-xl cursor-pointer transition-all"
                        style={{ border: '2px dashed rgba(3,120,148,0.3)', backgroundColor: 'rgba(3,120,148,0.03)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#037894'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(3,120,148,0.3)'}>
                        <svg className="w-8 h-8 mb-2" style={{ color: '#037894' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                        <p className="text-sm font-semibold" style={{ color: '#037894' }}>Klik untuk upload PDF</p>
                        <p className="text-xs mt-1" style={{ color: '#8A8A8D' }}>atau drag & drop</p>
                        <input ref={fileInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleFileAdd} />
                      </label>
                    )}

                    {files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {files.map(f => (
                          <div key={f.name} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(3,120,148,0.06)', border: '1px solid rgba(3,120,148,0.15)' }}>
                            <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#037894' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                              </svg>
                              <div>
                                <p className="text-sm font-medium" style={{ color: '#020000' }}>{f.name}</p>
                                <p className="text-xs" style={{ color: '#8A8A8D' }}>{(f.size / 1024 / 1024).toFixed(1)} MB</p>
                              </div>
                            </div>
                            <button type="button" onClick={() => removeFile(f.name)} className="text-sm font-medium" style={{ color: '#FF4F31' }}>Hapus</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {fileError && <p className="text-xs mt-2" style={{ color: '#FF4F31' }}>{fileError}</p>}
                  </div>

                  {/* Summary */}
                  <div className="p-5 rounded-xl" style={{ backgroundColor: '#f5f0e8' }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: '#8A8A8D' }}>Ringkasan Lamaran</p>
                    {[
                      ['Nama', form.full_name],
                      ['Posisi', form.position_applied],
                      ['Pengalaman', form.has_cafe_experience ? `${form.cafe_experience_years} tahun` : 'Belum ada'],
                      ['Sertifikasi', form.has_barista_cert ? 'Ada' : 'Belum ada'],
                      ['Dokumen', files.length > 0 ? `${files.length} file` : 'Tidak ada'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid rgba(76,72,69,0.1)' }}>
                        <span className="text-sm" style={{ color: '#8A8A8D' }}>{k}</span>
                        <span className="text-sm font-semibold" style={{ color: '#020000' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {error && <div className="px-4 py-3 rounded-xl mt-4 text-sm" style={{ backgroundColor: '#fff0ee', color: '#FF4F31' }}>{error}</div>}

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setStep(2)} className="flex-1 py-3.5 rounded-xl font-semibold" style={{ border: '1.5px solid #037894', color: '#037894' }}>← Kembali</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3.5 rounded-xl font-bold transition-all disabled:opacity-50" style={{ backgroundColor: '#020000', color: '#ffffff' }}>
                    {loading ? 'Mengirim...' : 'Kirim Lamaran ☕'}
                  </button>
                </div>
                <p className="text-center text-xs mt-4" style={{ color: '#8A8A8D' }}>
                  Data kamu aman dan hanya digunakan untuk proses rekrutmen.
                </p>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-sm font-bold text-white mb-1">Strada Coffee</p>
        <p className="text-xs" style={{ color: 'rgba(228,222,216,0.35)' }}>Indonesia Specialty Coffee Since 2012 · stradacoffee.com</p>
      </footer>
    </div>
  )
}