'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { JobPosting } from '@/lib/types'
import { Plus, Users, MapPin, Clock, Zap, Edit2 } from 'lucide-react'

export default function JobsClient({ initialJobs }: { initialJobs: JobPosting[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [jobs, setJobs] = useState<JobPosting[]>(initialJobs)
  const [showForm, setShowForm] = useState(false)
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const emptyForm = {
    job_id: '', title: '', department: '', entity: 'CV_KTN' as const,
    outlet: '', location: '', employment_type: 'Full-time',
    salary_display: '', description: '', requirements: '',
    responsibilities: '', benefits: '', ai_screening_notes: '',
    min_experience_years: 0, is_urgent: false, deadline: '',
  }
  const [form, setForm] = useState(emptyForm)
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { loadJobs() }, [])

  async function loadJobs() {
    setLoading(true)
    const { data } = await supabase.from('job_postings').select('*').order('created_at', { ascending: false })
    if (data) setJobs(data)
    setLoading(false)
  }

  function openNew() { setForm(emptyForm); setEditingJob(null); setSaveError(''); setShowForm(true) }
  function openEdit(job: JobPosting) {
    setForm({
      job_id: job.job_id, title: job.title, department: job.department,
      entity: job.entity, outlet: job.outlet || '', location: job.location,
      employment_type: job.employment_type || 'Full-time',
      salary_display: job.salary_display || '', description: job.description,
      requirements: job.requirements, responsibilities: job.responsibilities,
      benefits: job.benefits || '', ai_screening_notes: job.ai_screening_notes || '',
      min_experience_years: job.min_experience_years, is_urgent: job.is_urgent,
      deadline: job.deadline || '',
    })
    setEditingJob(job); setSaveError(''); setShowForm(true)
  }

  async function handleSave() {
    setSaving(true); setSaveError('')
    const payload = {
      ...form,
      min_experience_years: Number(form.min_experience_years),
      deadline: form.deadline || null,
      outlet: form.outlet || null,
      salary_display: form.salary_display || null,
      benefits: form.benefits || null,
      ai_screening_notes: form.ai_screening_notes || null,
    }
    if (editingJob) {
      const { error } = await supabase.from('job_postings').update(payload).eq('id', editingJob.id)
      if (error) { setSaveError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('job_postings').insert([{ ...payload, is_active: true, applicant_count: 0 }])
      if (error) { setSaveError(error.message); setSaving(false); return }
    }
    setSaving(false); setShowForm(false); await loadJobs()
  }

  async function toggleActive(job: JobPosting) {
    setTogglingId(job.id)
    // Optimistic update
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, is_active: !j.is_active } : j))
    await supabase.from('job_postings').update({ is_active: !job.is_active }).eq('id', job.id)
    setTogglingId(null)
  }

  const inp = "w-full px-3 py-2.5 rounded-xl text-sm outline-none"
  const ist = { border: '1.5px solid #E8E4E0', backgroundColor: '#FAFAF9', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#4C4845', marginBottom: '5px' } as const

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .jobs-grid { grid-template-columns: 1fr !important; }
          .form-grid-2 { grid-template-columns: 1fr !important; }
          .form-grid-3 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ padding: '24px', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: '#037894', textTransform: 'uppercase', margin: '0 0 4px' }}>HRD · Rekrutmen</p>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#020000', margin: 0 }}>Job Posting</h1>
            <p style={{ fontSize: '13px', color: '#8A8A8D', margin: '4px 0 0' }}>{jobs.filter(j => j.is_active).length} aktif · {jobs.filter(j => !j.is_active).length} tidak aktif</p>
          </div>
          <button onClick={openNew}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', backgroundColor: '#037894', color: '#fff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
            <Plus size={16} /> Buat Job Post
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#8A8A8D', fontSize: '14px' }}>Memuat...</div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>📋</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#020000', marginBottom: '4px' }}>Belum ada job posting</p>
            <button onClick={openNew} style={{ padding: '10px 24px', borderRadius: '12px', backgroundColor: '#037894', color: '#fff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>+ Buat Sekarang</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }} className="jobs-grid">
            {jobs.map(job => (
              <div key={job.id}
                onClick={(e) => { if ((e.target as HTMLElement).closest('button, a')) return; router.push(`/dashboard/hrd/jobs/${job.id}`) }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#037894'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(3,120,148,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = job.is_active ? '#E8E4E0' : 'rgba(255,79,49,0.2)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                style={{ backgroundColor: '#fff', borderRadius: '16px', border: `1.5px solid ${job.is_active ? '#E8E4E0' : 'rgba(255,79,49,0.2)'}`, padding: '20px', cursor: 'pointer', opacity: job.is_active ? 1 : 0.8, transition: 'all 0.15s' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#8A8A8D', letterSpacing: '1px' }}>{job.job_id}</span>
                      {job.is_urgent && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FFF0EE', color: '#FF4F31' }}>URGENT</span>}
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#020000', margin: '0 0 3px', lineHeight: 1.2 }}>{job.title}</h3>
                    <p style={{ fontSize: '13px', color: '#037894', margin: 0, fontWeight: 600 }}>{job.department}</p>
                  </div>

                  {/* Active/Inactive toggle — clear visual */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleActive(job) }}
                    disabled={togglingId === job.id}
                    title={job.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                    style={{
                      flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 10px', borderRadius: '20px', border: 'none',
                      cursor: togglingId === job.id ? 'not-allowed' : 'pointer',
                      fontSize: '11px', fontWeight: 700,
                      backgroundColor: job.is_active ? '#E6F4F1' : '#FFF0EE',
                      color: job.is_active ? '#005353' : '#FF4F31',
                      transition: 'all 0.2s',
                      opacity: togglingId === job.id ? 0.6 : 1,
                    }}>
                    <span style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      backgroundColor: job.is_active ? '#005353' : '#FF4F31',
                      flexShrink: 0,
                    }} />
                    {job.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={12} color="#8A8A8D" />
                    <span style={{ fontSize: '12px', color: '#4C4845' }}>{job.location}{job.outlet ? ` · ${job.outlet}` : ''}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={12} color="#8A8A8D" />
                    <span style={{ fontSize: '12px', color: '#4C4845' }}>{job.employment_type}</span>
                    {job.salary_display && <span style={{ fontSize: '12px', color: '#8A8A8D' }}>· {job.salary_display}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={12} color="#8A8A8D" />
                    <span style={{ fontSize: '12px', color: '#4C4845' }}>{job.applicant_count || 0} pelamar</span>
                    {job.min_experience_years > 0 && <span style={{ fontSize: '12px', color: '#8A8A8D' }}>· Min. {job.min_experience_years} thn</span>}
                  </div>
                </div>

                {job.ai_screening_notes && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(3,120,148,0.05)', marginBottom: '12px' }}>
                    <Zap size={12} color="#037894" />
                    <span style={{ fontSize: '11px', color: '#037894', fontWeight: 600 }}>Quest AI criteria configured</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEdit(job)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: '10px', border: '1.5px solid #E8E4E0', backgroundColor: 'transparent', color: '#4C4845', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    <Edit2 size={12} /> Edit
                  </button>
                  {/* FIX: Preview now links directly to job detail page, works for active & inactive */}
                  <a
                    href={`/dashboard/hrd/jobs/${job.id}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(3,120,148,0.06)', color: '#037894', fontSize: '12px', fontWeight: 600, textDecoration: 'none', border: '1.5px solid rgba(3,120,148,0.2)' }}>
                    Preview ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, overflowY: 'auto', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '28px', maxWidth: '720px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: 0 }}>
                {editingJob ? 'Edit Job Posting' : 'Buat Job Posting Baru'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#8A8A8D', padding: '4px 8px' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }} className="form-grid-2">
                <div>
                  <label style={lbl}>Job ID <span style={{ color: '#FF4F31' }}>*</span></label>
                  <input className={inp} style={ist} value={form.job_id} onChange={e => set('job_id', e.target.value)} placeholder="STR-BAR-001" />
                  <p style={{ fontSize: '11px', color: '#8A8A8D', margin: '3px 0 0' }}>Format: STR-[DEPT]-[NO]</p>
                </div>
                <div>
                  <label style={lbl}>Judul Posisi <span style={{ color: '#FF4F31' }}>*</span></label>
                  <input className={inp} style={ist} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Barista" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }} className="form-grid-3">
                <div>
                  <label style={lbl}>Departemen</label>
                  <input className={inp} style={ist} value={form.department} onChange={e => set('department', e.target.value)} placeholder="Operations" />
                </div>
                <div>
                  <label style={lbl}>Entity</label>
                  <select className={inp} style={ist} value={form.entity} onChange={e => set('entity', e.target.value)}>
                    <option value="CV_KTN">CV KTN (Jakarta)</option>
                    <option value="CV_PRI">CV PRI (Semarang)</option>
                    <option value="PT_BSB">PT BSB (Roastery)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tipe</label>
                  <select className={inp} style={ist} value={form.employment_type} onChange={e => set('employment_type', e.target.value)}>
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                    <option>Internship</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="form-grid-2">
                <div>
                  <label style={lbl}>Lokasi <span style={{ color: '#FF4F31' }}>*</span></label>
                  <input className={inp} style={ist} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Jakarta Utara" />
                </div>
                <div>
                  <label style={lbl}>Outlet</label>
                  <select className={inp} style={ist} value={form.outlet} onChange={e => set('outlet', e.target.value)}>
                    <option value="">Pilih outlet (opsional)</option>
                    {['Kelapa Gading', 'MKG', 'BSD', 'SMS', 'SMB Gold Lounge', 'SMB2', 'Semarang', 'HO Jakarta', 'HO Semarang', 'Roastery', 'Academy'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }} className="form-grid-3">
                <div>
                  <label style={lbl}>Tampilan Gaji</label>
                  <input className={inp} style={ist} value={form.salary_display} onChange={e => set('salary_display', e.target.value)} placeholder="Rp 4–6 juta/bulan" />
                </div>
                <div>
                  <label style={lbl}>Min. Pengalaman (thn)</label>
                  <input type="number" min="0" step="0.5" className={inp} style={ist} value={form.min_experience_years} onChange={e => set('min_experience_years', e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Deadline <span style={{ fontSize: '10px', color: '#8A8A8D', fontWeight: 400 }}>(opsional)</span></label>
                  <input type="date" className={inp} style={ist} value={form.deadline} onChange={e => set('deadline', e.target.value)} />
                  {form.deadline && <button type="button" onClick={() => set('deadline', '')} style={{ fontSize: '11px', color: '#FF4F31', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>× Hapus deadline</button>}
                </div>
              </div>

              <div>
                <label style={lbl}>Deskripsi Posisi <span style={{ color: '#FF4F31' }}>*</span></label>
                <textarea className={inp} style={{ ...ist, resize: 'vertical' as const }} value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="Deskripsi singkat tentang posisi ini..." />
              </div>
              <div>
                <label style={lbl}>Tanggung Jawab <span style={{ color: '#FF4F31' }}>*</span></label>
                <textarea className={inp} style={{ ...ist, resize: 'vertical' as const }} value={form.responsibilities} onChange={e => set('responsibilities', e.target.value)} rows={4} placeholder="- Membuat minuman sesuai SOP" />
              </div>
              <div>
                <label style={lbl}>Persyaratan <span style={{ color: '#FF4F31' }}>*</span></label>
                <textarea className={inp} style={{ ...ist, resize: 'vertical' as const }} value={form.requirements} onChange={e => set('requirements', e.target.value)} rows={4} placeholder="- Min. 1 tahun pengalaman kafe" />
              </div>
              <div>
                <label style={lbl}>Benefit <span style={{ fontSize: '10px', color: '#8A8A8D', fontWeight: 400 }}>(opsional)</span></label>
                <textarea className={inp} style={{ ...ist, resize: 'vertical' as const }} value={form.benefits} onChange={e => set('benefits', e.target.value)} rows={3} placeholder="- Gaji pokok + service charge" />
              </div>

              <div style={{ padding: '16px', borderRadius: '14px', border: '1.5px solid rgba(3,120,148,0.2)', backgroundColor: 'rgba(3,120,148,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Zap size={14} color="#037894" />
                  <label style={{ ...lbl, margin: 0, color: '#037894' }}>Catatan Screening Quest AI <span style={{ fontSize: '10px', fontWeight: 400, color: '#8A8A8D' }}>(opsional)</span></label>
                </div>
                <textarea className={inp} style={{ ...ist, resize: 'vertical' as const, backgroundColor: '#ffffff' }} value={form.ai_screening_notes} onChange={e => set('ai_screening_notes', e.target.value)} rows={4} placeholder="Prioritaskan kandidat dengan pengalaman specialty coffee..." />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#F7F5F2' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#020000', margin: '0 0 2px' }}>Tandai sebagai Urgent</p>
                  <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>Badge merah di portal kandidat</p>
                </div>
                <button type="button" onClick={() => set('is_urgent', !form.is_urgent)}
                  style={{ width: '46px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: form.is_urgent ? '#FF4F31' : '#D4CFC9', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: '3px', width: '20px', height: '20px', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: form.is_urgent ? 'translateX(23px)' : 'translateX(3px)' }} />
                </button>
              </div>
            </div>

            {saveError && <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: '#FFF0EE', color: '#FF4F31', fontSize: '13px', marginTop: '16px' }}>⚠ {saveError}</div>}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1.5px solid #E8E4E0', backgroundColor: 'transparent', color: '#4C4845', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                Batal
              </button>
              <button onClick={handleSave} disabled={saving || !form.job_id || !form.title || !form.location || !form.description || !form.requirements || !form.responsibilities}
                style={{ flex: 2, padding: '14px', borderRadius: '12px', backgroundColor: saving ? '#8A8A8D' : '#037894', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Menyimpan...' : editingJob ? 'Update Job Post' : 'Publish Job Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
