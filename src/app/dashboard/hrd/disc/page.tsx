export const dynamic = "force-dynamic"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DISC_DIMENSIONS, Dimension } from '@/lib/disc/data'
import { Brain, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default async function DiscSessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sessions, error } = await supabase
    .from('disc_sessions')
    .select(`
      id, access_code, status, completed_at, expires_at, created_by, results, created_at,
      applicants ( id, full_name, position_applied, outlet_preference )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[disc] supabase error:', error)
  }

  const statusLabel: Record<string, string> = {
    pending: 'Belum Dimulai',
    started: 'Sedang Dikerjakan',
    completed: 'Selesai',
    expired: 'Kadaluarsa',
  }
  const statusColor: Record<string, string> = {
    pending: 'text-amber-600',
    started: 'text-strada-blue',
    completed: 'text-teal-700',
    expired: 'text-gray-500',
  }
  const statusBg: Record<string, string> = {
    pending: 'bg-amber-50',
    started: 'bg-blue-50',
    completed: 'bg-teal-50',
    expired: 'bg-gray-100',
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 bg-[#F5F5F7] min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-strada-blue uppercase mb-2">Assessment Tool</p>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">DiSC Personality Test</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Pantau dan analisa profil kepribadian pelamar</p>
        </div>
        <div className="flex gap-2">
          {(['D','I','S','C'] as Dimension[]).map(d => (
            <div key={d} className="w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm transition-transform hover:scale-110"
              style={{ backgroundColor: DISC_DIMENSIONS[d].lightBg, borderColor: DISC_DIMENSIONS[d].color }}>
              <span className="text-xs font-black" style={{ color: DISC_DIMENSIONS[d].color }}>{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Dikirim', value: sessions?.length ?? 0, icon: Brain, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Selesai', value: sessions?.filter(s => s.status === 'completed').length ?? 0, icon: CheckCircle, color: 'text-teal-700', bg: 'bg-white' },
          { label: 'Dalam Proses', value: sessions?.filter(s => s.status === 'pending' || s.status === 'started').length ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-white' },
          { label: 'Kadaluarsa', value: sessions?.filter(s => s.status === 'expired').length ?? 0, icon: AlertCircle, color: 'text-gray-400', bg: 'bg-white' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="apple-card p-6 flex flex-col items-start apple-card-hover cursor-default">
              <div className={`p-2 rounded-xl bg-gray-50 ${stat.color} mb-4`}>
                <Icon size={18} />
              </div>
              <p className={`text-3xl font-black mb-1 ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Sessions list */}
      <div className="apple-card overflow-hidden">
        {!sessions || sessions.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain size={32} className="text-gray-200" />
            </div>
            <p className="text-lg font-extrabold text-gray-900 mb-1">Belum ada sesi DiSC</p>
            <p className="text-sm text-gray-500 mb-6">Kirim assessment dari halaman detail pelamar</p>
            <Link href="/dashboard/hrd/rekrutmen" className="apple-btn-primary inline-flex items-center gap-2">
              <Users size={16} /> Lihat Pelamar
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  {['Pelamar', 'Kode Akses', 'Status', 'Profil DiSC', 'Tanggal Dibuat', ''].map(h => (
                    <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s: any) => {
                  const appl = s.applicants
                  const results = s.results
                  const primary = results?.primaryType as Dimension | undefined
                  const dim = primary ? DISC_DIMENSIONS[primary] : null

                  return (
                    <tr key={s.id} className="group hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="px-6 py-5">
                        <p className="text-sm font-extrabold text-gray-900 mb-0.5">{appl?.full_name || '-'}</p>
                        <p className="text-xs font-medium text-gray-500">{appl?.position_applied}{appl?.outlet_preference ? ` · ${appl.outlet_preference}` : ''}</p>
                      </td>
                      <td className="px-6 py-5">
                        <code className="text-sm font-black text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg tracking-widest">{s.access_code}</code>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${statusColor[s.status]} ${statusBg[s.status]}`}>
                          {statusLabel[s.status] || s.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {primary && dim ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0"
                              style={{ backgroundColor: dim.lightBg, borderColor: dim.color }}>
                              <span className="text-[10px] font-black" style={{ color: dim.color }}>{primary}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-gray-900 mb-0.5 truncate uppercase tracking-tight">{results?.pattern?.pattern || '-'}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{dim.label}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-xs font-bold text-gray-500">
                        {new Date(s.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {s.status === 'completed' && (
                          <Link href={`/dashboard/hrd/disc/${s.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm">
                            Hasil <span className="text-strada-blue">→</span>
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

