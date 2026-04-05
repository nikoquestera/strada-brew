import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import KaryawanDetailClient from './KaryawanDetailClient'

export default async function KaryawanDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Fetch employee - only columns that definitely exist
  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !employee) {
    notFound()
  }

  // Fetch related data safely - each with its own try/catch
  let timeline: any[] = []
  let evaluations: any[] = []
  let kpis: any[] = []
  let leaves: any[] = []
  let leaveBalance = null
  let docTemplates: any[] = []
  let docStatus: any[] = []

  try {
    const { data } = await supabase
      .from('employee_timeline')
      .select('*')
      .eq('employee_id', employee.id)
      .order('effective_date', { ascending: false })
    timeline = data || []
  } catch { /* table may not exist yet */ }

  try {
    const { data } = await supabase
      .from('employee_evaluations')
      .select('*')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
    evaluations = data || []
  } catch { /* ignore */ }

  try {
    const { data } = await supabase
      .from('employee_kpis')
      .select('*')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
    kpis = data || []
  } catch { /* ignore */ }

  try {
    const { data } = await supabase
      .from('employee_leaves')
      .select('*')
      .eq('employee_id', employee.id)
      .order('start_date', { ascending: false })
    leaves = data || []
  } catch { /* ignore */ }

  try {
    const { data } = await supabase
      .from('employee_leave_balance')
      .select('*')
      .eq('employee_id', employee.id)
      .single()
    leaveBalance = data || null
  } catch { /* ignore */ }

  try {
    const { data } = await supabase
      .from('document_templates')
      .select('id, doc_id, name, category, type, storage_path')
      .order('category')
    docTemplates = data || []
  } catch { /* ignore */ }

  try {
    const { data } = await supabase
      .from('employee_document_status')
      .select('*')
      .eq('employee_id', employee.id)
    docStatus = data || []
  } catch { /* ignore */ }

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
