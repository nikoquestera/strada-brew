'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, User, Clock, Star, Calendar, FileText, Plus, Check } from 'lucide-react'

type Tab = 'profil' | 'timeline' | 'evaluasi' | 'kpi' | 'cuti' | 'dokumen'

interface Props {
  employee: Record<string, any>
  timeline: Record<string, any>[]
  evaluations: Record<string, any>[]
  kpis: Record<string, any>[]
  leaves: Record<string, any>[]
  leaveBalance: Record<string, any> | null
  docTemplates: Record<string, any>[]
  docStatus: Record<string, any>[]
}

const TIMELINE_ICONS: Record<string, string> = {
  hired: '🎉', promoted: '⬆️', demoted: '⬇️', transfer_outlet: '🔄',
  salary_change: '💰', contract_renewed: '📋', warning_sp1: '⚠️',
  warning_sp2: '🚨', warning_sp3: '🛑', performance_review: '📊',
  kpi_set: '🎯', leave_approved: '🏖️', training_completed: '🎓',
  resignation: '👋', termination: '❌', note: '📝', default: '•'
}

const TIMELINE_COLORS: Record<string, string> = {
  hired: '#82A13B', promoted: '#005353', warning_sp1: '#DE9733',
  warning_sp2: '#FF4F31', warning_sp3: '#FF4F31', termination: '#FF4F31',
  resignation: '#8A8A8D', default: '#037894'
}

