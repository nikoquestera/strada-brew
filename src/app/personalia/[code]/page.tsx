'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  User, Users, Home, Car, GraduationCap, Languages, 
  Briefcase, Landmark, Heart, Phone, AlertCircle, Info, Star, Plus, Trash2, MapPin, Mail, CreditCard
} from 'lucide-react'

type FormData = {
  // Identity
  full_name: string
  nickname: string
  gender: string
  birth_place: string
  birth_date: string
  religion: string
  blood_type: string
  identity_number: string
  address_ktp: string
  address_domicile: string
  phone: string
  home_phone: string
  email: string
  postal_code: string
  
  // Family
  marital_status: string
  marital_since: string
  family_data: any[] // Suami/Istri & Anak
  parents_siblings: any[] // Ayah, Ibu, Saudara
  
  // Housing & Transport
  housing_status: string
  housing_other: string
  vehicle_used: string
  
  // Education & Skills
  education_history: any[]
  language_skills: any[]
  training_history: any[]
  
  // Work
  work_history: any[]
  bpjs_kesehatan: string
  bpjs_ketenagakerjaan: string
  npwp: string
  bank_account_number: string
  bank_account_name: string
  happiest_workplace: string
  happiest_workplace_reason: string
  
  // Interests
  job_interests: any[]
  expected_salary: string
  expected_facilities: string
  willing_to_be_relocated: string
  relocation_refusal_reason: string
  
  // Social
  social_sports: string
  social_hobbies: string
  social_organizations: string
  
  // References
  references: any[]
  internal_acquaintances: any[]
  
  // Medical
  medical_history: any[]
  psychotest_history: any[]
  
  // Self
  self_description: string
}

