'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { JobPosting } from '@/lib/types'
import { Plus, Users, MapPin, Clock, Zap, Edit2, ExternalLink, Briefcase, FileText } from 'lucide-react'

export default function JobsClient({ initialJobs }: { initialJobs: JobPosting[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [jobs, setJobs] = useState<JobPosting[]>(initialJobs)
  const [showForm, setShowForm] = useState(false)
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(false)
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto bg-[#F5F5F7] min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-strada-blue uppercase mb-1">HRD · Rekrutmen</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Job Posting</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            {jobs.filter(j => j.is_active).length} aktif · {jobs.filter(j => !j.is_active).length} draf/nonaktif
          </p>
        </div>
        <button onClick={openNew} className="apple-btn-primary flex items-center justify-center gap-2 whitespace-nowrap">
          <Plus size={18} /> Buat Job Post
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-strada-blue rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-bold text-sm">Memuat data pekerjaan...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="apple-card p-12 text-center max-w-2xl mx-auto flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Briefcase size={28} className="text-gray-300" />
          </div>
          <p className="text-lg font-extrabold text-gray-900 mb-2">Belum ada job posting</p>
          <p className="text-sm text-gray-500 mb-6">Buat lowongan pekerjaan pertama Anda untuk mulai menerima pelamar.</p>
          <button onClick={openNew} className="apple-btn-primary flex items-center gap-2">
            <Plus size={18} /> Buat Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map(job => (
            <div key={job.id}
              onClick={(e) => { if ((e.target as HTMLElement).closest('button, a')) return; router.push(`/dashboard/hrd/jobs/${job.id}`) }}
              className={`apple-card p-6 cursor-pointer apple-card-hover flex flex-col h-full ${!job.is_active && 'opacity-75 bg-gray-50/50'}`}>

              {/* Card Header */}
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 tracking-widest uppercase">
                      {job.job_id}
                    </span>
                    {job.is_urgent && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-red-50 text-red-600 tracking-widest uppercase">
                        URGENT
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-extrabold text-gray-900 leading-tight mb-1 truncate">{job.title}</h3>
                  <p className="text-[13px] font-bold text-strada-blue truncate">{job.department}</p>
                </div>

                {/* Status Toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleActive(job) }}
                  disabled={togglingId === job.id}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 ${
                    job.is_active 
                      ? 'bg-teal-50 text-teal-700 hover:bg-teal-100' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  } ${togglingId === job.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${job.is_active ? 'bg-teal-500' : 'bg-gray-400'}`} />
                  {job.is_active ? 'Aktif' : 'Draf'}
                </button>
              </div>

              {/* Meta Info */}
              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 text-[13px] text-gray-600 font-medium">
                  <MapPin size={14} className="text-gray-400 shrink-0" />
                  <span className="truncate">{job.location}{job.outlet ? ` · ${job.outlet}` : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-gray-600 font-medium">
                  <Clock size={14} className="text-gray-400 shrink-0" />
                  <span className="truncate">{job.employment_type} {job.salary_display && <span className="text-gray-400">· {job.salary_display}</span>}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-gray-600 font-medium">
                  <Users size={14} className="text-gray-400 shrink-0" />
                  <span><strong className="text-gray-900">{job.applicant_count || 0}</strong> pelamar {job.min_experience_years > 0 && <span className="text-gray-400">· Min. {job.min_experience_years} thn</span>}</span>
                </div>
              </div>

              <div className="mt-auto space-y-4">
                {/* AI Badge */}
                {job.ai_screening_notes ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50/50 border border-blue-100">
                    <Zap size={14} className="text-strada-blue" />
                    <span className="text-[11px] font-bold text-strada-blue">AI Screening Aktif</span>
                  </div>
                ) : (
                  <div className="h-8"></div> /* Spacer */
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(job) }} 
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors">
                    <Edit2 size={14} /> Edit
                  </button>
                  <a href={`/jobs/${job.job_id}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-strada-blue/5 hover:bg-strada-blue/10 text-strada-blue text-xs font-bold transition-colors">
                    <ExternalLink size={14} /> Preview
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-xl sticky top-0 z-10">
              <h2 className="text-lg font-extrabold text-gray-900">
                {editingJob ? 'Edit Job Posting' : 'Buat Job Posting Baru'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="sm:col-span-1">
                    <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Job ID <span className="text-red-500">*</span></label>
                    <input className="apple-input bg-gray-50" value={form.job_id} onChange={e => set('job_id', e.target.value)} placeholder="STR-BAR-001" />
                    <p className="text-[10px] text-gray-400 font-medium mt-1.5">Format: STR-[DEPT]-[NO]</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Judul Posisi <span className="text-red-500">*</span></label>
                    <input className="apple-input bg-gray-50" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Barista, Store Manager" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Departemen</label>
                    <input className="apple-input bg-gray-50" value={form.department} onChange={e => set('department', e.target.value)} placeholder="Operations" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Entity</label>
                    <select className="apple-input bg-gray-50" value={form.entity} onChange={e => set('entity', e.target.value)}>
                      <option value="CV_KTN">CV KTN (Jakarta)</option>
                      <option value="CV_PRI">CV PRI (Semarang)</option>
                      <option value="PT_BSB">PT BSB (Roastery)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Tipe Pekerjaan</label>
                    <select className="apple-input bg-gray-50" value={form.employment_type} onChange={e => set('employment_type', e.target.value)}>
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Lokasi Utama <span className="text-red-500">*</span></label>
                    <input className="apple-input bg-gray-50" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Jakarta Utara" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Outlet Spesifik <span className="text-[10px] text-gray-400 font-medium ml-1">(opsional)</span></label>
                    <select className="apple-input bg-gray-50" value={form.outlet} onChange={e => set('outlet', e.target.value)}>
                      <option value="">Pilih outlet (jika ada)</option>
                      {['Kelapa Gading', 'MKG', 'BSD', 'SMS', 'SMB Gold Lounge', 'SMB2', 'Semarang', 'HO Jakarta', 'HO Semarang', 'Roastery', 'Academy'].map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Info Gaji <span className="text-[10px] text-gray-400 font-medium ml-1">(opsional)</span></label>
                    <input className="apple-input bg-gray-50" value={form.salary_display} onChange={e => set('salary_display', e.target.value)} placeholder="e.g. Rp 4–6 juta/bulan" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Min. Pengalaman (thn)</label>
                    <input type="number" min="0" step="0.5" className="apple-input bg-gray-50" value={form.min_experience_years} onChange={e => set('min_experience_years', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Deadline <span className="text-[10px] text-gray-400 font-medium ml-1">(opsional)</span></label>
                    <div className="flex items-center gap-2">
                      <input type="date" className="apple-input bg-gray-50" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
                      {form.deadline && (
                        <button type="button" onClick={() => set('deadline', '')} className="text-red-500 hover:text-red-700 p-2" title="Hapus deadline">×</button>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Deskripsi Posisi <span className="text-red-500">*</span></label>
                  <textarea className="apple-input bg-gray-50 resize-y min-h-[100px]" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Tuliskan overview menarik tentang posisi ini..." />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Tanggung Jawab <span className="text-red-500">*</span></label>
                  <textarea className="apple-input bg-gray-50 resize-y min-h-[100px]" value={form.responsibilities} onChange={e => set('responsibilities', e.target.value)} placeholder="- Membuat minuman sesuai SOP&#10;- Melayani pelanggan dengan ramah" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Persyaratan <span className="text-red-500">*</span></label>
                  <textarea className="apple-input bg-gray-50 resize-y min-h-[100px]" value={form.requirements} onChange={e => set('requirements', e.target.value)} placeholder="- Usia max 28 tahun&#10;- Min. 1 tahun pengalaman sebagai Barista" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Benefit <span className="text-[10px] text-gray-400 font-medium ml-1">(opsional)</span></label>
                  <textarea className="apple-input bg-gray-50 resize-y min-h-[80px]" value={form.benefits} onChange={e => set('benefits', e.target.value)} placeholder="- Gaji Pokok&#10;- Service Charge&#10;- BPJS Kesehatan & Ketenagakerjaan" />
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={16} className="text-strada-blue" />
                    <label className="text-[13px] font-extrabold text-strada-blue">Catatan Screening Quest AI <span className="text-[10px] text-blue-400 font-medium ml-1">(opsional)</span></label>
                  </div>
                  <textarea className="apple-input bg-white resize-y min-h-[80px]" value={form.ai_screening_notes} onChange={e => set('ai_screening_notes', e.target.value)} placeholder="Berikan instruksi khusus ke AI untuk screening posisi ini. e.g. Prioritaskan kandidat yang memiliki sertifikasi SCA atau pengalaman di roastery." />
                </div>

                <div className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 border border-gray-100">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900 mb-0.5">Tandai sebagai Urgent</p>
                    <p className="text-[12px] text-gray-500">Akan memunculkan badge merah mencolok di portal kandidat</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={form.is_urgent} onChange={() => set('is_urgent', !form.is_urgent)} />
                    <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[22px] after:w-[22px] after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                {saveError && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
                    ⚠ {saveError}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-3">
              <button onClick={() => setShowForm(false)}
                className="apple-btn-secondary flex-1 sm:flex-none w-full sm:w-auto py-3">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving || !form.job_id || !form.title || !form.location || !form.description || !form.requirements || !form.responsibilities}
                className={`apple-btn-primary flex-1 py-3 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}>
                {saving ? 'Menyimpan...' : editingJob ? 'Simpan Perubahan' : 'Publish Job Posting'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}