export default function KaryawanDetailClient({ employee, timeline, evaluations, kpis, leaves, leaveBalance, docTemplates, docStatus }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('profil')
  const [showAddTimeline, setShowAddTimeline] = useState(false)
  const [showAddLeave, setShowAddLeave] = useState(false)
  const [showAddKPI, setShowAddKPI] = useState(false)
  const [timelineEvents, setTimelineEvents] = useState(timeline)
  const [leaveList, setLeaveList] = useState(leaves)
  const [kpiList, setKpiList] = useState(kpis)
  const [docStatusMap, setDocStatusMap] = useState<Record<string, Record<string, any>>>(
    docStatus.reduce((acc, d) => ({ ...acc, [d.template_id]: d }), {})
  )

  // New timeline event form
  const [tlForm, setTlForm] = useState({ event_type: 'note', title: '', description: '', effective_date: new Date().toISOString().split('T')[0], from_value: '', to_value: '' })
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'annual', start_date: '', end_date: '', days_count: 0, reason: '' })
  const [kpiForm, setKpiForm] = useState({ period: '', kpi_name: '', target: '', weight: 10 })
  const [saving, setSaving] = useState(false)

  const statusColor: Record<string, { bg: string; color: string }> = {
    active: { bg: '#E6F4F1', color: '#005353' },
    inactive: { bg: '#F0EEEC', color: '#4C4845' },
    resigned: { bg: '#FEF8E6', color: '#DE9733' },
    terminated: { bg: '#FFF0EE', color: '#FF4F31' },
  }
  const s = statusColor[employee.status] || statusColor.inactive

  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null)
  const [generatedDocs, setGeneratedDocs] = useState<Record<string, string>>({})
  const [viewingDoc, setViewingDoc] = useState<{ title: string; html: string } | null>(null)

  // Daftar dokumen lengkap
  const DOC_LIST = [
    // View only
    { id: 'peraturan_perusahaan', name: 'Peraturan Perusahaan', type: 'view_only', category: 'Onboarding' },
    { id: 'pp_singkat_sp', name: 'Peraturan Perusahaan Singkat + SP', type: 'view_only', category: 'Onboarding' },
    { id: 'sop_seragam', name: 'SOP Seragam', type: 'view_only', category: 'Onboarding' },
    { id: 'memo_seragam', name: 'Internal Memo Seragam', type: 'view_only', category: 'Onboarding' },
    { id: 'sop_aset', name: 'SOP Pemakaian Aset & Peralatan', type: 'view_only', category: 'Onboarding' },
    { id: 'memo_sp', name: 'Memo SP', type: 'view_only', category: 'Disiplin' },
    { id: 'pp_2pager', name: '2 Pager PP', type: 'view_only', category: 'Onboarding' },
    { id: 'skd_luar', name: 'SKD Dinas Luar Kota', type: 'view_only', category: 'Operasional' },
    { id: 'skd_dalam', name: 'SKD Dinas Dalam Kota Jabodetabek', type: 'view_only', category: 'Operasional' },
    { id: 'sk_fasilitas', name: 'SK Fasilitas Karyawan', type: 'view_only', category: 'Fasilitas' },
    { id: 'memo_bpjs', name: 'Memo BPJS', type: 'view_only', category: 'Fasilitas' },
    { id: 'memo_insentif', name: 'Memo Insentif Komisi Merchandise', type: 'view_only', category: 'Fasilitas' },
    { id: 'memo_fasilitas_umum', name: 'Memo Penggunaan Fasilitas Umum', type: 'view_only', category: 'Fasilitas' },
    { id: 'program_onboarding', name: 'Program Onboarding Pembukaan Strada', type: 'view_only', category: 'Onboarding' },
    { id: 'culture', name: 'Culture / Budaya Kerja', type: 'view_only', category: 'Onboarding' },
    { id: 'offboarding_folder', name: 'Offboarding Folder', type: 'view_only', category: 'Offboarding' },
    // Generate
    { id: 'anti_suap', name: 'Kebijakan Anti Suap', type: 'generate', category: 'Legal' },
    { id: 'pernyataan_pp', name: 'Pernyataan Telah Baca PP', type: 'generate', category: 'Legal' },
    { id: 'nda', name: 'NDA (Non-Disclosure Agreement)', type: 'generate', category: 'Legal' },
    { id: 'offering_letter', name: 'Offering Letter', type: 'generate', category: 'Rekrutmen' },
    { id: 'onboarding_30', name: 'Onboarding 30 Days Plan', type: 'generate', category: 'Onboarding' },
    { id: '1on1_survey', name: '1ON1 Survey', type: 'generate', category: 'Evaluasi' },
    { id: '1on1_result', name: '1ON1 Result', type: 'generate', category: 'Evaluasi' },
    { id: 'exit_survey', name: 'Exit Survey', type: 'generate', category: 'Offboarding' },
  ]
  async function addTimeline() {
    setSaving(true)
    const { data } = await supabase.from('employee_timeline').insert([{
      employee_id: employee.id, ...tlForm,
      from_value: tlForm.from_value || null, to_value: tlForm.to_value || null,
      description: tlForm.description || null
    }]).select().single()
    if (data) setTimelineEvents(prev => [data, ...prev])
    setShowAddTimeline(false)
    setTlForm({ event_type: 'note', title: '', description: '', effective_date: new Date().toISOString().split('T')[0], from_value: '', to_value: '' })
    setSaving(false)
  }

  async function addLeave() {
    setSaving(true)
    const { data } = await supabase.from('employee_leaves').insert([{
      employee_id: employee.id, ...leaveForm, status: 'pending'
    }]).select().single()
    if (data) setLeaveList(prev => [data, ...prev])
    setShowAddLeave(false)
    setSaving(false)
  }

  async function addKPI() {
    setSaving(true)
    const { data } = await supabase.from('employee_kpis').insert([{
      employee_id: employee.id, ...kpiForm, status: 'active'
    }]).select().single()
    if (data) setKpiList(prev => [data, ...prev])
    setShowAddKPI(false)
    setSaving(false)
  }

  async function generateDocument(docId: string, docName: string) {
    setGeneratingDoc(docId)
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employee.id, doc_id: docId })
      })
      const data = await res.json()

      if (data.docx_base64) {
        const blob = new Blob(
          [Uint8Array.from(atob(data.docx_base64), c => c.charCodeAt(0))],
          { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.filename || `${docId}_${employee.employee_id}.docx`
        a.click()
        URL.revokeObjectURL(url)
        router.refresh()
      } else {
        // Template belum diupload atau fallback — tampilkan preview HTML
        const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        const html = buildFallbackHTML(docId, docName, employee, today)
        setGeneratedDocs(prev => ({ ...prev, [docId]: html }))
        setViewingDoc({ title: `${docName}${data.template_missing ? ' (Template belum diupload)' : ''}`, html })
      }
    } catch (err) {
      console.error('generateDocument error:', err)
    } finally {
      setGeneratingDoc(null)
    }
  }

