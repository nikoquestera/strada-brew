'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ApplyPage() {
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', birth_date: '',
    domicile: '', instagram_url: '', position_applied: '',
    outlet_preference: '', source: 'Portal',
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

  const { data, error: err } = await supabase.from('applicants').insert([payload]).select().single()
  if (err) { setError('Terjadi kesalahan. Coba lagi.'); setLoading(false); return }

  // Upload files (satu kali saja)
  if (files.length > 0 && data) {
    for (const file of files) {
      await supabase.storage.from('documents').upload(`applicants/${data.id}/${file.name}`, file)
    }
  }

  // Trigger Quest AI scoring (fire and forget)
  fetch('/api/quest/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant_id: data.id })
  }).catch(() => {})

  // Notify HRD (fire and forget)
  fetch('/api/notify/new-applicant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant: payload })
  }).catch(() => {})

  setSubmitted(true)
}

  const inp = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
  const ist = { border: '1.5px solid #D4CFC9', backgroundColor: '#FAFAF9', color: '#020000' }
  const foc = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.target.style.borderColor = '#037894'; e.target.style.boxShadow = '0 0 0 3px rgba(3,120,148,0.08)' },
    onBlur:  (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.target.style.borderColor = '#D4CFC9'; e.target.style.boxShadow = 'none' }
  }

  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F5F2', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#037894', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <svg style={{ width: '36px', height: '36px', color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#020000', margin: '0 0 10px' }}>Lamaran Terkirim!</h2>
        <p style={{ fontSize: '15px', color: '#4C4845', margin: '0 0 8px' }}>Terima kasih, <strong>{form.full_name}</strong>.</p>
        <p style={{ fontSize: '13px', color: '#8A8A8D', margin: '0 0 28px', lineHeight: 1.6 }}>Tim HR kami akan menghubungi kamu dalam 3–5 hari kerja.</p>
        <a href="https://stradacoffee.com" style={{ display: 'inline-block', padding: '12px 32px', borderRadius: '12px', backgroundColor: '#020000', color: '#fff', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>← Kembali ke Strada Coffee</a>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>

      {/* Header minimal */}
      <div style={{ backgroundColor: '#020000', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontStyle: 'italic' }}>Strada</span>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3px', color: '#037894', textTransform: 'uppercase', display: 'block', marginTop: '-2px' }}>COFFEE</span>
        </div>
        <a href="https://stradacoffee.com/apply" style={{ fontSize: '13px', color: 'rgba(228,222,216,0.5)', textDecoration: 'none' }}>
          ← Tentang karir di Strada
        </a>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px 60px' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: '#037894', textTransform: 'uppercase', margin: '0 0 8px' }}>Formulir Lamaran</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#020000', margin: '0 0 6px' }}>Bergabung dengan Strada Coffee</h1>
          <p style={{ fontSize: '13px', color: '#8A8A8D', margin: 0 }}>Langkah {step} dari 3 &mdash; {['Data Diri', 'Posisi & Pengalaman', 'Finalisasi'][step - 1]}</p>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: '4px', borderRadius: '4px', backgroundColor: step >= s ? '#037894' : '#E8E4E0', transition: 'background 0.2s' }} />
          ))}
        </div>

        <form onSubmit={handleSubmit}>

          {/* STEP 1 */}
          {step === 1 && (
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '32px', border: '1.5px solid #E8E4E0', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '6px' }}>Nama Lengkap <span style={{ color: '#FF4F31' }}>*</span></label>
                  <input className={inp} style={ist} {...foc} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Sesuai KTP" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '6px' }}>Email <span style={{ color: '#FF4F31' }}>*</span></label>
                    <input type="email" className={inp} style={ist} {...foc} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@kamu.com" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '6px' }}>No. HP <span style={{ color: '#FF4F31' }}>*</span></label>
                    <input className={inp} style={ist} {...foc} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08xxxxxxxxxx" required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '6px' }}>Tanggal Lahir</label>
                    <input type="date" className={inp} style={ist} {...foc} value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '6px' }}>Domisili</label>
                    <input className={inp} style={ist} {...foc} value={form.domicile} onChange={e => set('domicile', e.target.value)} placeholder="Kota kamu" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '6px' }}>Instagram</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#8A8A8D' }}>@</span>
                    <input className={inp} style={{ ...ist, paddingLeft: '32px' }} {...foc} value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)} placeholder="username_kamu" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '6px' }}>Pendidikan Terakhir</label>
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
              <button type="button" onClick={() => { if (!form.full_name || !form.email || !form.phone) { setError('Lengkapi nama, email, dan nomor HP'); return } setError(''); setStep(2) }}
                style={{ width: '100%', marginTop: '24px', padding: '14px', borderRadius: '12px', backgroundColor: '#037894', color: '#fff', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer' }}>
                Lanjut →
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '32px', border: '1.5px solid #E8E4E0', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '6px' }}>Posisi yang Dilamar <span style={{ color: '#FF4F31' }}>*</span></label>
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
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '6px' }}>Preferensi Outlet</label>
                  <select className={inp} style={ist} {...foc} value={form.outlet_preference} onChange={e => set('outlet_preference', e.target.value)}>
                    <option value="">Tidak ada preferensi</option>
                    <option value="Kelapa Gading">Kelapa Gading</option>
                    <option value="MKG">MKG</option>
                    <option value="BSD">BSD</option>
                    <option value="SMS">SMS</option>
                    <option value="SMB">SMB Gold Lounge</option>
                    <option value="Semarang">Semarang</option>
                  </select>
                </div>
                <div style={{ padding: '18px', borderRadius: '14px', backgroundColor: '#F7F5F2', border: '1px solid #E8E4E0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#020000', margin: '0 0 2px' }}>Pengalaman di kafe?</p>
                      <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>Specialty / coffee shop</p>
                    </div>
                    <button type="button" onClick={() => set('has_cafe_experience', !form.has_cafe_experience)}
                      style={{ width: '46px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: form.has_cafe_experience ? '#037894' : '#D4CFC9', flexShrink: 0, transition: 'background 0.2s' }}>
                      <span style={{ position: 'absolute', top: '3px', width: '20px', height: '20px', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: form.has_cafe_experience ? 'translateX(23px)' : 'translateX(3px)' }} />
                    </button>
                  </div>
                  {form.has_cafe_experience && (
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #E8E4E0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                <div style={{ padding: '18px', borderRadius: '14px', backgroundColor: '#F7F5F2', border: '1px solid #E8E4E0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#020000', margin: '0 0 2px' }}>Punya sertifikasi barista?</p>
                      <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>SCA, SCAI, atau lainnya</p>
                    </div>
                    <button type="button" onClick={() => set('has_barista_cert', !form.has_barista_cert)}
                      style={{ width: '46px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: form.has_barista_cert ? '#037894' : '#D4CFC9', flexShrink: 0, transition: 'background 0.2s' }}>
                      <span style={{ position: 'absolute', top: '3px', width: '20px', height: '20px', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: form.has_barista_cert ? 'translateX(23px)' : 'translateX(3px)' }} />
                    </button>
                  </div>
                  {form.has_barista_cert && (
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #E8E4E0' }}>
                      <input className={inp} style={ist} {...foc} value={form.cert_detail} onChange={e => set('cert_detail', e.target.value)} placeholder="Nama sertifikasi dan tahun" />
                    </div>
                  )}
                </div>
              </div>
              {error && <p style={{ fontSize: '13px', color: '#FF4F31', marginTop: '12px' }}>{error}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '24px' }}>
                <button type="button" onClick={() => setStep(1)} style={{ padding: '14px', borderRadius: '12px', border: '1.5px solid #D4CFC9', backgroundColor: 'transparent', color: '#4C4845', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>← Kembali</button>
                <button type="button" onClick={() => { if (!form.position_applied) { setError('Pilih posisi'); return } setError(''); setStep(3) }}
                  style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#037894', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer' }}>Lanjut →</button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '32px', border: '1.5px solid #E8E4E0', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '6px' }}>Kenapa ingin bergabung?</label>
                  <textarea className={inp} style={{ ...ist, resize: 'none' }} {...foc} value={form.motivation} onChange={e => set('motivation', e.target.value)} rows={4} placeholder="Ceritakan motivasimu..." />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#020000', marginBottom: '4px' }}>Upload CV</label>
                  <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '0 0 10px' }}>PDF · Maks 3MB · Maks 2 file</p>
                  {files.length < 2 && (
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', borderRadius: '14px', border: '2px dashed #D4CFC9', backgroundColor: '#FAFAF9', cursor: 'pointer' }}
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
                <div style={{ padding: '18px', borderRadius: '14px', backgroundColor: '#F7F5F2' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#8A8A8D', textTransform: 'uppercase', margin: '0 0 12px' }}>Ringkasan</p>
                  {[['Nama', form.full_name], ['Posisi', form.position_applied], ['Pengalaman', form.has_cafe_experience ? `${form.cafe_experience_years} thn` : 'Belum ada'], ['Dokumen', files.length > 0 ? `${files.length} file` : 'Tidak ada']].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E8E4E0' }}>
                      <span style={{ fontSize: '13px', color: '#8A8A8D' }}>{k}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#020000' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              {error && <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FFF0EE', color: '#FF4F31', fontSize: '13px', marginTop: '12px' }}>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '24px' }}>
                <button type="button" onClick={() => setStep(2)} style={{ padding: '14px', borderRadius: '12px', border: '1.5px solid #D4CFC9', backgroundColor: 'transparent', color: '#4C4845', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>← Kembali</button>
                <button type="submit" disabled={loading} style={{ padding: '14px', borderRadius: '12px', backgroundColor: loading ? '#8A8A8D' : '#020000', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Mengirim...' : 'Kirim Lamaran ☕'}
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: '11px', color: '#8A8A8D', marginTop: '14px' }}>Data kamu aman dan hanya digunakan untuk proses rekrutmen.</p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}