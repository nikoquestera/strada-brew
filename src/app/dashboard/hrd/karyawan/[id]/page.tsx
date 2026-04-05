import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import KaryawanDetailClient from './KaryawanDetailClient'

export default async function KaryawanDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Core employee — must exist
  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !employee) notFound()

  // Always-safe tables
  const [
    timelineResult,
    docTemplatesResult,
  ] = await Promise.all([
    supabase.from('employee_timeline').select('*').eq('employee_id', params.id).order('effective_date', { ascending: false }),
    supabase.from('document_templates').select('*').order('category'),
  ])

  // Tables that may not exist yet — will return empty instead of crashing
  const evaluationsResult = await supabase
    .from('employee_evaluations').select('*').eq('employee_id', params.id)
    .order('created_at', { ascending: false })
    .then(r => r).catch(() => ({ data: [] }))

  const kpisResult = await supabase
    .from('employee_kpis').select('*').eq('employee_id', params.id)
    .order('created_at', { ascending: false })
    .then(r => r).catch(() => ({ data: [] }))

  const leavesResult = await supabase
    .from('employee_leaves').select('*').eq('employee_id', params.id)
    .order('created_at', { ascending: false })
    .then(r => r).catch(() => ({ data: [] }))

  const leaveBalanceResult = await supabase
    .from('employee_leave_balance').select('*').eq('employee_id', params.id)
    .single()
    .then(r => r).catch(() => ({ data: null }))

  const docStatusResult = await supabase
    .from('employee_document_status').select('*').eq('employee_id', params.id)
    .then(r => r).catch(() => ({ data: [] }))

  return (
    <KaryawanDetailClient
      employee={employee}
      timeline={timelineResult.data || []}
      evaluations={evaluationsResult.data || []}
      kpis={kpisResult.data || []}
      leaves={leavesResult.data || []}
      leaveBalance={leaveBalanceResult.data || null}
      docTemplates={docTemplatesResult.data || []}
      docStatus={docStatusResult.data || []}
    />
  )
}