function buildFallbackHTML(docId: string, docName: string, emp: any, today: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:40px;">
      <div style="background:#FEF8E6;border:1px solid #DE9733;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#DE9733;font-weight:600;">⚠ Template DOCX belum diupload</p>
        <p style="margin:4px 0 0;font-size:12px;color:#4C4845;">Upload template di menu HRD → Dokumen untuk menggunakan template resmi. Preview ini menggunakan template sementara.</p>
      </div>
      <div style="text-align:center;border-bottom:2px solid #020000;padding-bottom:20px;margin-bottom:30px;">
        <h2 style="margin:0;font-size:20px;">${docName.toUpperCase()}</h2>
        <p style="color:#037894;margin:4px 0 0;font-size:14px;">Strada Coffee — CV Kopi Terbaik Nusantara</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${[
          ['Nama Lengkap', emp.full_name],
          ['ID Karyawan', emp.employee_id],
          ['Jabatan', emp.position],
          ['Penempatan', emp.outlet || emp.entity],
          ['Tanggal', today],
        ].map(([k,v]) => `<tr><td style="padding:6px 0;color:#555;width:160px;">${k}</td><td>: <strong>${v || '[___________]'}</strong></td></tr>`).join('')}
      </table>
      <p style="color:#8A8A8D;font-style:italic;font-size:13px;">Konten dokumen akan ditampilkan dari template DOCX setelah diupload.</p>
      <div style="margin-top:60px;display:flex;justify-content:space-between;">
        <div style="text-align:center;"><div style="border-bottom:1px solid #020000;width:180px;margin:0 0 6px;"></div><p style="margin:0;font-weight:bold;">${emp.full_name}</p></div>
        <div style="text-align:center;"><div style="border-bottom:1px solid #020000;width:180px;margin:0 0 6px;"></div><p style="margin:0;font-weight:bold;">Evani Jesslyn</p></div>
      </div>
    </div>`
}

  async function toggleDocStatus(templateId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'pending' ? 'presented' : currentStatus === 'presented' ? 'signed' : currentStatus === 'signed' ? 'filed' : 'pending'
    const existing = docStatusMap[templateId]
    if (existing) {
      await supabase.from('employee_document_status').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('employee_document_status').insert([{ employee_id: employee.id, template_id: templateId, status: nextStatus }])
    }
    setDocStatusMap(prev => ({ ...prev, [templateId]: { ...prev[templateId], status: nextStatus } }))
  }

  async function approveLeave(leaveId: string, approved: boolean) {
    await supabase.from('employee_leaves').update({ status: approved ? 'approved' : 'rejected', approved_at: new Date().toISOString() }).eq('id', leaveId)
    setLeaveList(prev => prev.map(l => l.id === leaveId ? { ...l, status: approved ? 'approved' : 'rejected' } : l))
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'profil', label: 'Profil', icon: <User size={14} /> },
    { key: 'timeline', label: 'Timeline', icon: <Clock size={14} />, count: timelineEvents.length },
    { key: 'evaluasi', label: 'Evaluasi', icon: <Star size={14} />, count: evaluations.length },
    { key: 'kpi', label: 'KPI', icon: <Star size={14} />, count: kpiList.length },
    { key: 'cuti', label: 'Cuti', icon: <Calendar size={14} />, count: leaveList.length },
    { key: 'dokumen', label: 'Dokumen', icon: <FileText size={14} /> },
  ]

  const docStatusDisplay: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'Belum', color: '#8A8A8D', bg: '#F0EEEC' },
    presented: { label: 'Diberikan', color: '#037894', bg: '#E6F0F4' },
    signed: { label: 'Ditandatangani', color: '#005353', bg: '#E6F4F1' },
    filed: { label: 'Diarsipkan', color: '#82A13B', bg: '#EEF3E6' },
  }

  const completedDocs = Object.values(docStatusMap).filter(d => d.status !== 'pending').length
  const totalDocs = docTemplates.length

  const inp = "w-full px-3 py-2.5 rounded-xl text-sm outline-none"
  const ist = { border: '1.5px solid #E8E4E0', backgroundColor: '#FAFAF9', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#4C4845', marginBottom: '5px' } as const

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .emp-header { flex-direction: column !important; align-items: flex-start !important; }
          .emp-tabs { overflow-x: auto; }
          .emp-grid { grid-template-columns: 1fr !important; }
          .kpi-grid { grid-template-columns: 1fr !important; }
        }
        .tab-btn { white-space: nowrap; border: none; cursor: pointer; transition: all 0.15s; }
        .tab-btn:hover { color: #020000 !important; }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>

        {/* Header */}
        <div style={{ backgroundColor: '#020000', padding: '0' }}>
          <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }} className="emp-header">
            <button onClick={() => router.push('/dashboard/hrd/karyawan')}
              style={{ color: 'rgba(228,222,216,0.5)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: 0, flexShrink: 0 }}>
              <ArrowLeft size={15} /> Karyawan
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#037894', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>{employee.full_name[0]}</span>
                </div>
                <div>
                  <p style={{ color: '#ffffff', fontWeight: 800, fontSize: '18px', margin: 0, lineHeight: 1.2 }}>{employee.full_name}</p>
                  <p style={{ color: '#8FC6C5', fontSize: '12px', margin: 0 }}>{employee.position} · {employee.department} · {employee.entity}</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', backgroundColor: s.bg, color: s.color }}>
                {employee.status.toUpperCase()}
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(228,222,216,0.4)', fontWeight: 600 }}>{employee.employee_id}</span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', paddingLeft: '24px', overflowX: 'auto' }} className="emp-tabs">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className="tab-btn"
                style={{ padding: '12px 18px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                  backgroundColor: 'transparent', color: tab === t.key ? '#ffffff' : 'rgba(228,222,216,0.4)',
                  borderBottom: tab === t.key ? '2px solid #037894' : '2px solid transparent' }}>
                {t.icon} {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px',
                    backgroundColor: tab === t.key ? '#037894' : 'rgba(255,255,255,0.1)', color: '#fff' }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>

          {/* ── PROFIL TAB ── */}
          {tab === 'profil' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="emp-grid">
              {[
                { title: 'Data Pribadi', fields: [
                  ['NIK KTP', employee.id_number || '-'],
                  ['Tanggal Lahir', employee.birth_date ? new Date(employee.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'],
                  ['Jenis Kelamin', employee.gender === 'L' ? 'Laki-laki' : employee.gender === 'P' ? 'Perempuan' : '-'],
                  ['Email', employee.email || '-'],
                  ['No. HP', employee.phone || '-'],
                  ['Alamat', employee.address || '-'],
                ]},
                { title: 'Data Pekerjaan', fields: [
                  ['Posisi', employee.position],
                  ['Departemen', employee.department],
                  ['Entity', employee.entity],
                  ['Outlet', employee.outlet || '-'],
                  ['Tipe Kontrak', employee.employment_type || '-'],
                  ['Tanggal Masuk', new Date(employee.join_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })],
                ]},
                { title: 'Kontrak', fields: [
                  ['Mulai Kontrak', employee.contract_start ? new Date(employee.contract_start).toLocaleDateString('id-ID') : '-'],
                  ['Akhir Kontrak', employee.contract_end ? new Date(employee.contract_end).toLocaleDateString('id-ID') : 'Tidak ada (Tetap)'],
                  ['Gaji Pokok', employee.base_salary ? 'Rp ' + Number(employee.base_salary).toLocaleString('id-ID') : '-'],
                ]},
                { title: 'Catatan', fields: [['Catatan Internal', employee.notes || '-']] },
              ].map(section => (
                <div key={section.title} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid #E8E4E0' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#020000', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '1px' }}>{section.title}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {section.fields.map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '7px 0', borderBottom: '1px solid #F0EEEC' }}>
                        <span style={{ fontSize: '12px', color: '#8A8A8D', flexShrink: 0 }}>{k}</span>
                        <span style={{ fontSize: '13px', color: '#020000', fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TIMELINE TAB ── */}
          {tab === 'timeline' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: 0 }}>Timeline Karyawan</h2>
                <button onClick={() => setShowAddTimeline(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> Tambah Event
                </button>
              </div>

              {/* Add event form */}
              {showAddTimeline && (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid rgba(3,120,148,0.2)', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 16px' }}>Tambah Event Baru</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={lbl}>Tipe Event</label>
                      <select className={inp} style={ist} value={tlForm.event_type} onChange={e => setTlForm(f => ({ ...f, event_type: e.target.value }))}>
                        <option value="note">Catatan</option>
                        <option value="promoted">Promosi</option>
                        <option value="transfer_outlet">Transfer Outlet</option>
                        <option value="salary_change">Perubahan Gaji</option>
                        <option value="contract_renewed">Perpanjangan Kontrak</option>
                        <option value="warning_sp1">SP 1</option>
                        <option value="warning_sp2">SP 2</option>
                        <option value="warning_sp3">SP 3</option>
                        <option value="performance_review">Review Performa</option>
                        <option value="training_completed">Selesai Training</option>
                        <option value="resignation">Resign</option>
                        <option value="termination">PHK</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Tanggal Efektif</label>
                      <input type="date" className={inp} style={ist} value={tlForm.effective_date} onChange={e => setTlForm(f => ({ ...f, effective_date: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={lbl}>Judul <span style={{ color: '#FF4F31' }}>*</span></label>
                    <input className={inp} style={ist} value={tlForm.title} onChange={e => setTlForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Dipromosikan menjadi Senior Barista" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={lbl}>Dari</label>
                      <input className={inp} style={ist} value={tlForm.from_value} onChange={e => setTlForm(f => ({ ...f, from_value: e.target.value }))} placeholder="e.g. Barista" />
                    </div>
                    <div>
                      <label style={lbl}>Ke</label>
                      <input className={inp} style={ist} value={tlForm.to_value} onChange={e => setTlForm(f => ({ ...f, to_value: e.target.value }))} placeholder="e.g. Senior Barista" />
                    </div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={lbl}>Catatan</label>
                    <textarea className={inp} style={{ ...ist, resize: 'none' }} value={tlForm.description} onChange={e => setTlForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Detail tambahan..." />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowAddTimeline(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', backgroundColor: 'transparent', color: '#4C4845', fontSize: '13px', cursor: 'pointer' }}>Batal</button>
                    <button onClick={addTimeline} disabled={saving || !tlForm.title}
                      style={{ flex: 2, padding: '10px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                      {saving ? 'Menyimpan...' : 'Simpan Event'}
                    </button>
                  </div>
                </div>
              )}

              {/* Timeline list */}
              <div style={{ position: 'relative' }}>
                {/* Vertical line */}
                <div style={{ position: 'absolute', left: '19px', top: '20px', bottom: '20px', width: '2px', backgroundColor: '#E8E4E0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {timelineEvents.map(event => {
                    const color = TIMELINE_COLORS[event.event_type] || TIMELINE_COLORS.default
                    const icon = TIMELINE_ICONS[event.event_type] || TIMELINE_ICONS.default
                    return (
                      <div key={event.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '12px 0' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: `${color}18`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, fontSize: '16px' }}>
                          {icon}
                        </div>
                        <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '14px', padding: '14px 16px', border: '1.5px solid #E8E4E0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: 0 }}>{event.title}</p>
                            <span style={{ fontSize: '11px', color: '#8A8A8D', flexShrink: 0 }}>
                              {new Date(event.effective_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          {(event.from_value || event.to_value) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                              {event.from_value && <span style={{ fontSize: '12px', color: '#8A8A8D', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F0EEEC' }}>{event.from_value}</span>}
                              {event.from_value && event.to_value && <span style={{ fontSize: '12px', color: '#8A8A8D' }}>→</span>}
                              {event.to_value && <span style={{ fontSize: '12px', color: color, padding: '2px 8px', borderRadius: '6px', backgroundColor: `${color}18`, fontWeight: 600 }}>{event.to_value}</span>}
                            </div>
                          )}
                          {event.description && <p style={{ fontSize: '12px', color: '#4C4845', margin: '6px 0 0', lineHeight: 1.5 }}>{event.description}</p>}
                        </div>
                      </div>
                    )
                  })}
                  {timelineEvents.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#8A8A8D', fontSize: '14px' }}>Belum ada event timeline.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── EVALUASI TAB ── */}
          {tab === 'evaluasi' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: 0 }}>Evaluasi Kinerja</h2>
              </div>
              {evaluations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', color: '#8A8A8D', fontSize: '14px' }}>
                  Belum ada evaluasi untuk karyawan ini.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {evaluations.map(ev => (
                    <div key={ev.id} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid #E8E4E0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <p style={{ fontSize: '15px', fontWeight: 700, color: '#020000', margin: '0 0 4px' }}>
                            Evaluasi {ev.evaluation_type === 'probation' ? 'Probation' : ev.evaluation_type === 'quarterly' ? 'Triwulan' : ev.evaluation_type === 'annual' ? 'Tahunan' : 'Khusus'}
                          </p>
                          <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>
                            {new Date(ev.period_start).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} –
                            {new Date(ev.period_end).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {ev.overall_score && (
                            <div style={{ fontSize: '28px', fontWeight: 800, color: ev.overall_score >= 80 ? '#005353' : ev.overall_score >= 60 ? '#DE9733' : '#FF4F31' }}>
                              {ev.overall_score}
                              <span style={{ fontSize: '14px', color: '#8A8A8D' }}>/100</span>
                            </div>
                          )}
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '8px',
                            backgroundColor: ev.status === 'completed' ? '#E6F4F1' : ev.status === 'in_progress' ? '#FEF8E6' : '#F0EEEC',
                            color: ev.status === 'completed' ? '#005353' : ev.status === 'in_progress' ? '#DE9733' : '#8A8A8D' }}>
                            {ev.status === 'completed' ? 'Selesai' : ev.status === 'in_progress' ? 'Berjalan' : 'Terjadwal'}
                          </span>
                        </div>
                      </div>
                      {ev.notes && <p style={{ fontSize: '13px', color: '#4C4845', marginTop: '10px', lineHeight: 1.6 }}>{ev.notes}</p>}
                      {ev.recommendation && (
                        <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#F7F5F2', fontSize: '13px', color: '#020000' }}>
                          Rekomendasi: <strong style={{ color: ev.recommendation === 'promote' ? '#005353' : ev.recommendation === 'pip' ? '#DE9733' : ev.recommendation === 'terminate' ? '#FF4F31' : '#020000' }}>
                            {ev.recommendation === 'promote' ? 'Promosi' : ev.recommendation === 'retain' ? 'Pertahankan' : ev.recommendation === 'pip' ? 'PIP (Performance Improvement)' : ev.recommendation === 'terminate' ? 'Pengakhiran' : 'Pending'}
                          </strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── KPI TAB ── */}
          {tab === 'kpi' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: 0 }}>KPI</h2>
                <button onClick={() => setShowAddKPI(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> Set KPI
                </button>
              </div>

              {showAddKPI && (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid rgba(3,120,148,0.2)', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 14px' }}>Set KPI Baru</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }} className="kpi-grid">
                    <div>
                      <label style={lbl}>Periode</label>
                      <input className={inp} style={ist} value={kpiForm.period} onChange={e => setKpiForm(f => ({ ...f, period: e.target.value }))} placeholder="2026-Q2" />
                    </div>
                    <div>
                      <label style={lbl}>Bobot (%)</label>
                      <input type="number" min="1" max="100" className={inp} style={ist} value={kpiForm.weight} onChange={e => setKpiForm(f => ({ ...f, weight: parseInt(e.target.value) || 10 }))} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={lbl}>Nama KPI</label>
                    <input className={inp} style={ist} value={kpiForm.kpi_name} onChange={e => setKpiForm(f => ({ ...f, kpi_name: e.target.value }))} placeholder="e.g. Konsistensi kualitas minuman" />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={lbl}>Target</label>
                    <input className={inp} style={ist} value={kpiForm.target} onChange={e => setKpiForm(f => ({ ...f, target: e.target.value }))} placeholder="e.g. Skor kepuasan ≥ 4.5/5 setiap bulan" />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowAddKPI(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', backgroundColor: 'transparent', color: '#4C4845', fontSize: '13px', cursor: 'pointer' }}>Batal</button>
                    <button onClick={addKPI} disabled={saving || !kpiForm.kpi_name || !kpiForm.period}
                      style={{ flex: 2, padding: '10px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                      Simpan KPI
                    </button>
                  </div>
                </div>
              )}

              {kpiList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', color: '#8A8A8D', fontSize: '14px' }}>Belum ada KPI yang ditetapkan.</div>
              ) : (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #F0EEEC', backgroundColor: '#FAFAF9' }}>
                        {['Periode', 'KPI', 'Target', 'Aktual', 'Bobot', 'Skor', 'Status'].map(h => (
                          <th key={h} style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {kpiList.map(kpi => (
                        <tr key={kpi.id} style={{ borderBottom: '1px solid #F0EEEC' }}>
                          <td style={{ padding: '12px 14px', fontSize: '12px', color: '#037894', fontWeight: 600 }}>{kpi.period}</td>
                          <td style={{ padding: '12px 14px', fontSize: '13px', color: '#020000', fontWeight: 500 }}>{kpi.kpi_name}</td>
                          <td style={{ padding: '12px 14px', fontSize: '12px', color: '#4C4845' }}>{kpi.target}</td>
                          <td style={{ padding: '12px 14px', fontSize: '12px', color: '#4C4845' }}>{kpi.actual || '-'}</td>
                          <td style={{ padding: '12px 14px', fontSize: '12px', color: '#8A8A8D' }}>{kpi.weight}%</td>
                          <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700, color: kpi.score >= 80 ? '#005353' : kpi.score >= 60 ? '#DE9733' : kpi.score ? '#FF4F31' : '#8A8A8D' }}>
                            {kpi.score ? `${kpi.score}` : '-'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                              backgroundColor: kpi.status === 'completed' ? '#E6F4F1' : '#FEF8E6',
                              color: kpi.status === 'completed' ? '#005353' : '#DE9733' }}>
                              {kpi.status === 'completed' ? 'Selesai' : 'Aktif'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── CUTI TAB ── */}
          {tab === 'cuti' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: 0 }}>Cuti & Izin</h2>
                <button onClick={() => setShowAddLeave(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> Ajukan Cuti
                </button>
              </div>

              {/* Leave balance */}
              {leaveBalance && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }} className="kpi-grid">
                  {[
                    { label: 'Kuota Tahunan', value: leaveBalance.annual_quota, color: '#037894' },
                    { label: 'Cuti Dipakai', value: leaveBalance.annual_used, color: '#DE9733' },
                    { label: 'Sisa Cuti', value: (leaveBalance.annual_quota + leaveBalance.carry_over) - leaveBalance.annual_used, color: '#005353' },
                    { label: 'Sakit', value: leaveBalance.sick_used, color: '#8A8A8D' },
                  ].map(b => (
                    <div key={b.label} style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', border: '1.5px solid #E8E4E0', textAlign: 'center' }}>
                      <p style={{ fontSize: '28px', fontWeight: 800, color: b.color, margin: '0 0 4px' }}>{b.value}</p>
                      <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>{b.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add leave form */}
              {showAddLeave && (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid rgba(3,120,148,0.2)', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 14px' }}>Pengajuan Cuti/Izin</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }} className="form-grid-3">
                    <div>
                      <label style={lbl}>Jenis</label>
                      <select className={inp} style={ist} value={leaveForm.leave_type} onChange={e => setLeaveForm(f => ({ ...f, leave_type: e.target.value }))}>
                        <option value="annual">Cuti Tahunan</option>
                        <option value="sick">Sakit</option>
                        <option value="emergency">Darurat</option>
                        <option value="maternity">Cuti Hamil</option>
                        <option value="paternity">Cuti Ayah</option>
                        <option value="unpaid">Tanpa Gaji</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Mulai</label>
                      <input type="date" className={inp} style={ist} value={leaveForm.start_date} onChange={e => setLeaveForm(f => ({ ...f, start_date: e.target.value }))} />
                    </div>
                    <div>
                      <label style={lbl}>Selesai</label>
                      <input type="date" className={inp} style={ist} value={leaveForm.end_date} onChange={e => {
                        const days = leaveForm.start_date ? Math.ceil((new Date(e.target.value).getTime() - new Date(leaveForm.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0
                        setLeaveForm(f => ({ ...f, end_date: e.target.value, days_count: Math.max(0, days) }))
                      }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={lbl}>Jumlah Hari: <strong style={{ color: '#037894' }}>{leaveForm.days_count}</strong></label>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={lbl}>Alasan</label>
                    <textarea className={inp} style={{ ...ist, resize: 'none' }} value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Alasan pengajuan cuti..." />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowAddLeave(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #E8E4E0', backgroundColor: 'transparent', color: '#4C4845', fontSize: '13px', cursor: 'pointer' }}>Batal</button>
                    <button onClick={addLeave} disabled={saving || !leaveForm.start_date || !leaveForm.end_date}
                      style={{ flex: 2, padding: '10px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                      Ajukan
                    </button>
                  </div>
                </div>
              )}

              {/* Leave list */}
              {leaveList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', color: '#8A8A8D', fontSize: '14px' }}>Belum ada pengajuan cuti.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {leaveList.map(leave => (
                    <div key={leave.id} style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px 20px', border: '1.5px solid #E8E4E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#020000', margin: '0 0 3px' }}>
                          {leave.leave_type === 'annual' ? 'Cuti Tahunan' : leave.leave_type === 'sick' ? 'Sakit' : leave.leave_type === 'emergency' ? 'Darurat' : leave.leave_type === 'maternity' ? 'Cuti Hamil' : leave.leave_type === 'paternity' ? 'Cuti Ayah' : 'Tanpa Gaji'}
                          <span style={{ fontSize: '12px', color: '#8A8A8D', fontWeight: 400, marginLeft: '8px' }}>{leave.days_count} hari</span>
                        </p>
                        <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>
                          {new Date(leave.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {new Date(leave.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {leave.reason && <p style={{ fontSize: '12px', color: '#4C4845', margin: '4px 0 0', fontStyle: 'italic' }}>{leave.reason}</p>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '8px',
                          backgroundColor: leave.status === 'approved' ? '#E6F4F1' : leave.status === 'rejected' ? '#FFF0EE' : leave.status === 'cancelled' ? '#F0EEEC' : '#FEF8E6',
                          color: leave.status === 'approved' ? '#005353' : leave.status === 'rejected' ? '#FF4F31' : leave.status === 'cancelled' ? '#8A8A8D' : '#DE9733' }}>
                          {leave.status === 'approved' ? 'Disetujui' : leave.status === 'rejected' ? 'Ditolak' : leave.status === 'cancelled' ? 'Dibatalkan' : 'Pending'}
                        </span>
                        {leave.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => approveLeave(leave.id, true)}
                              style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: '#E6F4F1', color: '#005353', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>✓</button>
                            <button onClick={() => approveLeave(leave.id, false)}
                              style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: '#FFF0EE', color: '#FF4F31', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>✗</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DOKUMEN TAB ── */}
          {tab === 'dokumen' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: 0 }}>Dokumen Karyawan</h2>
                <span style={{ fontSize: '13px', color: '#8A8A8D' }}>{completedDocs}/{totalDocs} checklist selesai</span>
              </div>

              {/* Progress */}
              <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#E8E4E0', marginBottom: '24px' }}>
                <div style={{ height: '100%', borderRadius: '3px', backgroundColor: '#037894', width: `${totalDocs > 0 ? (completedDocs / totalDocs) * 100 : 0}%`, transition: 'width 0.3s' }} />
              </div>

              {/* Generate-able documents */}
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 10px' }}>Generate Dokumen</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                  {DOC_LIST.filter(d => d.type === 'generate').map(doc => (
                    <div key={doc.id} style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', border: '1.5px solid #E8E4E0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '1px' }}>{doc.category}</span>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#020000', margin: '3px 0 0' }}>{doc.name}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => generateDocument(doc.id, doc.name)}
                          disabled={generatingDoc === doc.id}
                          style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: generatingDoc === doc.id ? '#8A8A8D' : '#037894', color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: generatingDoc === doc.id ? 'not-allowed' : 'pointer' }}>
                          {generatingDoc === doc.id ? '⚙ Membuat...' : '+ Generate'}
                        </button>
                        {generatedDocs[doc.id] && (
                          <button onClick={() => setViewingDoc({ title: doc.name, html: generatedDocs[doc.id] })}
                            style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: '#E6F4F1', color: '#005353', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Checklist documents grouped by category */}
              {Object.entries(
                DOC_LIST.filter(d => d.type === 'view_only').reduce((acc, d) => {
                  if (!acc[d.category]) acc[d.category] = []
                  acc[d.category].push(d)
                  return acc
                }, {} as Record<string, typeof DOC_LIST>)
              ).map(([category, docs]) => (
                <div key={category} style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 10px' }}>{category}</p>
                  <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', overflow: 'hidden' }}>
                    {docs.map((doc, idx) => {
                      const docSt = docStatusMap[doc.id] || docStatusMap[docTemplates.find(t => t.name === doc.name)?.id || '']
                      const status = docSt?.status || 'pending'
                      const display = docStatusDisplay[status]
                      const templateId = docTemplates.find(t => t.name === doc.name)?.id
                      return (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: idx < docs.length - 1 ? '1px solid #F0EEEC' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div onClick={() => templateId && toggleDocStatus(templateId, status)}
                              style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${status !== 'pending' ? '#037894' : '#D4CFC9'}`, backgroundColor: status !== 'pending' ? '#037894' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: templateId ? 'pointer' : 'default', flexShrink: 0 }}>
                              {status !== 'pending' && <Check size={12} color="#fff" />}
                            </div>
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: 500, color: '#020000', margin: 0 }}>{doc.name}</p>
                              <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>View only · Tunjukkan ke karyawan</p>
                            </div>
                          </div>
                          {templateId && (
                            <button onClick={() => toggleDocStatus(templateId, status)}
                              style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer', backgroundColor: display.bg, color: display.color, flexShrink: 0 }}>
                              {display.label}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Document viewer modal */}
              {viewingDoc && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', flexDirection: 'column', padding: '20px' }}
                  onClick={e => { if (e.target === e.currentTarget) setViewingDoc(null) }}>
                  <div style={{ backgroundColor: '#fff', borderRadius: '16px', maxWidth: '760px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E8E4E0', flexShrink: 0 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#020000', margin: 0 }}>{viewingDoc.title}</h3>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            const w = window.open('', '_blank')
                            if (w) {
                              w.document.write(`<!DOCTYPE html><html><head><title>${viewingDoc.title}</title><style>@media print{body{margin:0}}</style></head><body>${viewingDoc.html}<script>window.onload=()=>window.print()</script></body></html>`)
                              w.document.close()
                            }
                          }}
                          style={{ padding: '7px 16px', borderRadius: '8px', backgroundColor: '#020000', color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                          🖨 Print / Save PDF
                        </button>
                        <button onClick={() => setViewingDoc(null)}
                          style={{ padding: '7px 12px', borderRadius: '8px', backgroundColor: '#F0EEEC', color: '#4C4845', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                          ✕ Tutup
                        </button>
                      </div>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
                      <div dangerouslySetInnerHTML={{ __html: viewingDoc.html }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}