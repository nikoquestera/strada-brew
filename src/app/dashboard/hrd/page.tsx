import { createClient } from '@/lib/supabase/server'

export default async function HRDOverview() {
  const supabase = await createClient()

  const [
    { count: totalKaryawan },
    { count: totalApplicants },
    { count: kontrakAkanHabis },
  ] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('applicants').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('employees').select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('contract_end', 'is', null)
      .lte('contract_end', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
  ])

  const stats = [
    { label: 'Karyawan Aktif', value: totalKaryawan ?? 0, color: 'bg-blue-50 text-blue-700' },
    { label: 'Pelamar Baru', value: totalApplicants ?? 0, color: 'bg-amber-50 text-amber-700' },
    { label: 'Kontrak Berakhir (30 hari)', value: kontrakAkanHabis ?? 0, color: 'bg-red-50 text-red-700' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">HRD Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview data HR Strada Coffee</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-6 border border-gray-100">
            <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '+ Tambah Karyawan', href: '/dashboard/hrd/karyawan/baru' },
            { label: '+ Lihat Pelamar Baru', href: '/dashboard/hrd/rekrutmen' },
            { label: '+ Proses Payroll', href: '/dashboard/hrd/payroll' },
            { label: '+ Cek Kontrak Habis', href: '/dashboard/hrd/karyawan?filter=contract' },
          ].map(item => (
            
              key={item.label}
              href={item.href}
              className="flex items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm text-gray-700 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}