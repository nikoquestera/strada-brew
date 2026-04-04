import { createClient } from '@/lib/supabase/server'
import { Applicant } from '@/lib/types'

export default async function RekrutmenPage() {
  const supabase = await createClient()
  const { data: applicants } = await supabase
    .from('applicants')
    .select('*')
    .order('created_at', { ascending: false })

  const statusStyle: Record<string, { bg: string; color: string }> = {
    new:                  { bg: '#e6f0f4', color: '#037894' },
    screening:            { bg: '#fef8e6', color: '#DE9733' },
    shortlisted:          { bg: '#e6f4f1', color: '#005353' },
    interview_scheduled:  { bg: '#fef3e6', color: '#DE9733' },
    interviewed:          { bg: '#eef0f8', color: '#4C4845' },
    offered:              { bg: '#e6f4f1', color: '#005353' },
    accepted:             { bg: '#e6f4f1', color: '#005353' },
    rejected:             { bg: '#fff0ee', color: '#FF4F31' },
    withdrawn:            { bg: '#f0eeec', color: '#8A8A8D' },
  }

  const scoreColor = (score: number) => {
    if (score >= 70) return '#005353'
    if (score >= 40) return '#DE9733'
    return '#FF4F31'
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#037894' }}>HRD</p>
          <h1 className="text-2xl font-bold" style={{ color: '#020000' }}>Rekrutmen & ATS</h1>
          <p className="text-sm mt-1" style={{ color: '#8A8A8D' }}>{applicants?.length ?? 0} pelamar terdaftar</p>
        </div>
        <a href="/apply" target="_blank" rel="noreferrer"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ border: '1.5px solid #037894', color: '#037894', backgroundColor: 'transparent' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#037894'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#037894' }}>
          Lihat Portal Pelamar ↗
        </a>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(76,72,69,0.1)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(76,72,69,0.08)' }}>
              {['Pelamar', 'Posisi', 'Sumber', 'Skor', 'Status', 'Tanggal'].map(h => (
                <th key={h} className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: '#8A8A8D' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {applicants?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-sm" style={{ color: '#8A8A8D' }}>
                  Belum ada pelamar masuk.
                </td>
              </tr>
            )}
            {applicants?.map((app: Applicant) => {
              const s = statusStyle[app.status] ?? statusStyle.withdrawn
              return (
                <tr key={app.id} style={{ borderBottom: '1px solid rgba(76,72,69,0.05)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#faf9f7'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold" style={{ color: '#020000' }}>{app.full_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#8A8A8D' }}>{app.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm" style={{ color: '#020000' }}>{app.position_applied}</p>
                    {app.outlet_preference && (
                      <p className="text-xs mt-0.5" style={{ color: '#8A8A8D' }}>{app.outlet_preference}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs" style={{ color: '#4C4845' }}>{app.source ?? '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold" style={{ color: scoreColor(app.screening_score) }}>
                      {app.screening_score}/100
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: s.bg, color: s.color }}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs" style={{ color: '#8A8A8D' }}>
                      {new Date(app.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
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