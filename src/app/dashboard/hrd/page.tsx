import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, FileText, Calculator, AlertTriangle, Plus, Search, CheckSquare } from 'lucide-react'

export default async function HRDOverview() {
  let totalKaryawan = 0
  let totalApplicants = 0
  let kontrakAkanHabis = 0

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // eslint-disable-next-line react-hooks/purity
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    const [r1, r2, r3] = await Promise.all([
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('applicants').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('employees').select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .not('contract_end', 'is', null)
        .lte('contract_end', thirtyDaysFromNow),
    ])

    totalKaryawan = r1.count ?? 0
    totalApplicants = r2.count ?? 0
    kontrakAkanHabis = r3.count ?? 0
  } catch {
    redirect('/login')
  }

  const stats = [
    { label: 'Karyawan Aktif', value: totalKaryawan, icon: Users, color: 'text-strada-blue', bg: 'bg-blue-50' },
    { label: 'Pelamar Baru', value: totalApplicants, icon: FileText, color: 'text-strada-amber', bg: 'bg-amber-50' },
    { label: 'Kontrak Berakhir (30 hr)', value: kontrakAkanHabis, icon: AlertTriangle, color: 'text-strada-coral', bg: 'bg-red-50' },
  ]

  const quickActions = [
    { label: 'Tambah Karyawan', icon: Plus, href: '/dashboard/hrd/karyawan/baru' },
    { label: 'Lihat Pelamar Baru', icon: Search, href: '/dashboard/hrd/rekrutmen' },
    { label: 'Proses Payroll', icon: Calculator, href: '/dashboard/hrd/payroll' },
    { label: 'Cek Kontrak Habis', icon: CheckSquare, href: '/dashboard/hrd/karyawan' },
  ]

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-strada-blue mb-2">HRD Module</p>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard Overview</h1>
        <p className="text-base text-gray-500 mt-1">Pantau data utama HR Strada Coffee</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="apple-card p-6 flex flex-col items-start apple-card-hover group cursor-default">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <p className="text-4xl font-extrabold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div className="apple-card p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Aksi Cepat</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(item => {
            const Icon = item.icon;
            return (
              <a key={item.label} href={item.href}
                className="flex items-center gap-3 px-5 py-4 bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 rounded-2xl text-sm font-semibold text-gray-700 transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow">
                <Icon size={18} className="text-gray-400" />
                {item.label}
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
