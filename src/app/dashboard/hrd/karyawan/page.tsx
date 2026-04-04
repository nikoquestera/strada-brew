import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Employee } from '@/lib/types'

export default async function KaryawanPage() {
  const supabase = await createClient()
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .order('full_name')

  const statusStyle: Record<string, { bg: string; color: string }> = {
    active:     { bg: '#e6f4f1', color: '#005353' },
    inactive:   { bg: '#f0eeec', color: '#4C4845' },
    resigned:   { bg: '#fef3e6', color: '#DE9733' },
    terminated: { bg: '#fff0ee', color: '#FF4F31' },
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#037894' }}>HRD</p>
          <h1 className="text-2xl font-bold" style={{ color: '#020000' }}>Database Karyawan</h1>
          <p className="text-sm mt-1" style={{ color: '#8A8A8D' }}>{employees?.length ?? 0} karyawan terdaftar</p>
        </div>
        <Link href="/dashboard/hrd/karyawan/baru"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ backgroundColor: '#037894', color: '#ffffff' }}>
          + Tambah Karyawan
        </Link>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(76,72,69,0.1)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(76,72,69,0.08)' }}>
              {['Karyawan', 'Posisi', 'Entity', 'Kontrak', 'Status'].map(h => (
                <th key={h} className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: '#8A8A8D' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-sm" style={{ color: '#8A8A8D' }}>
                  Belum ada karyawan. Tambah karyawan pertama.
                </td>
              </tr>
            )}
            {employees?.map((emp: Employee) => {
              const contractEnd = emp.contract_end ? new Date(emp.contract_end) : null
              const daysLeft = contractEnd ? Math.ceil((contractEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
              const isUrgent = daysLeft !== null && daysLeft <= 14 && daysLeft >= 0
              const s = statusStyle[emp.status] ?? statusStyle.inactive

              return (
                <tr key={emp.id}
                  onClick={() => window.location.href = `/dashboard/hrd/karyawan/${emp.id}`}
                  style={{ borderBottom: '1px solid rgba(76,72,69,0.05)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#faf9f7'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold" style={{ color: '#020000' }}>{emp.full_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#8A8A8D' }}>{emp.employee_id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm" style={{ color: '#020000' }}>{emp.position}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#8A8A8D' }}>{emp.department}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium" style={{ color: '#4C4845' }}>{emp.entity}</span>
                  </td>
                  <td className="px-6 py-4">
                    {emp.contract_end ? (
                      <div>
                        <p className="text-xs" style={{ color: '#4C4845' }}>
                          {new Date(emp.contract_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {isUrgent && (
                          <p className="text-xs font-semibold mt-0.5" style={{ color: '#FF4F31' }}>⚠ {daysLeft} hari lagi</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: '#8A8A8D' }}>PKWTT</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: s.bg, color: s.color }}>
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