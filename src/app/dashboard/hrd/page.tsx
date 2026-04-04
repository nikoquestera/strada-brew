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
    { label: 'Karyawan Aktif', value: totalKaryawan ?? 0, accent: '#037894' },
    { label: 'Pelamar Baru', value: totalApplicants ?? 0, accent: '#DE9733' },
    { label: 'Kontrak Berakhir (30 hari)', value: kontrakAkanHabis ?? 0, accent: '#FF4F31' },
  ]

  const quickActions = [
    { label: '+ Tambah Karyawan', href: '/dashboard/hrd/karyawan/baru' },
    { label: '+ Lihat Pelamar Baru', href: '/dashboard/hrd/rekrutmen' },
    { label: '+ Proses Payroll', href: '/dashboard/hrd/payroll' },
    { label: '+ Cek Kontrak Habis', href: '/dashboard/hrd/karyawan' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#037894' }}>HRD Module</p>
        <h1 className="text-2xl font-bold" style={{ color: '#020000' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#8A8A8D' }}>Overview data HR Strada Coffee</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-2xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(76,72,69,0.1)' }}>
            <div className="w-2 h-2 rounded-full mb-4" style={{ backgroundColor: stat.accent }} />
            <p className="text-3xl font-bold mb-1" style={{ color: '#020000' }}>{stat.value}</p>
            <p className="text-sm" style={{ color: '#8A8A8D' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(76,72,69,0.1)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#020000' }}>Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(item => (
            <a key={item.label} href={item.href}
              className="flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all"
              style={{ backgroundColor: '#E4DED8', color: '#020000' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#d8d1c9'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#E4DED8'}>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}