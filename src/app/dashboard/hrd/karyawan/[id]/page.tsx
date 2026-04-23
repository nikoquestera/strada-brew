export const dynamic = "force-dynamic"
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import KaryawanDetailClient from './KaryawanDetailClient'

export default async function KaryawanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[karyawan/[id]] supabase error:', JSON.stringify(error), 'id:', id)
    notFound()
  }
  if (!employee) {
    console.error('[karyawan/[id]] no employee found for id:', id)
    notFound()
  }

  // Fetch semua relasi dengan try/catch agar tidak crash jika tabel belum ada
  const safe = async (fn: () => PromiseLike<any>) => {
    try { const r = await fn(); return r.data || [] } catch { return [] }
  }
  const safeOne = async (fn: () => PromiseLike<any>) => {
    try { const r = await fn(); return r.data || null } catch { return null }
  }

  const [timeline, evaluations, kpis, leaves, leaveBalance, docTemplates, docStatus] =
    await Promise.all([
      safe(() => supabase.from('employee_timeline').select('*').eq('employee_id', employee.id).order('effective_date', { ascending: false })),
      safe(() => supabase.from('employee_evaluations').select('*').eq('employee_id', employee.id).order('created_at', { ascending: false })),
      safe(() => supabase.from('employee_kpis').select('*').eq('employee_id', employee.id).order('created_at', { ascending: false })),
      safe(() => supabase.from('employee_leaves').select('*').eq('employee_id', employee.id).order('start_date', { ascending: false })),
      safeOne(() => supabase.from('employee_leave_balance').select('*').eq('employee_id', employee.id).single()),
      safe(() => supabase.from('document_templates').select('id, doc_id, name, category, type, storage_path').order('category')),
      safe(() => supabase.from('employee_document_status').select('*').eq('employee_id', employee.id)),
    ])

  // Fetch linked applicant data (screening notes + CV) if employee has applicant_id
  let applicantScreeningNotes: Record<string, any>[] = []
  let applicantCvUrl: string | null = null

  if (employee.applicant_id) {
    const [notesRes, applicantRes] = await Promise.all([
      safe(() => supabase.from('applicant_activities').select('*')
        .eq('applicant_id', employee.applicant_id)
        .eq('activity_type', 'screening_note')
        .order('created_at', { ascending: false })),
      safeOne(() => supabase.from('applicants').select('cv_url').eq('id', employee.applicant_id).single()),
    ])
    applicantScreeningNotes = notesRes
    applicantCvUrl = applicantRes?.cv_url || null
  }

  return (
    <KaryawanDetailClient
      employee={employee}
      timeline={timeline}
      evaluations={evaluations}
      kpis={kpis}
      leaves={leaves}
      leaveBalance={leaveBalance}
      docTemplates={docTemplates}
      docStatus={docStatus}
      applicantScreeningNotes={applicantScreeningNotes}
      applicantCvUrl={applicantCvUrl}
    />
  )
}
