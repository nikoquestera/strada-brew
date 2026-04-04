import { createClient } from '@/lib/supabase/server'
import { Applicant } from '@/lib/types'

export default async function RekrutmenPage() {
  const supabase = await createClient()
  const { data: applicants } = await supabase
    .from('applicants')
    .select('*')
    .order('created_at', { ascending: false })

  const statusColor: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700',
    screening: 'bg-yellow-50 text-yellow-700',
    shortlisted: 'bg-purple-50 text-purple-700',
    interview_scheduled: 'bg-orange-50 text-orange-700',
    interviewed: 'bg-indigo-50 text-indigo-700',
    offered: 'bg-teal-50 text-teal-700',
    accepted: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-700',
    withdrawn: 'bg-gray-50 text-gray-600',
  }

  const scoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 font-semibold'
    if (score >= 40) return 'text-amber-600'
    return 'text-red-500'
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rekrutmen & ATS</h1>
          <p className="text-gray-500 text-sm mt-1">{applicants?.length ?? 0} pelamar terdaftar</p>
        </div>
        <div className="flex gap-2">
          <a href="/apply" target="_blank" rel="noreferrer" className="border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Lihat Portal Pelamar
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Pelamar</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Posisi</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Sumber</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Skor</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {applicants?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                  Belum ada pelamar masuk.
                </td>
              </tr>
            )}
            {applicants?.map((app: Applicant) => (
              <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{app.full_name}</p>
                    <p className="text-xs text-gray-400">{app.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-700">{app.position_applied}</p>
                  {app.outlet_preference && (
                    <p className="text-xs text-gray-400">{app.outlet_preference}</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-gray-600">{app.source ?? '-'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm ${scoreColor(app.screening_score)}`}>
                    {app.screening_score}/100
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${statusColor[app.status]}`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-gray-400">
                    {new Date(app.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}