export default function PersonaliaFormPage() {
  const router = useRouter()
  const params = useParams()
  const code = (params.code as string).toUpperCase()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<FormData>({
    full_name: '', nickname: '', gender: 'Lk', birth_place: '', birth_date: '',
    religion: '', blood_type: '', identity_number: '', address_ktp: '', address_domicile: '',
    phone: '', home_phone: '', email: '', postal_code: '',
    marital_status: 'Bujangan', marital_since: '',
    family_data: [
      { relation: 'Suami/Istri', name: '', gender: '', birth_date: '', education: '', occupation: '' },
      { relation: 'Anak 1', name: '', gender: '', birth_date: '', education: '', occupation: '' },
      { relation: 'Anak 2', name: '', gender: '', birth_date: '', education: '', occupation: '' },
      { relation: 'Anak 3', name: '', gender: '', birth_date: '', education: '', occupation: '' },
    ],
    parents_siblings: [
      { relation: 'Ayah', name: '', gender: 'Lk', birth_date: '', education: '', occupation: '' },
      { relation: 'Ibu', name: '', gender: 'Pr', birth_date: '', education: '', occupation: '' },
      { relation: 'Anak 1', name: '', gender: '', birth_date: '', education: '', occupation: '' },
      { relation: 'Anak 2', name: '', gender: '', birth_date: '', education: '', occupation: '' },
      { relation: 'Anak 3', name: '', gender: '', birth_date: '', education: '', occupation: '' },
    ],
    housing_status: '', housing_other: '', vehicle_used: '',
    education_history: [
      { level: 'SD', school_name: '', major: '', city: '', graduation_year: '' },
      { level: 'SMP', school_name: '', major: '', city: '', graduation_year: '' },
      { level: 'SMA', school_name: '', major: '', city: '', graduation_year: '' },
      { level: 'UNIVERSITAS', school_name: '', major: '', city: '', graduation_year: '' },
      { level: 'PASCA SARJANA', school_name: '', major: '', city: '', graduation_year: '' },
    ],
    language_skills: [
      { language: '', spoken: 'Cukup', written: 'Cukup' }
    ],
    training_history: [
      { name: '', location: '', duration: '', year: '', description: '' }
    ],
    work_history: [
      { company_name: '', duration: '', position: '', salary: '', reason_for_leaving: '' }
    ],
    bpjs_kesehatan: '', bpjs_ketenagakerjaan: '', npwp: '', bank_account_number: '', bank_account_name: '',
    happiest_workplace: '', happiest_workplace_reason: '',
    job_interests: [
      { type: '', rank: '1' },
      { type: '', rank: '2' },
      { type: '', rank: '3' },
    ],
    expected_salary: '', expected_facilities: '', willing_to_be_relocated: 'Ya', relocation_refusal_reason: '',
    social_sports: '', social_hobbies: '', social_organizations: '',
    references: [
      { name: '', address: '', phone: '', relationship: 'Mantan Atasan' },
      { name: '', address: '', phone: '', relationship: 'Teman Sekerja' },
      { name: '', address: '', phone: '', relationship: 'Saudara' },
    ],
    internal_acquaintances: [
      { name: '', position: '', relationship: '' }
    ],
    medical_history: [
      { hospital: '', year: '', duration: '', reason: '' }
    ],
    psychotest_history: [
      { place: '', year: '', purpose: '' }
    ],
    self_description: ''
  })

  useEffect(() => {
    async function validate() {
      const { data: sess, error: sessErr } = await supabase
        .from('personalia_sessions')
        .select('*, applicants(*)')
        .eq('access_code', code)
        .single()

      if (sessErr || !sess) {
        setError('Kode akses tidak valid atau sudah kadaluarsa.')
        setLoading(false)
        return
      }

      if (sess.status === 'completed') {
        router.push(`/personalia/${code}/selesai`)
        return
      }

      setSession(sess)
      setForm(prev => ({ 
        ...prev, 
        full_name: sess.applicants.full_name || '',
        email: sess.applicants.email || '',
        phone: sess.applicants.phone || '',
        address_domicile: sess.applicants.domicile || '',
        birth_date: sess.applicants.birth_date || '',
      }))
      setLoading(false)
    }
    validate()
  }, [code, router, supabase])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/rekrutmen/personalia/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: code, form })
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Gagal menyimpan data')
      }
      router.push(`/personalia/${code}/selesai`)
    } catch (err: any) {
      alert(err.message)
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-20 text-center font-bold text-strada-blue">Memvalidasi kode...</div>
  if (error) return <div className="p-20 text-center text-red-600 font-bold">{error}</div>

  const lbl = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '6px' }

  const SectionHeader = ({ icon: Icon, title }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', marginTop: '48px', paddingBottom: '12px', borderBottom: '2px solid #F0EEEC' }}>
      <div style={{ backgroundColor: '#E6F4F8', padding: '8px', borderRadius: '10px' }}>
        <Icon size={18} color="#037894" />
      </div>
      <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#020000', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>{title}</h2>
    </div>
  )

  const InputField = ({ label, value, onChange, type = 'text', placeholder = '' }: any) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2', padding: '40px 16px 120px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '24px', padding: '48px', border: '1.5px solid #E8E4E0', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <img src="/strada-logo.svg" alt="Strada Coffee" style={{ height: '40px', marginBottom: '20px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#020000', margin: '0 0 8px' }}>DATA PERSONALIA KARYAWAN</h1>
          <div style={{ display: 'inline-block', padding: '6px 16px', backgroundColor: '#F7F5F2', borderRadius: 'full', fontSize: '12px', fontWeight: 800, color: '#037894', letterSpacing: '1px' }}>
            DOC: HRD.01.AC.2024
          </div>
        </div>

        {/* IDENTITAS */}
        <SectionHeader icon={User} title="Identitas Pribadi" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <InputField label="Nama Lengkap" value={form.full_name} onChange={(v:any) => setForm({...form, full_name: v})} />
          </div>
          <InputField label="Nama Panggilan" value={form.nickname} onChange={(v:any) => setForm({...form, nickname: v})} />
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', marginBottom: '6px' }}>Jenis Kelamin</label>
            <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', outline: 'none' }}>
              <option value="Lk">Laki-laki</option>
              <option value="Pr">Perempuan</option>
            </select>
          </div>
          <InputField label="Tempat Lahir" value={form.birth_place} onChange={(v:any) => setForm({...form, birth_place: v})} />
          <InputField label="Tanggal Lahir" type="date" value={form.birth_date} onChange={(v:any) => setForm({...form, birth_date: v})} />
          <InputField label="Agama" value={form.religion} onChange={(v:any) => setForm({...form, religion: v})} />
          <InputField label="Golongan Darah" value={form.blood_type} onChange={(v:any) => setForm({...form, blood_type: v})} />
          <InputField label="Nomor KTP / SIM" value={form.identity_number} onChange={(v:any) => setForm({...form, identity_number: v})} />
          <InputField label="No. Handphone" value={form.phone} onChange={(v:any) => setForm({...form, phone: v})} />
          <div style={{ gridColumn: 'span 2' }}>
            <InputField label="Alamat KTP" value={form.address_ktp} onChange={(v:any) => setForm({...form, address_ktp: v})} />
            <InputField label="Alamat Domisili" value={form.address_domicile} onChange={(v:any) => setForm({...form, address_domicile: v})} />
          </div>
          <InputField label="No. Telp Rumah" value={form.home_phone} onChange={(v:any) => setForm({...form, home_phone: v})} />
          <InputField label="Kode Pos" value={form.postal_code} onChange={(v:any) => setForm({...form, postal_code: v})} />
        </div>

        {/* KELUARGA */}
        <SectionHeader icon={Users} title="Keluarga & Lingkungan" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', marginBottom: '6px' }}>Status Pernikahan</label>
            <select value={form.marital_status} onChange={e => setForm({...form, marital_status: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', outline: 'none' }}>
              <option value="Bujangan">Bujangan</option>
              <option value="Bertunangan">Bertunangan</option>
              <option value="Menikah">Menikah</option>
              <option value="Bercerai">Bercerai</option>
            </select>
          </div>
          <InputField label="Sejak Tanggal" type="date" value={form.marital_since} onChange={(v:any) => setForm({...form, marital_since: v})} />
        </div>

        <p style={{ fontSize: '12px', fontWeight: 800, color: '#4C4845', marginBottom: '12px' }}>SUSUNAN KELUARGA (Suami / Istri / Anak)</p>
        <div style={{ overflowX: 'auto', marginBottom: '32px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F7F5F2' }}>
                {['Hubungan', 'Nama', 'L/P', 'Tgl Lahir', 'Pendidikan', 'Pekerjaan'].map(h => <th key={h} style={{ padding: '10px', border: '1px solid #E8E4E0', textAlign: 'left' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {form.family_data.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px', border: '1px solid #E8E4E0', fontWeight: 600 }}>{row.relation}</td>
                  {['name', 'gender', 'birth_date', 'education', 'occupation'].map(k => (
                    <td key={k} style={{ padding: '0', border: '1px solid #E8E4E0' }}>
                      <input value={row[k]} onChange={e => {
                        const newData = [...form.family_data]; newData[i][k] = e.target.value; setForm({...form, family_data: newData})
                      }} style={{ width: '100%', border: 'none', padding: '8px', boxSizing: 'border-box', outline: 'none' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: '12px', fontWeight: 800, color: '#4C4845', marginBottom: '12px' }}>SUSUNAN KELUARGA (Ayah, Ibu, Saudara Kandung)</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F7F5F2' }}>
                {['Hubungan', 'Nama', 'L/P', 'Tgl Lahir', 'Pendidikan', 'Pekerjaan'].map(h => <th key={h} style={{ padding: '10px', border: '1px solid #E8E4E0', textAlign: 'left' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {form.parents_siblings.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px', border: '1px solid #E8E4E0', fontWeight: 600 }}>{row.relation}</td>
                  {['name', 'gender', 'birth_date', 'education', 'occupation'].map(k => (
                    <td key={k} style={{ padding: '0', border: '1px solid #E8E4E0' }}>
                      <input value={row[k]} onChange={e => {
                        const newData = [...form.parents_siblings]; newData[i][k] = e.target.value; setForm({...form, parents_siblings: newData})
                      }} style={{ width: '100%', border: 'none', padding: '8px', boxSizing: 'border-box', outline: 'none' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RUMAH & KENDARAAN */}
        <SectionHeader icon={Home} title="Rumah & Kendaraan" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', marginBottom: '6px' }}>Rumah yang Ditempati</label>
            <select value={form.housing_status} onChange={e => setForm({...form, housing_status: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', outline: 'none' }}>
              <option value="">Pilih Status...</option>
              <option value="Rumah Pribadi">Rumah Pribadi</option>
              <option value="Rumah Orang Tua">Rumah Orang Tua</option>
              <option value="Kontrak">Kontrak</option>
              <option value="Sewa">Sewa</option>
              <option value="Kost">Kost</option>
              <option value="Lain-lain">Lain-lain</option>
            </select>
          </div>
          {form.housing_status === 'Lain-lain' && <InputField label="Sebutkan Lain-lain" value={form.housing_other} onChange={(v:any) => setForm({...form, housing_other: v})} />}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', marginBottom: '6px' }}>Kendaraan yang Digunakan</label>
            <select value={form.vehicle_used} onChange={e => setForm({...form, vehicle_used: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', outline: 'none' }}>
              <option value="">Pilih Kendaraan...</option>
              <option value="Mobil">Mobil</option>
              <option value="Motor">Motor</option>
              <option value="Kendaraan Umum">Kendaraan Umum</option>
            </select>
          </div>
        </div>

        {/* PENDIDIKAN */}
        <SectionHeader icon={GraduationCap} title="Pendidikan Resmi" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F7F5F2' }}>
                {['Tingkat', 'Nama Sekolah', 'Jurusan', 'Kota', 'Thn Ijazah'].map(h => <th key={h} style={{ padding: '10px', border: '1px solid #E8E4E0', textAlign: 'left' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {form.education_history.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '10px', border: '1px solid #E8E4E0', fontWeight: 700 }}>{row.level}</td>
                  {['school_name', 'major', 'city', 'graduation_year'].map(k => (
                    <td key={k} style={{ padding: '0', border: '1px solid #E8E4E0' }}>
                      <input value={row[k]} onChange={e => {
                        const newData = [...form.education_history]; newData[i][k] = e.target.value; setForm({...form, education_history: newData})
                      }} style={{ width: '100%', border: 'none', padding: '8px', boxSizing: 'border-box', outline: 'none' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BAHASA */}
        <SectionHeader icon={Languages} title="Bahasa Asing / Daerah" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F7F5F2' }}>
                <th style={{ padding: '10px', border: '1px solid #E8E4E0', textAlign: 'left' }}>Bahasa</th>
                <th style={{ padding: '10px', border: '1px solid #E8E4E0', textAlign: 'left' }}>Lisan</th>
                <th style={{ padding: '10px', border: '1px solid #E8E4E0', textAlign: 'left' }}>Tulisan</th>
                <th style={{ padding: '10px', border: '1px solid #E8E4E0', textAlign: 'center', width: '50px' }}>Hapus</th>
              </tr>
            </thead>
            <tbody>
              {form.language_skills.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '0', border: '1px solid #E8E4E0' }}><input value={row.language} onChange={e => {
                    const n = [...form.language_skills]; n[i].language = e.target.value; setForm({...form, language_skills: n})
                  }} style={{ width: '100%', border: 'none', padding: '10px', outline: 'none' }} /></td>
                  <td style={{ padding: '0', border: '1px solid #E8E4E0' }}>
                    <select value={row.spoken} onChange={e => { const n = [...form.language_skills]; n[i].spoken = e.target.value; setForm({...form, language_skills: n}) }}
                      style={{ width: '100%', border: 'none', padding: '10px', outline: 'none' }}>
                      <option value="Kurang">Kurang</option><option value="Cukup">Cukup</option><option value="Baik">Baik</option>
                    </select>
                  </td>
                  <td style={{ padding: '0', border: '1px solid #E8E4E0' }}>
                    <select value={row.written} onChange={e => { const n = [...form.language_skills]; n[i].written = e.target.value; setForm({...form, language_skills: n}) }}
                      style={{ width: '100%', border: 'none', padding: '10px', outline: 'none' }}>
                      <option value="Kurang">Kurang</option><option value="Cukup">Cukup</option><option value="Baik">Baik</option>
                    </select>
                  </td>
                  <td style={{ padding: '0', border: '1px solid #E8E4E0', textAlign: 'center' }}>
                    <button onClick={() => setForm({...form, language_skills: form.language_skills.filter((_, idx) => idx !== i)})} style={{ background: 'none', border: 'none', color: '#FF4F31', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setForm({...form, language_skills: [...form.language_skills, {language:'', spoken:'Cukup', written:'Cukup'}]})}
            style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: '1.5px dashed #037894', color: '#037894', fontSize: '12px', fontWeight: 700, cursor: 'pointer', background: 'none' }}>+ Tambah Bahasa</button>
        </div>

        {/* TRAINING */}
        <SectionHeader icon={Star} title="Kursus / Training" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F7F5F2' }}>
                {['Nama Kursus', 'Tempat', 'Lama', 'Tahun', 'Keterangan'].map(h => <th key={h} style={{ padding: '10px', border: '1px solid #E8E4E0', textAlign: 'left' }}>{h}</th>)}
                <th style={{ border: '1px solid #E8E4E0', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {form.training_history.map((row, i) => (
                <tr key={i}>
                  {['name', 'location', 'duration', 'year', 'description'].map(k => (
                    <td key={k} style={{ padding: '0', border: '1px solid #E8E4E0' }}>
                      <input value={row[k]} onChange={e => { const n = [...form.training_history]; n[i][k] = e.target.value; setForm({...form, training_history: n}) }}
                        style={{ width: '100%', border: 'none', padding: '8px', outline: 'none' }} />
                    </td>
                  ))}
                  <td style={{ padding: '0', border: '1px solid #E8E4E0', textAlign: 'center' }}>
                     <button onClick={() => setForm({...form, training_history: form.training_history.filter((_, idx) => idx !== i)})} style={{ background: 'none', border: 'none', color: '#FF4F31', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setForm({...form, training_history: [...form.training_history, {name:'', location:'', duration:'', year:'', description:''}]})}
            style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: '1.5px dashed #037894', color: '#037894', fontSize: '12px', fontWeight: 700, cursor: 'pointer', background: 'none' }}>+ Tambah Kursus</button>
        </div>

        {/* PEKERJAAN */}
        <SectionHeader icon={Briefcase} title="Riwayat Pekerjaan" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {form.work_history.map((row, i) => (
            <div key={i} style={{ padding: '24px', borderRadius: '16px', border: '1.5px solid #E8E4E0', backgroundColor: '#F9FBFB', position: 'relative' }}>
              {form.work_history.length > 1 && (
                <button onClick={() => setForm({...form, work_history: form.work_history.filter((_, idx) => idx !== i)})}
                  style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#FF4F31', cursor: 'pointer' }}><Trash2 size={18} /></button>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <InputField label="Nama Perusahaan" value={row.company_name} onChange={(v:any) => { const n = [...form.work_history]; n[i].company_name = v; setForm({...form, work_history: n}) }} />
                </div>
                <InputField label="Jabatan" value={row.position} onChange={(v:any) => { const n = [...form.work_history]; n[i].position = v; setForm({...form, work_history: n}) }} />
                <InputField label="Masa Kerja (e.g. 2021-2023)" value={row.duration} onChange={(v:any) => { const n = [...form.work_history]; n[i].duration = v; setForm({...form, work_history: n}) }} />
                <InputField label="Gaji Terakhir" value={row.salary} onChange={(v:any) => { const n = [...form.work_history]; n[i].salary = v; setForm({...form, work_history: n}) }} />
                <InputField label="Alasan Pindah" value={row.reason_for_leaving} onChange={(v:any) => { const n = [...form.work_history]; n[i].reason_for_leaving = v; setForm({...form, work_history: n}) }} />
              </div>
            </div>
          ))}
          <button onClick={() => setForm({...form, work_history: [...form.work_history, {company_name:'', duration:'', position:'', salary:'', reason_for_leaving:''}]})}
            style={{ padding: '12px', borderRadius: '12px', border: '1.5px dashed #037894', backgroundColor: 'transparent', color: '#037894', fontWeight: 700, cursor: 'pointer' }}>+ Tambah Riwayat Pekerjaan</button>
        </div>

        <div style={{ marginTop: '24px' }}>
           <InputField label="Di perusahaan mana Anda paling senang bekerja?" value={form.happiest_workplace} onChange={(v:any) => setForm({...form, happiest_workplace: v})} />
           <InputField label="Mengapa?" value={form.happiest_workplace_reason} onChange={(v:any) => setForm({...form, happiest_workplace_reason: v})} />
        </div>

        {/* MINAT PEKERJAAN */}
        <SectionHeader icon={Star} title="Minat Terhadap Pekerjaan" />
        <p style={{ fontSize: '13px', color: '#4C4845', marginBottom: '16px' }}>Berikan nomor (rangking) sesuai minat Anda, No. 1 sebagai prioritas utama.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {form.job_interests.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 40px', gap: '12px', alignItems: 'center' }}>
               <input placeholder="Jenis Pekerjaan" value={row.type} onChange={e => { const n = [...form.job_interests]; n[i].type = e.target.value; setForm({...form, job_interests: n}) }}
                 style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px' }} />
               <input placeholder="Rangking" type="number" value={row.rank} onChange={e => { const n = [...form.job_interests]; n[i].rank = e.target.value; setForm({...form, job_interests: n}) }}
                 style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px' }} />
               <button onClick={() => setForm({...form, job_interests: form.job_interests.filter((_, idx) => idx !== i)})} style={{ background: 'none', border: 'none', color: '#FF4F31', cursor: 'pointer' }}><Trash2 size={16} /></button>
            </div>
          ))}
          <button onClick={() => setForm({...form, job_interests: [...form.job_interests, {type:'', rank: (form.job_interests.length + 1).toString()}]})}
            style={{ width: 'fit-content', padding: '8px 16px', borderRadius: '8px', border: '1.5px dashed #037894', color: '#037894', fontSize: '12px', fontWeight: 700, cursor: 'pointer', background: 'none' }}>+ Tambah Minat</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
           <InputField label="Gaji Minimal yang Diinginkan" value={form.expected_salary} onChange={(v:any) => setForm({...form, expected_salary: v})} />
           <InputField label="Fasilitas Lainnya" value={form.expected_facilities} onChange={(v:any) => setForm({...form, expected_facilities: v})} />
           <div>
              <label style={lbl}>Bersediakah Anda ditempatkan di luar kota?</label>
              <select value={form.willing_to_be_relocated} onChange={e => setForm({...form, willing_to_be_relocated: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', outline: 'none' }}>
                <option value="Ya">Ya</option>
                <option value="Tidak">Tidak</option>
              </select>
           </div>
           {form.willing_to_be_relocated === 'Tidak' && <InputField label="Mengapa?" value={form.relocation_refusal_reason} onChange={(v:any) => setForm({...form, relocation_refusal_reason: v})} />}
        </div>

        {/* AKTIVITAS SOSIAL */}
        <SectionHeader icon={Users} title="Aktivitas Sosial" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
           <InputField label="Olahraga" value={form.social_sports} onChange={(v:any) => setForm({...form, social_sports: v})} />
           <InputField label="Hobby" value={form.social_hobbies} onChange={(v:any) => setForm({...form, social_hobbies: v})} />
           <div style={{ gridColumn: 'span 2' }}>
              <InputField label="Kegiatan Lain (Organisasi)" value={form.social_organizations} onChange={(v:any) => setForm({...form, social_organizations: v})} />
           </div>
        </div>

        {/* REFERENSI */}
        <SectionHeader icon={Phone} title="Referensi" />
        <p style={{ fontSize: '13px', color: '#4C4845', marginBottom: '16px' }}>Kepada siapa kami dapat menanyakan tentang diri Anda?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
           {form.references.map((row, i) => (
             <div key={i} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #E8E4E0', backgroundColor: '#F7F5F2' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                   <div style={{ gridColumn: 'span 2' }}>
                      <InputField label="Nama Lengkap" value={row.name} onChange={(v:any) => { const n = [...form.references]; n[i].name = v; setForm({...form, references: n}) }} />
                   </div>
                   <InputField label="Alamat / Kantor" value={row.address} onChange={(v:any) => { const n = [...form.references]; n[i].address = v; setForm({...form, references: n}) }} />
                   <InputField label="Nomor Telepon" value={row.phone} onChange={(v:any) => { const n = [...form.references]; n[i].phone = v; setForm({...form, references: n}) }} />
                   <InputField label="Hubungan" value={row.relationship} onChange={(v:any) => { const n = [...form.references]; n[i].relationship = v; setForm({...form, references: n}) }} />
                </div>
             </div>
           ))}
        </div>

        <p style={{ fontSize: '13px', color: '#4C4845', marginTop: '32px', marginBottom: '16px' }}>Apakah ada saudara / kenalan yang bekerja di Strada Coffee?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {form.internal_acquaintances.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 40px', gap: '10px' }}>
               <input placeholder="Nama" value={row.name} onChange={e => { const n = [...form.internal_acquaintances]; n[i].name = e.target.value; setForm({...form, internal_acquaintances: n}) }} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px' }} />
               <input placeholder="Jabatan" value={row.position} onChange={e => { const n = [...form.internal_acquaintances]; n[i].position = e.target.value; setForm({...form, internal_acquaintances: n}) }} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px' }} />
               <input placeholder="Hubungan" value={row.relationship} onChange={e => { const n = [...form.internal_acquaintances]; n[i].relationship = e.target.value; setForm({...form, internal_acquaintances: n}) }} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px' }} />
               <button onClick={() => setForm({...form, internal_acquaintances: form.internal_acquaintances.filter((_, idx) => idx !== i)})} style={{ background: 'none', border: 'none', color: '#FF4F31', cursor: 'pointer' }}><Trash2 size={16} /></button>
            </div>
          ))}
          <button onClick={() => setForm({...form, internal_acquaintances: [...form.internal_acquaintances, {name:'', position:'', relationship:''}]})}
            style={{ width: 'fit-content', padding: '8px 16px', borderRadius: '8px', border: '1.5px dashed #037894', color: '#037894', fontSize: '12px', fontWeight: 700, cursor: 'pointer', background: 'none' }}>+ Tambah Kenalan</button>
        </div>

        {/* KESEHATAN */}
        <SectionHeader icon={Heart} title="Riwayat Kesehatan & Psikotest" />
        <p style={{ fontSize: '13px', color: '#4C4845', marginBottom: '16px' }}>Dalam 2 tahun terakhir apakah Anda pernah dirawat di Rumah Sakit?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {form.medical_history.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 1fr 40px', gap: '10px' }}>
               <input placeholder="Rumah Sakit" value={row.hospital} onChange={e => { const n = [...form.medical_history]; n[i].hospital = e.target.value; setForm({...form, medical_history: n}) }} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px' }} />
               <input placeholder="Tahun" value={row.year} onChange={e => { const n = [...form.medical_history]; n[i].year = e.target.value; setForm({...form, medical_history: n}) }} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px' }} />
               <input placeholder="Lama" value={row.duration} onChange={e => { const n = [...form.medical_history]; n[i].duration = e.target.value; setForm({...form, medical_history: n}) }} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px' }} />
               <input placeholder="Sebab" value={row.reason} onChange={e => { const n = [...form.medical_history]; n[i].reason = e.target.value; setForm({...form, medical_history: n}) }} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px' }} />
               <button onClick={() => setForm({...form, medical_history: form.medical_history.filter((_, idx) => idx !== i)})} style={{ background: 'none', border: 'none', color: '#FF4F31', cursor: 'pointer' }}><Trash2 size={16} /></button>
            </div>
          ))}
          <button onClick={() => setForm({...form, medical_history: [...form.medical_history, {hospital:'', year:'', duration:'', reason:''}]})}
            style={{ width: 'fit-content', padding: '8px 16px', borderRadius: '8px', border: '1.5px dashed #037894', color: '#037894', fontSize: '12px', fontWeight: 700, cursor: 'pointer', background: 'none' }}>+ Tambah Riwayat RS</button>
        </div>

        <p style={{ fontSize: '13px', color: '#4C4845', marginTop: '32px', marginBottom: '16px' }}>Apakah Anda pernah mengikuti Psikotest (di luar Strada)?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {form.psychotest_history.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr 40px', gap: '10px' }}>
               <input placeholder="Tempat" value={row.place} onChange={e => { const n = [...form.psychotest_history]; n[i].place = e.target.value; setForm({...form, psychotest_history: n}) }} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px' }} />
               <input placeholder="Tahun" value={row.year} onChange={e => { const n = [...form.psychotest_history]; n[i].year = e.target.value; setForm({...form, psychotest_history: n}) }} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px' }} />
               <input placeholder="Tujuan" value={row.purpose} onChange={e => { const n = [...form.psychotest_history]; n[i].purpose = e.target.value; setForm({...form, psychotest_history: n}) }} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px' }} />
               <button onClick={() => setForm({...form, psychotest_history: form.psychotest_history.filter((_, idx) => idx !== i)})} style={{ background: 'none', border: 'none', color: '#FF4F31', cursor: 'pointer' }}><Trash2 size={16} /></button>
            </div>
          ))}
          <button onClick={() => setForm({...form, psychotest_history: [...form.psychotest_history, {place:'', year:'', purpose:''}]})}
            style={{ width: 'fit-content', padding: '8px 16px', borderRadius: '8px', border: '1.5px dashed #037894', color: '#037894', fontSize: '12px', fontWeight: 700, cursor: 'pointer', background: 'none' }}>+ Tambah Psikotest</button>
        </div>

        {/* SELF DESCRIPTION */}
        <SectionHeader icon={Info} title="Gambaran Diri" />
        <p style={{ fontSize: '13px', color: '#4C4845', lineHeight: 1.7, marginBottom: '20px' }}>
          Ceritakan tentang diri pribadi Anda: apa yang Anda harapkan dalam hidup ini? Apa prinsip hidup Anda? 
          Apa kelemahan dan kelebihan Anda? Bagaimana pendapat teman-teman tentang Anda? Apa ambisi Anda?
        </p>
        <textarea value={form.self_description} onChange={e => setForm({...form, self_description: e.target.value})}
          placeholder="Tuliskan di sini..."
          style={{ width: '100%', minHeight: '180px', padding: '16px', borderRadius: '16px', border: '1.5px solid #E8E4E0', fontSize: '13px', lineHeight: 1.7, outline: 'none', resize: 'vertical' }} />

        {/* SUBMIT */}
        <div style={{ marginTop: '64px', paddingTop: '32px', borderTop: '2px solid #020000' }}>
          <p style={{ fontSize: '12px', color: '#4C4845', marginBottom: '24px', fontStyle: 'italic', textAlign: 'center' }}>
            Pernyataan di atas dipertanggungjawabkan kebenarannya. Apabila di kemudian hari ternyata ada hal-hal yang bertentangan, saya bersedia menanggung segala akibatnya.
          </p>
          <button onClick={handleSubmit} disabled={submitting}
            style={{ width: '100%', padding: '20px', borderRadius: '16px', border: 'none', backgroundColor: submitting ? '#8A8A8D' : '#020000', color: '#fff', fontSize: '16px', fontWeight: 900, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', transition: 'all 0.2s' }}>
            {submitting ? 'Mengirim Data...' : 'Konfirmasi & Kirim Formulir Personalia'}
          </button>
        </div>

      </div>
    </div>
  )
}
