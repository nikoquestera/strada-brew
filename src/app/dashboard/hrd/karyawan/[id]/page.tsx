export const dynamic = "force-dynamic"
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import KaryawanDetailClient from './KaryawanDetailClient'

export default async function KaryawanDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !employee) notFound()

  // Fetch semua relasi dengan try/catch agar tidak crash jika tabel belum ada
  const safe = async (fn: () => Promise<any>) => {
    try { const r = await fn(); return r.data || [] } catch { return [] }
  }
  const safeOne = async (fn: () => Promise<any>) => {
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
    />
  )
}
