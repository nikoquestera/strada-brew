import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import KaryawanClient from './KaryawanClient'

async function KaryawanData() {
  const supabase = await createClient()

  let employees: any[] = []

  const result1 = await supabase
    .from('employees')
    .select('id, employee_id, full_name, position, department, entity, outlet, status, contract_end, base_salary, join_date')
    .order('join_date', { ascending: false, nullsFirst: false })

  if (result1.error) {
    const result2 = await supabase
      .from('employees')
      .select('id, employee_id, full_name, position, department, entity, outlet, status, contract_end, base_salary, join_date')
      .order('full_name', { ascending: true })
    if (result2.error) {
      return (
        <div className="p-10 text-center">
          <p className="text-strada-coral text-sm font-medium">Error loading karyawan: {result2.error.message}</p>
        </div>
      )
    }
    employees = result2.data ?? []
  } else {
    employees = result1.data ?? []
  }

  return <KaryawanClient employees={employees} now={new Date().toISOString()} />
}

export default function KaryawanPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400 text-sm font-medium">Memuat data karyawan...</div>}>
      <KaryawanData />
    </Suspense>
  )
}
