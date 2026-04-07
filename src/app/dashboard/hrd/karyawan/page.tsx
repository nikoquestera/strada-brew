import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Users, Clock, AlertTriangle } from 'lucide-react'

export default async function KaryawanPage() {
  const supabase = await createClient()

  // Safe fetch — hanya kolom yang pasti ada
  let employees: any[] | null = null
  let error: any = null

  const result1 = await supabase
    .from('employees')
    .select('id, employee_id, full_name, position, department, entity, outlet, status, contract_end, base_salary, join_date')
    .order('join_date', { ascending: false, nullsFirst: false })

  if (result1.error) {
    const result2 = await supabase
      .from('employees')
      .select('id, employee_id, full_name, position, department, entity, outlet, status, contract_end, base_salary, join_date')
      .order('full_name', { ascending: true })
    employees = result2.data
    error = result2.error
  } else {
    employees = result1.data
    error = result1.error
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <p className="text-strada-coral text-sm font-medium">Error loading karyawan: {error.message}</p>
        <p className="text-gray-500 text-xs mt-2">Cek Supabase connection dan nama kolom di tabel employees.</p>
      </div>
    )
  }

  const now = new Date()

  const stats = {
    total: employees?.length || 0,
    active: employees?.filter(e => e.status === 'active').length || 0,
    expiring: employees?.filter(e => {
      if (!e.contract_end) return false
      const days = Math.ceil((new Date(e.contract_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return days >= 0 && days <= 30
    }).length || 0,
  }

  const statusStyle: Record<string, { bg: string; color: string }> = {
    active: { bg: 'bg-teal-50', color: 'text-teal-700' },
    inactive: { bg: 'bg-gray-100', color: 'text-gray-600' },
    resigned: { bg: 'bg-amber-50', color: 'text-amber-700' },
    terminated: { bg: 'bg-red-50', color: 'text-red-600' },
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-strada-blue uppercase mb-1">HRD Module</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Data Karyawan</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">{stats.total} karyawan terdaftar di sistem</p>
        </div>
        <Link href="/dashboard/hrd/karyawan/baru" 
          className="apple-btn-primary flex items-center justify-center gap-2">
          <Plus size={18} /> Tambah Karyawan
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Karyawan', value: stats.total, color: 'text-gray-900', icon: Users },
          { label: 'Karyawan Aktif', value: stats.active, color: 'text-strada-blue', icon: Clock },
          { label: 'Kontrak ≤30 Hari', value: stats.expiring, color: 'text-strada-coral', icon: AlertTriangle },
        ].map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="apple-card p-6 flex flex-col items-center justify-center text-center">
              <Icon size={24} className={`${s.color} mb-3 opacity-80`} />
              <p className={`text-3xl font-extrabold ${s.color} mb-1 tracking-tight`}>{s.value}</p>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {['ID Karyawan', 'Nama Karyawan', 'Posisi', 'Outlet', 'Gaji Dasar', 'Kontrak Berakhir', 'Status'].map(h => (
                  <th key={h} className="px-5 py-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(employees || []).map(emp => {
                const contractEnd = emp.contract_end ? new Date(emp.contract_end) : null
                const daysLeft = contractEnd ? Math.ceil((contractEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
                const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0
                const s = statusStyle[emp.status] ?? statusStyle.inactive

                return (
                  <tr key={emp.id} className="hover:bg-gray-50/80 transition-colors duration-150 group cursor-pointer">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Link href={`/dashboard/hrd/karyawan/${emp.id}`} className="text-strada-blue font-bold text-[13px] group-hover:text-strada-dark-teal transition-colors">
                        {emp.employee_id}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/hrd/karyawan/${emp.id}`} className="block">
                        <p className="text-[14px] font-bold text-gray-900 group-hover:text-strada-blue transition-colors truncate max-w-[200px]">{emp.full_name}</p>
                        <p className="text-[11px] font-medium text-gray-500 mt-0.5 truncate max-w-[200px]">{emp.department} · {emp.entity}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-[13px] font-medium text-gray-700 whitespace-nowrap">{emp.position}</td>
                    <td className="px-5 py-4 text-[13px] font-medium text-gray-500 whitespace-nowrap">{emp.outlet || '-'}</td>
                    <td className="px-5 py-4 text-[13px] font-semibold text-gray-900 whitespace-nowrap">
                      {emp.base_salary ? `Rp ${(emp.base_salary / 1000000).toFixed(1)}jt` : '-'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className={`flex items-center gap-1.5 ${isExpiring ? 'text-strada-coral font-bold' : 'text-gray-600 font-medium'} text-[13px]`}>
                        {contractEnd ? contractEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                        {isExpiring && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">({daysLeft}hr)</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider uppercase ${s.bg} ${s.color}`}>
                        {emp.status || 'UNKNOWN'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {(!employees || employees.length === 0) && (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">Belum ada data karyawan.</p>
            <Link href="/dashboard/hrd/karyawan/baru" className="text-strada-blue text-sm font-bold mt-2 inline-block hover:underline">Tambah karyawan pertama</Link>
          </div>
        )}
      </div>
    </div>
  )
}