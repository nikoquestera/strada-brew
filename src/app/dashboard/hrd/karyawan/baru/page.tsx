'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function TambahKaryawan() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    employee_id: '',
    full_name: '',
    nick_name: '',
    email: '',
    phone: '',
    id_number: '',
    birth_date: '',
    gender: '',
    address: '',
    position: '',
    department: '',
    entity: 'CV_KTN',
    outlet: '',
    employment_type: 'PKWT',
    contract_start: '',
    contract_end: '',
    join_date: '',
    base_salary: '',
    status: 'active',
    notes: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      ...form,
      base_salary: form.base_salary ? parseFloat(form.base_salary.replace(/\D/g, '')) : null,
      birth_date: form.birth_date || null,
      contract_start: form.contract_start || null,
      contract_end: form.contract_end || null,
      nick_name: form.nick_name || null,
      email: form.email || null,
      id_number: form.id_number || null,
      gender: form.gender || null,
      outlet: form.outlet || null,
      notes: form.notes || null,
    }

    const { error } = await supabase.from('employees').insert([payload])

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard/hrd/karyawan')
  }

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1">
          ← Kembali
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Tambah Karyawan Baru</h1>
        <p className="text-gray-500 text-sm mt-1">Isi data lengkap karyawan</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Section: Data Pribadi */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-5">Data Pribadi</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>ID Karyawan <span className="text-red-400">*</span></label>
              <input className={inputClass} value={form.employee_id} onChange={e => set('employee_id', e.target.value)} placeholder="STR-001" required />
            </div>
            <div>
              <label className={labelClass}>Nama Lengkap <span className="text-red-400">*</span></label>
              <input className={inputClass} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nama sesuai KTP" required />
            </div>
            <div>
              <label className={labelClass}>Nama Panggilan</label>
              <input className={inputClass} value={form.nick_name} onChange={e => set('nick_name', e.target.value)} placeholder="Nama panggilan" />
            </div>
            <div>
              <label className={labelClass}>NIK KTP</label>
              <input className={inputClass} value={form.id_number} onChange={e => set('id_number', e.target.value)} placeholder="16 digit NIK" />
            </div>
            <div>
              <label className={labelClass}>Tanggal Lahir</label>
              <input type="date" className={inputClass} value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Jenis Kelamin</label>
              <select className={inputClass} value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Pilih</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@stradacoffee.com" />
            </div>
            <div>
              <label className={labelClass}>No. HP</label>
              <input className={inputClass} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Alamat</label>
              <textarea className={inputClass} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Alamat lengkap" rows={2} />
            </div>
          </div>
        </div>

        {/* Section: Data Pekerjaan */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-5">Data Pekerjaan</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Posisi / Jabatan <span className="text-red-400">*</span></label>
              <input className={inputClass} value={form.position} onChange={e => set('position', e.target.value)} placeholder="Barista, SPV, dll" required />
            </div>
            <div>
              <label className={labelClass}>Departemen <span className="text-red-400">*</span></label>
              <input className={inputClass} value={form.department} onChange={e => set('department', e.target.value)} placeholder="Operations, HRD, Finance, dll" required />
            </div>
            <div>
              <label className={labelClass}>Entity <span className="text-red-400">*</span></label>
              <select className={inputClass} value={form.entity} onChange={e => set('entity', e.target.value)} required>
                <option value="CV_KTN">CV KTN (Jakarta)</option>
                <option value="CV_PRI">CV PRI (Semarang)</option>
                <option value="PT_BSB">PT BSB (Roastery)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Outlet / Lokasi</label>
              <select className={inputClass} value={form.outlet} onChange={e => set('outlet', e.target.value)}>
                <option value="">Pilih outlet</option>
                <option value="Kelapa Gading">Kelapa Gading (La Piazza)</option>
                <option value="MKG">MKG</option>
                <option value="BSD">BSD (UpperWest)</option>
                <option value="SMS">SMS</option>
                <option value="SMB">SMB Gold Lounge</option>
                <option value="SMB2">SMB2</option>
                <option value="Semarang">Semarang</option>
                <option value="HO Jakarta">HO Jakarta</option>
                <option value="HO Semarang">HO Semarang</option>
                <option value="Roastery">Roastery</option>
                <option value="Academy">Academy</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Tipe Kontrak</label>
              <select className={inputClass} value={form.employment_type} onChange={e => set('employment_type', e.target.value)}>
                <option value="PKWT">PKWT (Kontrak)</option>
                <option value="PKWTT">PKWTT (Tetap)</option>
                <option value="Freelance">Freelance</option>
                <option value="Magang">Magang</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Tanggal Masuk <span className="text-red-400">*</span></label>
              <input type="date" className={inputClass} value={form.join_date} onChange={e => set('join_date', e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>Mulai Kontrak</label>
              <input type="date" className={inputClass} value={form.contract_start} onChange={e => set('contract_start', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Akhir Kontrak</label>
              <input type="date" className={inputClass} value={form.contract_end} onChange={e => set('contract_end', e.target.value)} />
              {form.employment_type === 'PKWTT' && (
                <p className="text-xs text-gray-400 mt-1">Kosongkan untuk karyawan tetap</p>
              )}
            </div>
          </div>
        </div>

        {/* Section: Gaji */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-5">Gaji & Kompensasi</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Gaji Pokok</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-gray-400">Rp</span>
                <input
                  className={`${inputClass} pl-9`}
                  value={form.base_salary}
                  onChange={e => set('base_salary', e.target.value)}
                  placeholder="5.000.000"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Catatan</label>
              <textarea className={inputClass} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Catatan tambahan..." rows={2} />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
            Error: {error}
          </div>
        )}

        <div className="flex gap-3 pb-8">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Batal
          </button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
            {loading ? 'Menyimpan...' : 'Simpan Karyawan'}
          </button>
        </div>
      </form>
    </div>
  )
}