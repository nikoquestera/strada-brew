import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Employee } from '@/lib/types'

export default async function KaryawanPage() {
  const supabase = await createClient()
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .order('full_name')

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-600',
    resigned: 'bg-orange-100 text-orange-700',
    terminated: 'bg-red-100 text-red-700',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Database Karyawan</h1>
          <p className="text-gray-500 text-sm mt-1">{employees?.length ?? 0} karyawan terdaftar</p>
        </div>
        <Link
          href="/dashboard/hrd/karyawan/baru"
          className="bg-[#1a1a1a] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          + Tambah Karyawan
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Karyawan</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Posisi</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Kontrak</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {employees?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                  Belum ada karyawan. Tambah karyawan pertama.
                </td>
              </tr>
            )}
            {employees?.map((emp: Employee) => {
              const contractEnd = emp.contract_end ? new Date(emp.contract_end) : null
              const daysLeft = contractEnd
                ? Math.ceil((contractEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null
              const isUrgent = daysLeft !== null && daysLeft <= 14 && daysLeft >= 0

              return (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
                      <p className="text-xs text-gray-400">{emp.employee_id}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">{emp.position}</p>
                    <p className="text-xs text-gray-400">{emp.department}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-600">{emp.entity}</span>
                  </td>
                  <td className="px-6 py-4">
                    {emp.contract_end ? (
                      <div>
                        <p className="text-xs text-gray-600">
                          {new Date(emp.contract_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {isUrgent && (
                          <p className="text-xs text-red-600 font-medium">⚠ {daysLeft} hari lagi</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">PKWTT</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${statusColor[emp.status]}`}>
                      {emp.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}