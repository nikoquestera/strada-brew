'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ApplyPage() {
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    domicile: '',
    instagram_url: '',
    position_applied: '',
    outlet_preference: '',
    entity_target: '',
    source: 'Portal',
    has_cafe_experience: false,
    cafe_experience_years: '0',
    cafe_experience_detail: '',
    has_barista_cert: false,
    cert_detail: '',
    education_level: '',
    motivation: '',
  })

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      birth_date: form.birth_date || null,
      domicile: form.domicile || null,
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

    const { error } = await supabase.from('applicants').insert([payload])

    if (error) {
      setError('Terjadi kesalahan. Coba lagi atau hubungi HR kami.')
      setLoading(false)
      return
    }

    setSubmitted(true)
  }

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"

  if (submitted) return (
    <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Lamaran Terkirim!</h2>
        <p className="text-gray-500 text-sm mb-2">
          Terima kasih, <span className="font-medium text-gray-700">{form.full_name}</span>.
        </p>
        <p className="text-gray-400 text-sm">
          Tim HR kami akan menghubungi kamu dalam 3–5 hari kerja jika profil kamu sesuai dengan kebutuhan kami.
        </p>
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">Strada Coffee — Indonesia Specialty Coffee since 2012</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F7F5F2]">
      {/* Header */}
      <div className="bg-[#1a1a1a] py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Strada Coffee</p>
          <h1 className="text-white text-2xl font-bold">Bergabung dengan Tim Kami</h1>
          <p className="text-white/60 text-sm mt-2">Indonesia Specialty Coffee since 2012</p>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                step >= s ? 'bg-[#1a1a1a] text-white' : 'bg-white border border-gray-200 text-gray-400'
              }`}>{s}</div>
              <div className={`flex-1 h-0.5 ${s < 3 ? (step > s ? 'bg-[#1a1a1a]' : 'bg-gray-200') : 'hidden'}`} />
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>

          {/* Step 1: Data Diri */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-1">Data Diri</h2>
              <p className="text-gray-400 text-sm mb-6">Informasi dasar tentang kamu</p>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Nama Lengkap <span className="text-red-400">*</span></label>
                  <input className={inputClass} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Sesuai KTP" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Email <span className="text-red-400">*</span></label>
                    <input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@kamu.com" required />
                  </div>
                  <div>
                    <label className={labelClass}>No. HP <span className="text-red-400">*</span></label>
                    <input className={inputClass} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08xxxxxxxxxx" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Tanggal Lahir</label>
                    <input type="date" className={inputClass} value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Domisili</label>
                    <input className={inputClass} value={form.domicile} onChange={e => set('domicile', e.target.value)} placeholder="Kota domisili" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Instagram</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-sm text-gray-400">@</span>
                    <input className={`${inputClass} pl-8`} value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)} placeholder="username_kamu" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Opsional tapi membantu proses seleksi</p>
                </div>
                <div>
                  <label className={labelClass}>Pendidikan Terakhir</label>
                  <select className={inputClass} value={form.education_level} onChange={e => set('education_level', e.target.value)}>
                    <option value="">Pilih</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA/SMK</option>
                    <option value="D3">D3</option>
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                  </select>
                </div>
              </div>
              <button type="button" onClick={() => { if (!form.full_name || !form.email || !form.phone) { setError('Lengkapi nama, email, dan no. HP'); return; } setError(''); setStep(2) }} className="w-full mt-6 bg-[#1a1a1a] text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
                Lanjut →
              </button>
              {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
            </div>
          )}

          {/* Step 2: Posisi & Pengalaman */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-1">Posisi & Pengalaman</h2>
              <p className="text-gray-400 text-sm mb-6">Posisi yang kamu lamar dan background kamu</p>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Posisi yang Dilamar <span className="text-red-400">*</span></label>
                  <select className={inputClass} value={form.position_applied} onChange={e => set('position_applied', e.target.value)} required>
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
                  <label className={labelClass}>Preferensi Outlet</label>
                  <select className={inputClass} value={form.outlet_preference} onChange={e => set('outlet_preference', e.target.value)}>
                    <option value="">Tidak ada preferensi</option>
                    <option value="Kelapa Gading">Kelapa Gading</option>
                    <option value="MKG">MKG</option>
                    <option value="BSD">BSD</option>
                    <option value="SMS">SMS</option>
                    <option value="SMB">SMB Gold Lounge</option>
                    <option value="Semarang">Semarang</option>
                  </select>
                </div>

                {/* Pengalaman kafe */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Punya pengalaman di kafe?</p>
                      <p className="text-xs text-gray-400">Kafe specialty / coffee shop</p>
                    </div>
                    <button type="button" onClick={() => set('has_cafe_experience', !form.has_cafe_experience)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${form.has_cafe_experience ? 'bg-gray-900' : 'bg-gray-300'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${form.has_cafe_experience ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {form.has_cafe_experience && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                      <div>
                        <label className={labelClass}>Berapa tahun?</label>
                        <select className={inputClass} value={form.cafe_experience_years} onChange={e => set('cafe_experience_years', e.target.value)}>
                          <option value="0.5">Kurang dari 1 tahun</option>
                          <option value="1">1 tahun</option>
                          <option value="2">2 tahun</option>
                          <option value="3">3 tahun</option>
                          <option value="5">4–5 tahun</option>
                          <option value="6">Lebih dari 5 tahun</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Di kafe mana saja?</label>
                        <input className={inputClass} value={form.cafe_experience_detail} onChange={e => set('cafe_experience_detail', e.target.value)} placeholder="Nama kafe / kedai kopi" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Sertifikasi */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Punya sertifikasi barista?</p>
                      <p className="text-xs text-gray-400">SCA, SCAI, atau sertifikasi lainnya</p>
                    </div>
                    <button type="button" onClick={() => set('has_barista_cert', !form.has_barista_cert)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${form.has_barista_cert ? 'bg-gray-900' : 'bg-gray-300'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${form.has_barista_cert ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {form.has_barista_cert && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <label className={labelClass}>Detail sertifikasi</label>
                      <input className={inputClass} value={form.cert_detail} onChange={e => set('cert_detail', e.target.value)} placeholder="Nama sertifikasi dan tahun" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  ← Kembali
                </button>
                <button type="button" onClick={() => { if (!form.position_applied) { setError('Pilih posisi yang dilamar'); return; } setError(''); setStep(3) }} className="flex-2 flex-1 bg-[#1a1a1a] text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
                  Lanjut →
                </button>
              </div>
              {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
            </div>
          )}

          {/* Step 3: Motivasi & Submit */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-1">Satu Langkah Lagi</h2>
              <p className="text-gray-400 text-sm mb-6">Ceritakan sedikit tentang dirimu</p>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Kenapa ingin bergabung dengan Strada Coffee?</label>
                  <textarea className={inputClass} value={form.motivation} onChange={e => set('motivation', e.target.value)} rows={4} placeholder="Ceritakan motivasi kamu bergabung..." />
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Ringkasan Lamaran</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Nama</span>
                    <span className="font-medium text-gray-800">{form.full_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Posisi</span>
                    <span className="font-medium text-gray-800">{form.position_applied}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Pengalaman kafe</span>
                    <span className="font-medium text-gray-800">{form.has_cafe_experience ? `${form.cafe_experience_years} thn` : 'Belum ada'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sertifikasi</span>
                    <span className="font-medium text-gray-800">{form.has_barista_cert ? 'Ada' : 'Belum ada'}</span>
                  </div>
                </div>
              </div>

              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mt-4">{error}</div>}

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  ← Kembali
                </button>
                <button type="submit" disabled={loading} className="flex-1 bg-[#1a1a1a] text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
                  {loading ? 'Mengirim...' : 'Kirim Lamaran'}
                </button>
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">
                Dengan mengirim lamaran, kamu menyetujui bahwa data yang diberikan adalah benar.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}