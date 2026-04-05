import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function KaryawanPage() {
  const supabase = await createClient()

  // Safe fetch — hanya kolom yang pasti ada
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, employee_id, full_name, position, department, entity, outlet, status, contract_end, base_salary, join_date')
    .order('join_date', { ascending: false })

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#FF4F31', fontSize: '14px' }}>Error: {error.message}</p>
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
    active: { bg: '#E6F4F1', color: '#005353' },
    inactive: { bg: '#F0EEEC', color: '#4C4845' },
    resigned: { bg: '#FEF8E6', color: '#DE9733' },
    terminated: { bg: '#FFF0EE', color: '#FF4F31' },
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .karyawan-hide { display: none !important; }
          .karyawan-header { flex-direction: column !important; align-items: flex-start !important; }
        }
      `}</style>
      <div style={{ padding: '24px', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }} className="karyawan-header">
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: '#037894', textTransform: 'uppercase', margin: '0 0 4px' }}>HRD</p>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#020000', margin: 0 }}>Data Karyawan</h1>
            <p style={{ fontSize: '13px', color: '#8A8A8D', margin: '4px 0 0' }}>{stats.total} karyawan terdaftar</p>
          </div>
          <Link href="/dashboard/hrd/karyawan/baru"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '12px', backgroundColor: '#037894', color: '#fff', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
            + Tambah Karyawan
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total Karyawan', value: stats.total, color: '#020000' },
            { label: 'Aktif', value: stats.active, color: '#005353' },
            { label: 'Kontrak ≤30 Hari', value: stats.expiring, color: '#FF4F31' },
          ].map(s => (
            <div key={s.label} style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', border: '1.5px solid #E8E4E0', textAlign: 'center' }}>
              <p style={{ fontSize: '26px', fontWeight: 800, color: s.color, margin: '0 0 4px' }}>{s.value}</p>
              <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAFAF9', borderBottom: '1px solid #F0EEEC' }}>
                  {['ID', 'Nama', 'Posisi', 'Outlet', 'Gaji', 'Kontrak Berakhir', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: '#8A8A8D', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(employees || []).map(emp => {
                  const contractEnd = emp.contract_end ? new Date(emp.contract_end) : null
                  const daysLeft = contractEnd ? Math.ceil((contractEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
                  const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0
                  const s = statusStyle[emp.status] ?? statusStyle.inactive

                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid rgba(76,72,69,0.05)' }}>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#037894', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <Link href={`/dashboard/hrd/karyawan/${emp.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{emp.employee_id}</Link>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link href={`/dashboard/hrd/karyawan/${emp.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#020000', margin: 0, whiteSpace: 'nowrap' }}>{emp.full_name}</p>
                        </Link>
                        <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>{emp.department} · {emp.entity}</p>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#4C4845', whiteSpace: 'nowrap' }}>{emp.position}</td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#4C4845' }} className="karyawan-hide">{emp.outlet || '-'}</td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#020000', whiteSpace: 'nowrap' }} className="karyawan-hide">
                        {emp.base_salary ? `Rp ${(emp.base_salary / 1000000).toFixed(1)}jt` : '-'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', whiteSpace: 'nowrap', color: isExpiring ? '#FF4F31' : '#4C4845', fontWeight: isExpiring ? 700 : 400 }} className="karyawan-hide">
                        {contractEnd ? contractEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                        {isExpiring && <span style={{ marginLeft: '4px', fontSize: '10px' }}>({daysLeft}hr)</span>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', backgroundColor: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
                          {emp.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {(!employees || employees.length === 0) && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#8A8A8D', fontSize: '14px' }}>
              Belum ada data karyawan. <Link href="/dashboard/hrd/karyawan/baru" style={{ color: '#037894' }}>Tambah sekarang</Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}