'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'

export default function KaryawanBaruPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [openSections, setOpenSections] = useState(['identitas', 'kontrak'])
  const formRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    // Wajib
    employee_id: '', full_name: '', join_date: '', position: '',
    department: 'Operations', entity: 'CV_KTN', employment_type: 'PKWT',
    // Kontrak
    outlet: '', grade: '', pkwt_ke: '', contract_start: '', contract_end: '',
    contract_period_text: '', base_salary: '', tunjangan: '',
    // Trial
    trial_position: '', trial_period: '', trial_salary: '',
    // SP
    sp_status: '0', sp_period: '',
    // Pribadi
    birth_date: '', gender: '', address: '', id_number: '', email: '', phone: '',
    marital_status: '', education: '', place_of_birth: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    // BPJS & Bank
    bpjs_tk: '', bpjs_kesehatan: '', npwp: '',
    bank_name: '', bank_account_number: '', bank_account_name: '',
    // Links
    gdrive_link: '', pkwt_doc_number: '', pkwt_link: '',
    // Training checklist
    hr_onboarding: false, barista: false, brew: false, sensory: false,
    test_bar_back: false, test_bar: false, kebijakan_perusahaan: false,
    service_excellent: false, matcha: false, pk_barista: false, pk_kitchen: false,
    // Notes
    case_notes: '',
  })

  const set = (k: string, v: string | boolean) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
  }

  function toggleSection(key: string) {
    setOpenSections(s => s.includes(key) ? s.filter(x => x !== key) : [...s, key])
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.employee_id) errs.employee_id = 'Employee ID wajib diisi'
    if (!form.full_name) errs.full_name = 'Nama wajib diisi'
    if (!form.join_date) errs.join_date = 'Tanggal masuk wajib diisi'
    if (!form.position) errs.position = 'Posisi wajib diisi'
    return errs
  }

  async function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setTimeout(() => {
        const el = formRef.current?.querySelector('[data-error="true"]')
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }
    setSaving(true)
    const payload = {
      employee_id: form.employee_id,
      full_name: form.full_name,
      join_date: form.join_date,
      position: form.position,
      department: form.department,
      entity: form.entity,
      employment_type: form.employment_type,
      outlet: form.outlet || null,
      grade: form.grade || null,
      pkwt_ke: form.pkwt_ke ? parseInt(form.pkwt_ke) : null,
      contract_start: form.contract_start || null,
      contract_end: form.contract_end || null,
      contract_period_text: form.contract_period_text || null,
      base_salary: form.base_salary ? parseFloat(form.base_salary) : null,
      tunjangan: form.tunjangan ? parseFloat(form.tunjangan) : null,
      trial_position: form.trial_position || null,
      trial_period: form.trial_period || null,
      trial_salary: form.trial_salary ? parseFloat(form.trial_salary) : null,
      sp_status: parseInt(form.sp_status) || 0,
      sp_period: form.sp_period || null,
      birth_date: form.birth_date || null,
      gender: form.gender || null,
      address: form.address || null,
      id_number: form.id_number || null,
      email: form.email || null,
      phone: form.phone || null,
      marital_status: form.marital_status || null,
      education: form.education || null,
      place_of_birth: form.place_of_birth || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      bpjs_tk: form.bpjs_tk || null,
      bpjs_kesehatan: form.bpjs_kesehatan || null,
      npwp: form.npwp || null,
      bank_name: form.bank_name || null,
      bank_account_number: form.bank_account_number || null,
      bank_account_name: form.bank_account_name || null,
      gdrive_link: form.gdrive_link || null,
      pkwt_doc_number: form.pkwt_doc_number || null,
      pkwt_link: form.pkwt_link || null,
      case_notes: form.case_notes || null,
      notes: form.case_notes || null,
      status: 'active',
      training_checklist: {
        hr_onboarding: form.hr_onboarding, barista: form.barista, brew: form.brew,
        sensory: form.sensory, test_bar_back: form.test_bar_back, test_bar: form.test_bar,
        kebijakan_perusahaan: form.kebijakan_perusahaan, service_excellent: form.service_excellent,
        matcha: form.matcha, pk_barista: form.pk_barista, pk_kitchen: form.pk_kitchen,
      }
    }

    const { data, error } = await supabase.from('employees').insert([payload]).select().single()
    setSaving(false)
    if (error) { setErrors({ _general: error.message }); return }
    router.push(`/dashboard/hrd/karyawan/${data.id}`)
  }

  const inp = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none'
  const ist = { border: '1.5px solid #E8E4E0', backgroundColor: '#FAFAF9', boxSizing: 'border-box' as const }
  const err_ist = { border: '1.5px solid #FF4F31', backgroundColor: '#FFF9F8', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#4C4845', marginBottom: '5px' } as const

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => {
    const open = openSections.includes(id)
    return (
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', overflow: 'hidden', marginBottom: '12px' }}>
        <button onClick={() => toggleSection(id)} type="button"
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#020000' }}>{title}</span>
          {open ? <ChevronUp size={16} color="#8A8A8D" /> : <ChevronDown size={16} color="#8A8A8D" />}
        </button>
        {open && <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>{children}</div>}
      </div>
    )
  }

  const Grid2 = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>{children}</div>
  )

  const Field = ({ k, label, required, type = 'text', options, placeholder }: {
    k: string; label: string; required?: boolean; type?: string
    options?: { value: string; label: string }[]; placeholder?: string
  }) => {
    const hasErr = !!errors[k]
    return (
      <div data-error={hasErr}>
        <label style={lbl}>{label} {required && <span style={{ color: '#FF4F31' }}>*</span>}</label>
        {options ? (
          <select className={inp} style={hasErr ? err_ist : ist} value={(form as any)[k]}
            onChange={e => set(k, e.target.value)}>
            <option value="">Pilih...</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input type={type} className={inp} style={hasErr ? err_ist : ist}
            value={(form as any)[k]} onChange={e => set(k, e.target.value)}
            placeholder={placeholder} />
        )}
        {hasErr && <p style={{ fontSize: '11px', color: '#FF4F31', margin: '3px 0 0' }}>{errors[k]}</p>}
      </div>
    )
  }

  const Toggle = ({ k, label }: { k: string; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: (form as any)[k] ? 'rgba(3,120,148,0.06)' : '#F7F5F2', border: `1px solid ${(form as any)[k] ? 'rgba(3,120,148,0.2)' : '#E8E4E0'}` }}>
      <span style={{ fontSize: '13px', color: '#020000', fontWeight: (form as any)[k] ? 600 : 400 }}>{label}</span>
      <button type="button" onClick={() => set(k, !(form as any)[k])}
        style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: (form as any)[k] ? '#037894' : '#D4CFC9', flexShrink: 0, transition: 'all 0.15s' }}>
        <span style={{ position: 'absolute', top: '2px', width: '18px', height: '18px', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: (form as any)[k] ? 'translateX(20px)' : 'translateX(2px)' }} />
      </button>
    </div>
  )

  const OUTLETS = ['La Piazza', 'MKG', 'BSD', 'SMS', 'SMB', 'SMB Gold Lounge', 'SMB2', 'Back Office', 'Hibrida / Back Office', 'Roastery', 'Academy', 'Semarang HO']
  const POSITIONS = ['Barista', 'Senior Barista', 'Coordinator Bar', 'Head Bar', 'Trainer Academy', 'Waitress/Waiter', 'Kasir', 'Floor Coordinator', 'Head Floor', 'Cook Helper', 'Cook', 'Junior Cook', 'Kitchen Coordinator', 'Head Kitchen', 'Housekeeping', 'Senior Housekeeping', 'Steward', 'Supervisor', 'Area Manager', 'Admin HR', 'HR Manager', 'Admin Warehouse', 'Inventory Officer', 'Admin Purchasing', 'Staff Accounting', 'Admin Accounting', 'Coordinator Finance', 'Marketing', 'General Affair', 'Driver', 'Auditor', 'IT Staff', 'Head of Academy', 'Head of Marketing', 'Other']

  return (
    <>
      <style>{`@media (max-width: 768px) { .form-two-col { grid-template-columns: 1fr !important; } }`}</style>
      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>
        {/* Header */}
        <div style={{ backgroundColor: '#020000', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.back()} style={{ color: 'rgba(228,222,216,0.5)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <ArrowLeft size={15} /> Karyawan
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '16px', margin: 0 }}>Tambah Karyawan Baru</p>
            <p style={{ color: '#8FC6C5', fontSize: '12px', margin: 0 }}>Isi semua data yang diperlukan</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 24px', borderRadius: '12px', backgroundColor: saving ? '#8A8A8D' : '#037894', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Menyimpan...' : 'Simpan Karyawan'}
          </button>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px' }} ref={formRef}>
          {errors._general && (
            <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#FFF0EE', color: '#FF4F31', fontSize: '13px', marginBottom: '16px' }}>
              ⚠ {errors._general}
            </div>
          )}

          {/* IDENTITAS */}
          <Section id="identitas" title="📋 Identitas & Kontrak (Wajib)">
            <Grid2>
              <Field k="employee_id" label="Employee ID" required placeholder="STD00xxx" />
              <Field k="full_name" label="Nama Lengkap" required placeholder="Sesuai KTP" />
            </Grid2>
            <Grid2>
              <Field k="join_date" label="Tanggal Masuk" required type="date" />
              <Field k="position" label="Posisi" required options={POSITIONS.map(p => ({ value: p, label: p }))} />
            </Grid2>
            <Grid2>
              <Field k="department" label="Departemen" options={[
                { value: 'Operations', label: 'Operations' },
                { value: 'Finance', label: 'Finance' },
                { value: 'Marketing', label: 'Marketing' },
                { value: 'HRD', label: 'HRD' },
              ]} />
              <Field k="entity" label="Entity" options={[
                { value: 'CV_KTN', label: 'CV KTN (Jakarta)' },
                { value: 'CV_PRI', label: 'CV PRI (Semarang)' },
                { value: 'PT_BSB', label: 'PT BSB (Roastery)' },
              ]} />
            </Grid2>
            <Grid2>
              <Field k="outlet" label="Outlet" options={OUTLETS.map(o => ({ value: o, label: o }))} />
              <Field k="employment_type" label="Tipe Kontrak" options={[
                { value: 'PKWT', label: 'PKWT' },
                { value: 'PKWTT', label: 'PKWTT (Tetap)' },
                { value: 'Freelance', label: 'Freelance' },
                { value: 'Magang', label: 'Magang' },
              ]} />
            </Grid2>
          </Section>

          {/* KONTRAK */}
          <Section id="kontrak" title="📄 Detail Kontrak & Gaji">
            <Grid2>
              <Field k="grade" label="Golongan" placeholder="Contoh: 4A" />
              <Field k="pkwt_ke" label="PKWT Ke-" type="number" placeholder="1, 2, 3..." />
            </Grid2>
            <Grid2>
              <Field k="contract_start" label="Mulai Kontrak" type="date" />
              <Field k="contract_end" label="Akhir Kontrak" type="date" />
            </Grid2>
            <Field k="contract_period_text" label="Periode Kontrak (teks)" placeholder="Contoh: 1 Januari 2026 - 31 Desember 2026" />
            <Grid2>
              <Field k="base_salary" label="Gaji Pokok (Rp)" type="number" placeholder="3500000" />
              <Field k="tunjangan" label="Tunjangan (Rp)" type="number" placeholder="1400000" />
            </Grid2>

            <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#F7F5F2', border: '1px solid #E8E4E0' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#020000', margin: '0 0 12px' }}>Trial / Percobaan</p>
              <Grid2>
                <Field k="trial_position" label="Posisi Trial" placeholder="Contoh: Trial Head Bar" />
                <Field k="trial_salary" label="Gaji Trial (Rp)" type="number" />
              </Grid2>
              <div style={{ marginTop: '10px' }}>
                <Field k="trial_period" label="Periode Trial" placeholder="Contoh: 1 Feb 2026 - 30 Apr 2026" />
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#FFF8F6', border: '1px solid rgba(255,79,49,0.2)' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#020000', margin: '0 0 12px' }}>Status SP</p>
              <Grid2>
                <Field k="sp_status" label="Level SP" options={[
                  { value: '0', label: 'Tidak Ada SP' },
                  { value: '1', label: 'SP 1' },
                  { value: '2', label: 'SP 2' },
                  { value: '3', label: 'SP 3' },
                ]} />
                <Field k="sp_period" label="Periode SP" placeholder="Contoh: 1 Jan 2026 - 1 Jul 2026" />
              </Grid2>
            </div>
          </Section>

          {/* DATA PRIBADI */}
          <Section id="pribadi" title="👤 Data Pribadi">
            <Grid2>
              <Field k="full_name" label="Nama Lengkap" placeholder="Sesuai KTP" />
              <Field k="birth_date" label="Tanggal Lahir" type="date" />
            </Grid2>
            <Grid2>
              <Field k="place_of_birth" label="Tempat Lahir" placeholder="Kota lahir" />
              <Field k="gender" label="Jenis Kelamin" options={[
                { value: 'L', label: 'Laki-laki' },
                { value: 'P', label: 'Perempuan' },
              ]} />
            </Grid2>
            <Grid2>
              <Field k="email" label="Email Pribadi" type="email" placeholder="nama@email.com" />
              <Field k="phone" label="No. HP" placeholder="08xxxxxxxxxx" />
            </Grid2>
            <Field k="address" label="Alamat KTP" placeholder="Alamat lengkap sesuai KTP" />
            <Grid2>
              <Field k="marital_status" label="Status Pernikahan" options={[
                { value: 'Belum Menikah/Single', label: 'Belum Menikah' },
                { value: 'Menikah/Married', label: 'Menikah' },
                { value: 'Cerai/Divorced', label: 'Cerai' },
              ]} />
              <Field k="education" label="Pendidikan Terakhir" options={[
                { value: 'SMA', label: 'SMA/SMK' },
                { value: 'D3', label: 'D3' },
                { value: 'S1', label: 'S1' },
                { value: 'S2', label: 'S2+' },
              ]} />
            </Grid2>
            <Grid2>
              <Field k="emergency_contact_name" label="Nama Kontak Darurat" />
              <Field k="emergency_contact_phone" label="No. HP Kontak Darurat" />
            </Grid2>
          </Section>

          {/* BPJS & BANK */}
          <Section id="bpjs" title="🏦 BPJS, NPWP & Rekening Bank">
            <Grid2>
              <Field k="id_number" label="Nomor KTP" placeholder="16 digit NIK" />
              <Field k="npwp" label="NPWP" placeholder="Nomor NPWP" />
            </Grid2>
            <Grid2>
              <Field k="bpjs_kesehatan" label="No. BPJS Kesehatan" />
              <Field k="bpjs_tk" label="No. BPJS Ketenagakerjaan" />
            </Grid2>
            <Grid2>
              <Field k="bank_name" label="Nama Bank" placeholder="BCA, BNI, dll" />
              <Field k="bank_account_number" label="No. Rekening" placeholder="Nomor rekening" />
            </Grid2>
            <Field k="bank_account_name" label="Nama Pemilik Rekening" placeholder="Sesuai buku tabungan" />
          </Section>

          {/* DOKUMEN */}
          <Section id="dokumen" title="🔗 Link Dokumen">
            <Field k="gdrive_link" label="Google Drive Folder" placeholder="https://drive.google.com/..." />
            <Grid2>
              <Field k="pkwt_doc_number" label="Nomor Dokumen PKWT" placeholder="xxx/PKWT/007/HR/..." />
              <Field k="pkwt_link" label="Link PKWT" placeholder="https://drive.google.com/..." />
            </Grid2>
          </Section>

          {/* TRAINING CHECKLIST */}
          <Section id="training" title="🎓 Checklist Training">
            <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>Tandai training yang sudah diselesaikan karyawan ini:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
              <Toggle k="hr_onboarding" label="HR Onboarding" />
              <Toggle k="barista" label="Barista Training" />
              <Toggle k="brew" label="Brew Training" />
              <Toggle k="sensory" label="Sensory Training" />
              <Toggle k="test_bar_back" label="Test Bar Back" />
              <Toggle k="test_bar" label="Test Bar" />
              <Toggle k="kebijakan_perusahaan" label="Kebijakan & Peraturan" />
              <Toggle k="service_excellent" label="Service Excellence" />
              <Toggle k="matcha" label="Matcha Training" />
              <Toggle k="pk_barista" label="PK Barista" />
              <Toggle k="pk_kitchen" label="PK Kitchen" />
            </div>
          </Section>

          {/* CATATAN */}
          <Section id="catatan" title="📝 Catatan Internal">
            <div>
              <label style={lbl}>Catatan Khusus (Case Notes)</label>
              <textarea className={inp} style={{ ...ist, resize: 'vertical' as const }} value={form.case_notes}
                onChange={e => set('case_notes', e.target.value)} rows={4}
                placeholder="SP, mutasi, promosi, situasi khusus, dll..." />
            </div>
          </Section>

          {/* Bottom save */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button onClick={() => router.back()}
              style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1.5px solid #E8E4E0', backgroundColor: 'transparent', color: '#4C4845', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
              Batal
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, padding: '14px', borderRadius: '12px', backgroundColor: saving ? '#8A8A8D' : '#037894', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Menyimpan...' : '✓ Simpan Karyawan Baru'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}