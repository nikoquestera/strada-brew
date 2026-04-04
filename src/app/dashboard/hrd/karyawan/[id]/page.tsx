import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import KaryawanDetailClient from './KaryawanDetailClient'

export default async function KaryawanDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [
    { data: employee },
    { data: timeline },
    { data: evaluations },
    { data: kpis },
    { data: leaves },
    { data: leaveBalance },
    { data: docTemplates },
    { data: docStatus },
  ] = await Promise.all([
    supabase.from('employees').select('*').eq('id', params.id).single(),
    supabase.from('employee_timeline').select('*').eq('employee_id', params.id).order('effective_date', { ascending: false }),
    supabase.from('employee_evaluations').select('*').eq('employee_id', params.id).order('created_at', { ascending: false }),
    supabase.from('employee_kpis').select('*').eq('employee_id', params.id).order('created_at', { ascending: false }),
    supabase.from('employee_leaves').select('*').eq('employee_id', params.id).order('created_at', { ascending: false }),
    supabase.from('employee_leave_balance').select('*').eq('employee_id', params.id).single(),
    supabase.from('document_checklist_templates').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('employee_document_status').select('*').eq('employee_id', params.id),
  ])

  if (!employee) notFound()

  return (
    <KaryawanDetailClient
      employee={employee}
      timeline={timeline || []}
      evaluations={evaluations || []}
      kpis={kpis || []}
      leaves={leaves || []}
      leaveBalance={leaveBalance}
      docTemplates={docTemplates || []}
      docStatus={docStatus || []}
    />
  )
}