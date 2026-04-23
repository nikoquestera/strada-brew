'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, User, Users, Briefcase, Clock, Star, Calendar, FileText, Plus, Check, Edit, X, MessageSquare } from 'lucide-react'

function formatTs(ts?: string) {
  if (!ts) return null
  return new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type Tab = 'profil' | 'keluarga' | 'riwayat' | 'timeline' | 'evaluasi' | 'kpi' | 'cuti' | 'dokumen' | 'catatan' | 'cv'

interface Props {
  employee: Record<string, any>
  timeline: Record<string, any>[]
  evaluations: Record<string, any>[]
  kpis: Record<string, any>[]
  leaves: Record<string, any>[]
  leaveBalance: Record<string, any> | null
  docTemplates: Record<string, any>[]
  docStatus: Record<string, any>[]
  applicantScreeningNotes: Record<string, any>[]
  applicantCvUrl: string | null
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

export default function KaryawanDetailClient({ employee, timeline, evaluations, kpis, leaves, leaveBalance, docTemplates, docStatus, applicantScreeningNotes, applicantCvUrl }: Props) {
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

  // Edit Profil
  const [showEditProfil, setShowEditProfil] = useState(false)
  const [editForm, setEditProfilForm] = useState<Record<string, any>>({
    ...employee,
    // Normalize: prefer new column names, fall back to legacy
    identity_number: employee.identity_number || employee.id_number,
    address_ktp: employee.address_ktp || employee.address,
    nickname: employee.nickname || employee.nick_name,
    bpjs_kesehatan_number: employee.bpjs_kesehatan_number || employee.bpjs_kesehatan,
    bpjs_ketenagakerjaan_number: employee.bpjs_ketenagakerjaan_number || employee.bpjs_tk,
    npwp_number: employee.npwp_number || employee.npwp,
  })
  const [editing, setEditing] = useState(false)

  async function handleUpdateProfil() {
    setEditing(true)
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          // Identity
          full_name: editForm.full_name,
          nickname: editForm.nickname,
          nick_name: editForm.nickname, // sync legacy column
          identity_number: editForm.identity_number,
          id_number: editForm.identity_number, // sync legacy column
          birth_place: editForm.birth_place,
          birth_date: editForm.birth_date || null,
          religion: editForm.religion,
          blood_type: editForm.blood_type,
          gender: editForm.gender,
          email: editForm.email,
          phone: editForm.phone,
          home_phone: editForm.home_phone,
          address_ktp: editForm.address_ktp,
          address: editForm.address_ktp, // sync legacy column
          address_domicile: editForm.address_domicile,
          postal_code: editForm.postal_code,

          // Work
          position: editForm.position,
          department: editForm.department,
          entity: editForm.entity,
          outlet: editForm.outlet,
          employment_type: editForm.employment_type,
          join_date: editForm.join_date || null,
          contract_start: editForm.contract_start || null,
          contract_end: editForm.contract_end || null,
          base_salary: editForm.base_salary || null,

          // Family
          marital_status: editForm.marital_status,
          marital_since: editForm.marital_since || null,

          // Financial — write to both new and legacy columns
          bpjs_kesehatan_number: editForm.bpjs_kesehatan_number,
          bpjs_kesehatan: editForm.bpjs_kesehatan_number, // sync legacy
          bpjs_ketenagakerjaan_number: editForm.bpjs_ketenagakerjaan_number,
          bpjs_tk: editForm.bpjs_ketenagakerjaan_number, // sync legacy
          npwp_number: editForm.npwp_number,
          npwp: editForm.npwp_number, // sync legacy
          bank_account_number: editForm.bank_account_number,
          bank_account_name: editForm.bank_account_name,

          notes: editForm.notes,
          case_notes: editForm.notes
        })
        .eq('id', employee.id)
      if (error) throw error
      alert('Profil berhasil diperbarui!')
      setShowEditProfil(false)
      router.refresh()
    } catch (err: any) {
      alert(`Gagal memperbarui profil: ${err.message}`)
    } finally {
      setEditing(false)
    }
  }

  // CV state (linked applicant's CV)
  const [empCvUrl, setEmpCvUrl] = useState<string>(applicantCvUrl || '')
  const [uploadingEmpCv, setUploadingEmpCv] = useState(false)

  async function handleEmpCvUpload(file: File) {
    if (!employee.applicant_id) return
    setUploadingEmpCv(true)
    try {
      const ext = file.name.split('.').pop() || 'pdf'
      const path = `cv_${employee.applicant_id}_${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('cvs').upload(path, file, { contentType: file.type, upsert: true })
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('cvs').getPublicUrl(data.path)
        const newUrl = urlData.publicUrl
        await supabase.from('applicants').update({ cv_url: newUrl }).eq('id', employee.applicant_id)
        setEmpCvUrl(newUrl)
      }
    } finally {
      setUploadingEmpCv(false)
    }
  }

  // Internal notes (saved per-entry to employee_timeline with event_type='internal_note')
  const [noteInput, setNoteInput] = useState<string>('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [internalNotesList, setInternalNotesList] = useState<Record<string, any>[]>(
    timeline.filter(t => t.event_type === 'internal_note')
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  )

  async function handleSaveNotes() {
    if (!noteInput.trim()) return
    setSavingNotes(true)
    const textToSave = noteInput.trim()
    const nowIso = new Date().toISOString()
    const { data: inserted, error } = await supabase.from('employee_timeline').insert([{
      employee_id: employee.id,
      event_type: 'internal_note',
      title: textToSave,
      description: null,
      effective_date: nowIso.split('T')[0],
    }]).select().single()
    if (!error) {
      // Optimistically push the new note so it appears immediately
      const newNote = inserted ?? {
        id: `temp-${Date.now()}`,
        employee_id: employee.id,
        event_type: 'internal_note',
        title: textToSave,
        description: null,
        effective_date: nowIso.split('T')[0],
        created_at: nowIso,
      }
      setInternalNotesList(prev => [newNote, ...prev])
      setNoteInput('')
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } else {
      console.error('[handleSaveNotes] error:', error)
      alert('Gagal menyimpan catatan: ' + error.message)
    }
    setSavingNotes(false)
  }

  // Quest AI scoring
  const [empScores, setEmpScores] = useState<any[]>([])
  const [empScoring, setEmpScoring] = useState(false)
  const [expandedEmpHistory, setExpandedEmpHistory] = useState(false)
  const empScoresRef = useRef(empScores)
  useEffect(() => { empScoresRef.current = empScores }, [empScores])

  // Load employee scores once on mount and poll when processing
  useEffect(() => {
    const supabaseClient = createClient()
    async function loadScores() {
      const { data } = await supabaseClient
        .from('applicant_quest_scores')
        .select('*')
        .eq('employee_id', employee.id)
        .order('processed_at', { ascending: false, nullsFirst: false })
      if (data) setEmpScores(data)
    }
    loadScores()
    const interval = setInterval(async () => {
      const hasProcessing = empScoresRef.current.some((s: any) => s.status === 'processing')
      if (!hasProcessing) return
      const { data } = await supabaseClient
        .from('applicant_quest_scores')
        .select('*')
        .eq('employee_id', employee.id)
        .order('processed_at', { ascending: false, nullsFirst: false })
      if (data) setEmpScores(data)
    }, 3000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleEmpRunScore() {
    setEmpScoring(true)
    const tempId = `tmp-${Date.now()}`
    setEmpScores(prev => [{ id: tempId, status: 'processing', created_at: new Date().toISOString() }, ...prev])
    try {
      const res = await fetch('/api/quest/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employee.id }),
      })
      if (!res.ok) throw new Error(await res.text())
    } catch (err) {
      console.error('Employee score failed:', err)
      setEmpScores(prev => prev.map((s: any) => s.id === tempId ? { ...s, status: 'failed' } : s))
    } finally {
      setEmpScoring(false)
    }
  }

  const latestEmpScore = empScores[0]
  const isEmpProcessing = latestEmpScore?.status === 'processing' || empScoring

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

  const res = await fetch('/api/documents/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: employee.id, doc_id: docId })
  })
  const data = await res.json()

  if (data.docx_base64) {
    // Template ada — download langsung sebagai DOCX
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

    setGeneratingDoc(null)
    // Refresh doc status
    router.refresh()
  } else if (data.mode === 'manual') {
    // Template belum diupload — tampilkan preview HTML fallback
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const html = buildFallbackHTML(docId, docName, employee, today)
    setGeneratedDocs(prev => ({ ...prev, [docId]: html }))
    setViewingDoc({ title: `${docName} (Template belum diupload)`, html })
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

  const totalNotes = internalNotesList.length + applicantScreeningNotes.length
  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'profil', label: 'Profil', icon: <User size={14} /> },
    { key: 'keluarga', label: 'Keluarga', icon: <Users size={14} /> },
    { key: 'riwayat', label: 'Riwayat', icon: <Briefcase size={14} /> },
    { key: 'timeline', label: 'Timeline', icon: <Clock size={14} />, count: timelineEvents.filter(t => t.event_type !== 'internal_note').length },
    { key: 'evaluasi', label: 'Evaluasi', icon: <Star size={14} />, count: evaluations.length },
    { key: 'kpi', label: 'KPI', icon: <Star size={14} />, count: kpiList.length },
    { key: 'cuti', label: 'Cuti', icon: <Calendar size={14} />, count: leaveList.length },
    { key: 'dokumen', label: 'Dokumen', icon: <FileText size={14} /> },
    { key: 'catatan', label: 'Catatan', icon: <MessageSquare size={14} />, count: totalNotes > 0 ? totalNotes : undefined },
    { key: 'cv', label: 'CV', icon: <FileText size={14} /> },
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
        .tab-btn:hover { color: #037894 !important; background: #F9FBFB !important; }
        .emp-form-btn:hover { opacity: 0.85 !important; }
        .emp-cancel-btn:hover { background: #E8E4E0 !important; }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>

        {/* Edit Modal */}
        {showEditProfil && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#020000', margin: 0 }}>Edit Profil Karyawan</h2>
                <button onClick={() => setShowEditProfil(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8A8D' }}><X size={24} /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                {/* Column 1: Identity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-section-title" style={{ fontSize: '11px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1.5px solid #F0EEEC', paddingBottom: '8px' }}>Identitas</div>
                  <div><label style={lbl}>Nama Lengkap</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.full_name || ''} onChange={e => setEditProfilForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                  <div><label style={lbl}>Nama Panggilan</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.nickname || ''} onChange={e => setEditProfilForm(f => ({ ...f, nickname: e.target.value }))} /></div>
                  <div><label style={lbl}>NIK KTP/SIM</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.identity_number || ''} onChange={e => setEditProfilForm(f => ({ ...f, identity_number: e.target.value }))} /></div>
                  <div><label style={lbl}>Email</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.email || ''} onChange={e => setEditProfilForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><label style={lbl}>No. HP</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.phone || ''} onChange={e => setEditProfilForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div><label style={lbl}>Telp Rumah</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.home_phone || ''} onChange={e => setEditProfilForm(f => ({ ...f, home_phone: e.target.value }))} /></div>
                </div>

                {/* Column 2: Personal & Family */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-section-title" style={{ fontSize: '11px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1.5px solid #F0EEEC', paddingBottom: '8px' }}>Pribadi & Keluarga</div>
                  <div><label style={lbl}>Tempat Lahir</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.birth_place || ''} onChange={e => setEditProfilForm(f => ({ ...f, birth_place: e.target.value }))} /></div>
                  <div><label style={lbl}>Tanggal Lahir</label><input type="date" style={{...ist, width:'100%', padding:'10px'}} value={editForm.birth_date || ''} onChange={e => setEditProfilForm(f => ({ ...f, birth_date: e.target.value }))} /></div>
                  <div><label style={lbl}>Agama</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.religion || ''} onChange={e => setEditProfilForm(f => ({ ...f, religion: e.target.value }))} /></div>
                  <div><label style={lbl}>Gol. Darah</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.blood_type || ''} onChange={e => setEditProfilForm(f => ({ ...f, blood_type: e.target.value }))} /></div>
                  <div><label style={lbl}>Status Nikah</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.marital_status || ''} onChange={e => setEditProfilForm(f => ({ ...f, marital_status: e.target.value }))} /></div>
                  <div><label style={lbl}>Alamat KTP</label><textarea style={{...ist, width:'100%', padding:'10px'}} value={editForm.address_ktp || ''} onChange={e => setEditProfilForm(f => ({ ...f, address_ktp: e.target.value }))} /></div>
                </div>

                {/* Column 3: Work & Financial */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-section-title" style={{ fontSize: '11px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1.5px solid #F0EEEC', paddingBottom: '8px' }}>Pekerjaan & Finansial</div>
                  <div><label style={lbl}>Posisi</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.position || ''} onChange={e => setEditProfilForm(f => ({ ...f, position: e.target.value }))} /></div>
                  <div><label style={lbl}>Departemen</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.department || ''} onChange={e => setEditProfilForm(f => ({ ...f, department: e.target.value }))} /></div>
                  <div><label style={lbl}>Gaji Pokok</label><input type="number" style={{...ist, width:'100%', padding:'10px'}} value={editForm.base_salary || ''} onChange={e => setEditProfilForm(f => ({ ...f, base_salary: Number(e.target.value) }))} /></div>
                  <div><label style={lbl}>NPWP</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.npwp_number || ''} onChange={e => setEditProfilForm(f => ({ ...f, npwp_number: e.target.value }))} /></div>
                  <div><label style={lbl}>BPJS Kes</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.bpjs_kesehatan_number || ''} onChange={e => setEditProfilForm(f => ({ ...f, bpjs_kesehatan_number: e.target.value }))} /></div>
                  <div><label style={lbl}>No. Rekening</label><input style={{...ist, width:'100%', padding:'10px'}} value={editForm.bank_account_number || ''} onChange={e => setEditProfilForm(f => ({ ...f, bank_account_number: e.target.value }))} /></div>
                </div>
              </div>

              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={() => setShowEditProfil(false)} style={{ padding: '12px 24px', borderRadius: '12px', border: '1.5px solid #E8E4E0', backgroundColor: '#fff', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                <button onClick={handleUpdateProfil} disabled={editing} style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', backgroundColor: '#037894', color: '#fff', fontWeight: 700, cursor: editing ? 'not-allowed' : 'pointer' }}>
                  {editing ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #E8E4E0', padding: '0' }}>
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }} className="emp-header">
            <button onClick={() => router.push('/dashboard/hrd/karyawan')}
              className="brew-back-btn"
              style={{ color: '#8A8A8D', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: 0, flexShrink: 0, transition: 'color 0.15s', fontWeight: 600 }}>
              <ArrowLeft size={15} /> Karyawan
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#F0F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #E8E4E0' }}>
                  <span style={{ color: '#037894', fontWeight: 900, fontSize: '20px' }}>{employee.full_name[0]}</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ color: '#020000', fontWeight: 900, fontSize: '22px', margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{employee.full_name}</p>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', backgroundColor: s.bg, color: s.color, textTransform: 'uppercase' }}>
                      {employee.status}
                    </span>
                  </div>
                  <p style={{ color: '#8A8A8D', fontSize: '13px', margin: '4px 0 0', fontWeight: 600 }}>{employee.position} · {employee.department} · {employee.entity}</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setShowEditProfil(true)}
                style={{ padding: '10px 20px', borderRadius: '12px', border: '1.5px solid #E8E4E0', backgroundColor: '#fff', color: '#020000', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
                <Edit size={16} /> Edit Profil
              </button>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '11px', color: '#8A8A8D', fontWeight: 800, margin: 0, letterSpacing: '1px' }}>ID KARYAWAN</p>
                <p style={{ fontSize: '14px', color: '#037894', fontWeight: 900, margin: 0 }}>{employee.employee_id}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', paddingLeft: '24px', overflowX: 'auto', borderTop: '1px solid #F0EEEC' }} className="emp-tabs">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className="tab-btn"
                style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
                  backgroundColor: 'transparent', color: tab === t.key ? '#037894' : '#8A8A8D',
                  borderBottom: tab === t.key ? '3px solid #037894' : '3px solid transparent' }}>
                {t.icon} {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '8px',
                    backgroundColor: tab === t.key ? '#037894' : '#F0F4F5', color: tab === t.key ? '#fff' : '#8A8A8D' }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>

          {/* ── KELUARGA TAB ── */}
          {tab === 'keluarga' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 16px', textTransform: 'uppercase' }}>Daftar Anggota Keluarga</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F7F5F2', borderBottom: '1.5px solid #E8E4E0' }}>
                          {['Hubungan', 'Nama', 'L/P', 'Tgl Lahir', 'Pendidikan', 'Pekerjaan'].map(h => <th key={h} style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#8A8A8D' }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {(employee.family_data || []).map((f: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F0EEEC' }}>
                            <td style={{ padding: '12px', fontWeight: 600, color: '#037894' }}>{f.relation}</td>
                            <td style={{ padding: '12px', color: '#020000' }}>{f.name}</td>
                            <td style={{ padding: '12px', color: '#4C4845' }}>{f.gender}</td>
                            <td style={{ padding: '12px', color: '#4C4845' }}>{f.birth_date}</td>
                            <td style={{ padding: '12px', color: '#4C4845' }}>{f.education}</td>
                            <td style={{ padding: '12px', color: '#4C4845' }}>{f.occupation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>

               {employee.internal_relations && employee.internal_relations.length > 0 && (
                  <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 16px', textTransform: 'uppercase' }}>Saudara / Kenalan di Strada</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                      {employee.internal_relations.map((r: any, i: number) => (
                        <div key={i} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#F7F5F2', border: '1px solid #E8E4E0' }}>
                           <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 2px' }}>{r.name}</p>
                           <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>{r.position} · {r.relationship}</p>
                        </div>
                      ))}
                    </div>
                  </div>
               )}
            </div>
          )}

          {/* ── RIWAYAT TAB ── */}
          {tab === 'riwayat' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 16px', textTransform: 'uppercase' }}>Riwayat Pekerjaan</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(employee.work_history || []).map((w: any, i: number) => (
                      <div key={i} style={{ padding: '16px', borderRadius: '14px', border: '1.5px solid #F0EEEC', backgroundColor: '#F9FBFB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                           <span style={{ fontSize: '14px', fontWeight: 800, color: '#037894' }}>{w.company_name}</span>
                           <span style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', padding: '4px 10px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E8E4E0' }}>{w.duration}</span>
                        </div>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#020000', margin: '0 0 4px' }}>{w.position}</p>
                        <p style={{ fontSize: '12px', color: '#4C4845', margin: '0 0 8px' }}>Gaji: {w.salary}</p>
                        <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0, fontStyle: 'italic' }}>Alasan pindah: {w.reason_for_leaving}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '20px', padding: '12px', borderRadius: '12px', backgroundColor: '#E6F4F1' }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, color: '#037894', textTransform: 'uppercase', marginBottom: '4px' }}>Paling Senang Bekerja Di</p>
                     <p style={{ fontSize: '13px', color: '#005353', margin: 0 }}><strong>{employee.happiest_workplace || '-'}</strong>: {employee.happiest_workplace_reason || '-'}</p>
                  </div>
               </div>

               <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 16px', textTransform: 'uppercase' }}>Pendidikan & Bahasa</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                       <p style={{ fontSize: '11px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', marginBottom: '10px' }}>Sekolah Resmi</p>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                         {(employee.education_history || []).map((ed: any, i: number) => ed.school_name && (
                           <div key={i} style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#F7F5F2' }}>
                              <p style={{ fontSize: '12px', fontWeight: 800, margin: 0 }}>{ed.level}: {ed.school_name}</p>
                              <p style={{ fontSize: '11px', color: '#4C4845', margin: 0 }}>{ed.major} · {ed.city} · {ed.graduation_year}</p>
                           </div>
                         ))}
                       </div>
                    </div>
                    <div>
                       <p style={{ fontSize: '11px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', marginBottom: '10px' }}>Keahlian Bahasa</p>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                         {(employee.language_skills || []).map((l: any, i: number) => (
                           <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#F9FBFB', borderRadius: '8px', border: '1px solid #F0EEEC' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700 }}>{l.language}</span>
                              <span style={{ fontSize: '11px', color: '#037894', fontWeight: 700 }}>Lisan: {l.spoken} · Tulis: {l.written}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
               </div>

               {employee.training_history && employee.training_history.length > 0 && (
                  <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 16px', textTransform: 'uppercase' }}>Kursus & Training</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {employee.training_history.map((t: any, i: number) => t.name && (
                        <div key={i} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#F9FBFB', border: '1px solid #F0EEEC' }}>
                           <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 2px' }}>{t.name}</p>
                           <p style={{ fontSize: '11px', color: '#4C4845', margin: 0 }}>{t.location} · {t.duration} · {t.year}</p>
                           {t.description && <p style={{ fontSize: '11px', color: '#8A8A8D', marginTop: '4px', fontStyle: 'italic' }}>{t.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
               )}

               <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 16px', textTransform: 'uppercase' }}>Minat & Lainnya</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                       <p style={{ fontSize: '11px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', marginBottom: '10px' }}>Minat Pekerjaan</p>
                       {(employee.job_interests || []).map((j: any, i: number) => j.type && (
                         <div key={i} style={{ marginBottom: '4px', fontSize: '12px', display: 'flex', gap: '8px' }}>
                            <span style={{ fontWeight: 800, color: '#037894' }}>#{j.rank}</span>
                            <span>{j.type}</span>
                         </div>
                       ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                       <div>
                          <p style={{ fontSize: '11px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', marginBottom: '2px' }}>Penempatan Luar Kota</p>
                          <p style={{ fontSize: '13px', margin: 0 }}>{employee.willing_to_be_relocated ? '✓ Bersedia' : `✗ Tidak (${employee.relocation_refusal_reason || 'Tanpa alasan'})`}</p>
                       </div>
                       <div>
                          <p style={{ fontSize: '11px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', marginBottom: '2px' }}>Aktivitas Sosial</p>
                          <p style={{ fontSize: '12px', color: '#4C4845', margin: 0 }}><strong>Olahraga:</strong> {employee.social_sports || '-'}</p>
                          <p style={{ fontSize: '12px', color: '#4C4845', margin: 0 }}><strong>Hobby:</strong> {employee.social_hobbies || '-'}</p>
                          <p style={{ fontSize: '12px', color: '#4C4845', margin: 0 }}><strong>Organisasi:</strong> {employee.social_organizations || '-'}</p>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {/* ── PROFIL DATA VIEW ── */}
          {tab === 'profil' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Identitas & Kontak */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1.5px solid #F0EEEC' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>Identitas & Kontak</p>
                  <button onClick={() => setShowEditProfil(true)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid #037894', backgroundColor: 'transparent', color: '#037894', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    Edit Profil
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="emp-grid">
                  {[
                    { label: 'Nama Lengkap', value: employee.full_name },
                    { label: 'Nama Panggilan', value: employee.nickname || employee.nick_name },
                    { label: 'NIK / No. KTP', value: employee.identity_number || employee.id_number },
                    { label: 'Email', value: employee.email },
                    { label: 'No. HP', value: employee.phone },
                    { label: 'Telp Rumah', value: employee.home_phone },
                    { label: 'Tempat Lahir', value: employee.birth_place || employee.place_of_birth },
                    { label: 'Tanggal Lahir', value: employee.birth_date ? new Date(employee.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null },
                    { label: 'Agama', value: employee.religion },
                    { label: 'Gol. Darah', value: employee.blood_type },
                    { label: 'Jenis Kelamin', value: employee.gender },
                    { label: 'Status Pernikahan', value: employee.marital_status },
                  ].filter(f => f.value).map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>{label}</p>
                      <p style={{ fontSize: '13px', color: '#020000', fontWeight: 600, margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alamat — fall back to legacy 'address' column */}
              {(employee.address_ktp || employee.address || employee.address_domicile) && (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 16px', paddingBottom: '10px', borderBottom: '1.5px solid #F0EEEC' }}>Alamat</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {(employee.address_ktp || employee.address) && <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Alamat KTP</p>
                      <p style={{ fontSize: '13px', color: '#020000', margin: 0, lineHeight: 1.6 }}>{employee.address_ktp || employee.address}</p>
                    </div>}
                    {employee.address_domicile && <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Alamat Domisili</p>
                      <p style={{ fontSize: '13px', color: '#020000', margin: 0, lineHeight: 1.6 }}>{employee.address_domicile}</p>
                    </div>}
                    {employee.postal_code && <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Kode Pos</p>
                      <p style={{ fontSize: '13px', color: '#020000', fontWeight: 600, margin: 0 }}>{employee.postal_code}</p>
                    </div>}
                  </div>
                </div>
              )}

              {/* Informasi Pekerjaan */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 16px', paddingBottom: '10px', borderBottom: '1.5px solid #F0EEEC' }}>Informasi Pekerjaan</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="emp-grid">
                  {[
                    { label: 'Posisi', value: employee.position },
                    { label: 'Departemen', value: employee.department },
                    { label: 'Entitas', value: employee.entity },
                    { label: 'Outlet', value: employee.outlet },
                    { label: 'Tipe Kontrak', value: employee.employment_type },
                    { label: 'Tanggal Masuk', value: employee.join_date ? new Date(employee.join_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null },
                    { label: 'Mulai Kontrak', value: employee.contract_start ? new Date(employee.contract_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null },
                    { label: 'Akhir Kontrak', value: employee.contract_end ? new Date(employee.contract_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null },
                    { label: 'Gaji Pokok', value: employee.base_salary ? `Rp ${Number(employee.base_salary).toLocaleString('id-ID')}` : null },
                    { label: 'Grade', value: employee.grade },
                    { label: 'PKWT Ke-', value: employee.pkwt_ke ? String(employee.pkwt_ke) : null },
                  ].filter(f => f.value).map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>{label}</p>
                      <p style={{ fontSize: '13px', color: '#020000', fontWeight: 600, margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Keuangan — fall back to legacy columns */}
              {(employee.bpjs_kesehatan_number || employee.bpjs_kesehatan || employee.npwp_number || employee.npwp || employee.bank_account_number) && (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 16px', paddingBottom: '10px', borderBottom: '1.5px solid #F0EEEC' }}>Data Keuangan & Jaminan</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="emp-grid">
                    {[
                      { label: 'BPJS Kesehatan', value: employee.bpjs_kesehatan_number || employee.bpjs_kesehatan },
                      { label: 'BPJS Ketenagakerjaan', value: employee.bpjs_ketenagakerjaan_number || employee.bpjs_tk },
                      { label: 'NPWP', value: employee.npwp_number || employee.npwp },
                      { label: 'Nama Bank', value: employee.bank_name },
                      { label: 'No. Rekening', value: employee.bank_account_number },
                      { label: 'Nama Rekening', value: employee.bank_account_name },
                    ].filter(f => f.value).map(({ label, value }) => (
                      <div key={label}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>{label}</p>
                        <p style={{ fontSize: '13px', color: '#020000', fontWeight: 600, margin: 0 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes / Case Notes */}
              {(employee.notes || employee.case_notes) && (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#037894', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 12px', paddingBottom: '10px', borderBottom: '1.5px solid #F0EEEC' }}>Catatan Khusus</p>
                  <p style={{ fontSize: '13px', color: '#4C4845', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{employee.notes || employee.case_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── QUEST AI SCORING (profil tab) ── */}
          {tab === 'profil' && (
            <div style={{ marginTop: '20px', backgroundColor: '#fff', borderRadius: '24px', padding: '24px', border: '1.5px solid rgba(3,120,148,0.2)', boxShadow: '0 8px 30px rgba(3,120,148,0.04)' }}>
              <style>{`@keyframes kary-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={16} color="#037894" fill="#037894" />
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#037894', letterSpacing: '2px', textTransform: 'uppercase' }}>Quest AI Profile Score</span>
                </div>
                <button onClick={handleEmpRunScore} disabled={isEmpProcessing}
                  style={{ padding: '6px 16px', borderRadius: '12px', border: 'none', cursor: isEmpProcessing ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: isEmpProcessing ? '#F7F5F2' : '#037894', color: isEmpProcessing ? '#037894' : '#fff', transition: 'all 0.2s' }}>
                  {isEmpProcessing
                    ? <><span style={{ display: 'inline-block', animation: 'kary-spin 1s linear infinite' }}>⚙</span> Scoring...</>
                    : empScores.length > 0 ? '↻ Re-run Score' : '✦ Run Score'}
                </button>
              </div>

              {!latestEmpScore && <p style={{ color: '#8A8A8D', fontSize: '13px', margin: 0, fontWeight: 500 }}>Belum ada scoring untuk karyawan ini.</p>}
              {latestEmpScore?.status === 'processing' && (
                <p style={{ color: '#037894', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                  <span style={{ display: 'inline-block', animation: 'kary-spin 1s linear infinite' }}>⚙</span> Sedang dianalisa...
                </p>
              )}
              {latestEmpScore?.status === 'failed' && (
                <p style={{ color: '#FF4F31', fontSize: '13px', margin: 0, fontWeight: 500 }}>⚠ Scoring gagal. Klik Re-run Score untuk mencoba lagi.</p>
              )}
              {latestEmpScore?.status === 'completed' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '32px', alignItems: 'start' }}>
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: '64px', fontWeight: 900, color: '#037894', lineHeight: 1 }}>{latestEmpScore.overall_score}</div>
                    <div style={{ fontSize: '11px', color: '#8FC6C5', fontWeight: 800, marginTop: '2px', letterSpacing: '1px' }}>DARI 100</div>
                    {latestEmpScore.recommendation && (
                      <div style={{ marginTop: '12px', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, display: 'inline-block',
                        backgroundColor: latestEmpScore.recommendation === 'Highly Recommended' ? '#005353' : latestEmpScore.recommendation === 'Recommended' ? '#037894' : latestEmpScore.recommendation === 'Consider' ? '#DE9733' : '#FF4F31',
                        color: '#fff', textTransform: 'uppercase', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                        {latestEmpScore.recommendation}
                      </div>
                    )}
                    {latestEmpScore.processed_at && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '12px' }}>
                        <Clock size={10} color="#8FC6C5" />
                        <span style={{ fontSize: '10px', color: '#8FC6C5', fontWeight: 600 }}>{formatTs(latestEmpScore.processed_at)}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { label: 'Pengalaman', value: Math.min(latestEmpScore.experience_score || 0, 25), max: 25 },
                      { label: 'Sertifikasi', value: Math.min(latestEmpScore.certification_score || 0, 20), max: 20 },
                      { label: 'Motivasi', value: Math.min(latestEmpScore.motivation_score || 0, 20), max: 20 },
                      { label: 'Profil', value: Math.min(latestEmpScore.profile_score || 0, 20), max: 20 },
                      { label: 'Kelengkapan', value: Math.min(latestEmpScore.completeness_score || 0, 15), max: 15 },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#4C4845', fontWeight: 700 }}>{item.label}</span>
                          <span style={{ fontSize: '11px', color: '#037894', fontWeight: 800 }}>{item.value}/{item.max}</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#F0F4F5' }}>
                          <div style={{ height: '100%', borderRadius: '3px', backgroundColor: '#037894', width: `${(item.value / item.max) * 100}%`, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                        </div>
                      </div>
                    ))}
                    {latestEmpScore.summary && (
                      <p style={{ fontSize: '13px', color: '#4C4845', lineHeight: 1.6, margin: '12px 0 0', fontStyle: 'italic', fontWeight: 500 }}>"{latestEmpScore.summary}"</p>
                    )}
                  </div>
                </div>
              )}

              {/* History */}
              {empScores.length > 1 && (
                <div style={{ marginTop: '16px', borderTop: '1px solid #F0EEEC', paddingTop: '14px' }}>
                  <button onClick={() => setExpandedEmpHistory(p => !p)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#037894', fontWeight: 700, padding: 0 }}>
                    {expandedEmpHistory ? '▲ Tutup riwayat' : `▼ Lihat ${empScores.length} riwayat scoring`}
                  </button>
                  {expandedEmpHistory && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                      {empScores.map((s: any, i: number) => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderRadius: '12px', backgroundColor: '#F9FBFB', border: '1px solid #F0F4F5' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 900, color: (s.overall_score || 0) >= 75 ? '#005353' : (s.overall_score || 0) >= 50 ? '#037894' : '#FF4F31' }}>{s.overall_score || '—'}</span>
                            {i === 0 && <span style={{ fontSize: '10px', color: '#037894', fontWeight: 800, padding: '2px 8px', backgroundColor: '#E6F4F8', borderRadius: '6px' }}>TERBARU</span>}
                            {s.recommendation && <span style={{ fontSize: '11px', color: '#8A8A8D', fontWeight: 600 }}>{s.recommendation}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={10} color="#8FC6C5" />
                            <span style={{ fontSize: '10px', color: '#8FC6C5', fontWeight: 500 }}>{formatTs(s.processed_at || s.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {/* ── TIMELINE TAB ── */}
          {tab === 'timeline' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: 0 }}>Timeline Karyawan</h2>
                <button onClick={() => setShowAddTimeline(true)} className="brew-btn-teal"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background-color 0.15s' }}>
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
                <button onClick={() => setShowAddKPI(true)} className="brew-btn-teal"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background-color 0.15s' }}>
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
                <button onClick={() => setShowAddLeave(true)} className="brew-btn-teal"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background-color 0.15s' }}>
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
                      style={{ padding: '7px 16px', borderRadius: '8px', backgroundColor: '#037894', color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                      Ajukan Cuti
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
                            style={{ padding: '7px 16px', borderRadius: '8px', backgroundColor: '#037894', color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                            Lihat
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
                          style={{ padding: '7px 16px', borderRadius: '8px', backgroundColor: '#037894', color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                          Print
                          </button>
                        <button onClick={() => setViewingDoc(null)}
                          style={{ padding: '7px 16px', borderRadius: '8px', backgroundColor: '#037894', color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                          Tutup
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

          {/* ── CATATAN TAB ── */}
          {tab === 'catatan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* New Note Input */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MessageSquare size={14} color="#037894" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#020000' }}>Catatan Internal HR</span>
                </div>
                <p style={{ fontSize: '12px', color: '#8A8A8D', margin: '0 0 14px', lineHeight: 1.5 }}>
                  Catatan ini hanya visible untuk tim HRD dan akan digabungkan dengan catatan fase rekrutmen.
                </p>
                <textarea
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder="Tulis catatan internal di sini..."
                  style={{ width: '100%', minHeight: '90px', padding: '12px', borderRadius: '10px', border: '1.5px solid #E8E4E0', fontSize: '13px', color: '#037894', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button onClick={handleSaveNotes} disabled={savingNotes || !noteInput.trim()}
                    style={{ padding: '9px 24px', borderRadius: '10px', border: 'none', cursor: (savingNotes || !noteInput.trim()) ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, backgroundColor: notesSaved ? '#005353' : '#037894', color: '#fff', opacity: !noteInput.trim() ? 0.5 : 1, transition: 'all 0.2s' }}>
                    {notesSaved ? '✓ Tersimpan' : savingNotes ? 'Menyimpan...' : 'Simpan Catatan'}
                  </button>
                </div>
              </div>

              {/* Combined Notes Timeline */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                {(internalNotesList.length + applicantScreeningNotes.length) > 0 ? (
                  <>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#8A8A8D', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 16px' }}>
                      Semua Catatan — {internalNotesList.length + applicantScreeningNotes.length} entri
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {([
                        ...internalNotesList.map(n => ({ ...(n as Record<string, any>), _type: 'internal' })),
                        ...applicantScreeningNotes.map(n => ({ ...(n as Record<string, any>), _type: 'screening' })),
                      ] as Record<string, any>[])
                        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                        .map((note, idx) => (
                          <div key={note.id || idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: note._type === 'screening' ? '#FEF8E6' : '#E6F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px' }}>
                              {note._type === 'screening' ? '🔍' : '📝'}
                            </div>
                            <div style={{ flex: 1, backgroundColor: '#F9FBFB', borderRadius: '12px', padding: '12px 16px', border: '1px solid #F0EEEC' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: note._type === 'screening' ? '#FEF8E6' : '#E6F4F8', color: note._type === 'screening' ? '#DE9733' : '#037894' }}>
                                  {note._type === 'screening' ? 'Fase Rekrutmen' : 'Internal HR'}
                                </span>
                                {note.actor_name && <span style={{ fontSize: '11px', color: '#8A8A8D', fontWeight: 600 }}>{note.actor_name}</span>}
                              </div>
                              <p style={{ fontSize: '13px', color: '#020000', margin: '0 0 6px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                {note._type === 'screening' ? note.note : note.title}
                              </p>
                              <span style={{ fontSize: '10px', color: '#8A8A8D', fontWeight: 600 }}>
                                {note.created_at ? new Date(note.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#8A8A8D' }}>
                    <p style={{ fontSize: '14px', margin: '0 0 6px', fontWeight: 600 }}>Belum ada catatan</p>
                    <p style={{ fontSize: '12px', margin: 0 }}>Catatan yang disimpan akan muncul di sini.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CV TAB ── */}
          {tab === 'cv' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} color="#037894" />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#020000' }}>CV / Resume Karyawan</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {empCvUrl && (
                      <a href={empCvUrl} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '8px 18px', borderRadius: '10px', backgroundColor: '#E6F4F1', color: '#005353', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                        ↓ Unduh CV
                      </a>
                    )}
                    {employee.applicant_id && (
                      <label style={{ padding: '8px 18px', borderRadius: '10px', border: '1.5px solid #E8E4E0', backgroundColor: '#fff', color: '#4C4845', fontSize: '12px', fontWeight: 700, cursor: uploadingEmpCv ? 'wait' : 'pointer', opacity: uploadingEmpCv ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input type="file" accept=".pdf,.doc,.docx,image/*" style={{ display: 'none' }} disabled={uploadingEmpCv}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleEmpCvUpload(f) }} />
                        {uploadingEmpCv ? '⏳ Uploading...' : empCvUrl ? '↑ Ganti CV' : '↑ Upload CV'}
                      </label>
                    )}
                  </div>
                </div>

                {empCvUrl ? (
                  empCvUrl.toLowerCase().endsWith('.pdf') ? (
                    <iframe src={empCvUrl} style={{ width: '100%', height: '700px', borderRadius: '12px', border: '1.5px solid #E8E4E0' }} title="CV Karyawan" />
                  ) : (
                    <div style={{ padding: '40px', borderRadius: '12px', backgroundColor: '#F7F5F2', textAlign: 'center' }}>
                      <FileText size={40} color="#8A8A8D" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                      <p style={{ fontSize: '13px', color: '#4C4845', margin: '0 0 16px' }}>File CV tersedia. Klik tombol Unduh untuk membuka.</p>
                      <a href={empCvUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '10px', backgroundColor: '#037894', color: '#fff', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                        Buka File CV
                      </a>
                    </div>
                  )
                ) : (
                  <div style={{ padding: '60px', borderRadius: '12px', border: '2px dashed #E8E4E0', textAlign: 'center', backgroundColor: '#F9FBFB' }}>
                    <FileText size={40} color="#D4CFC9" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ fontSize: '14px', color: '#8A8A8D', margin: '0 0 6px', fontWeight: 600 }}>Belum ada CV</p>
                    <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>
                      {employee.applicant_id
                        ? 'Pelamar tidak mengupload CV saat mendaftar. Gunakan tombol Upload CV di atas.'
                        : 'Karyawan ini tidak memiliki data lamaran yang terhubung.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}