export const dynamic = "force-dynamic"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DISC_DIMENSIONS, Dimension } from '@/lib/disc/data'

export default async function DiscSessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let sessions: any[] = []
  let error: any = null

  try {
    const { data, error: fetchError } = await supabase
      .from('disc_sessions')
      .select(`
        id, access_code, status, sent_at, completed_at, expires_at, created_by, results,
        applicants ( id, full_name, position_applied, outlet_preference )
      `)
      .order('sent_at', { ascending: false })
    
    if (fetchError) throw fetchError
    sessions = data || []
  } catch (err: any) {
    console.error('[disc] supabase error:', err)
    error = err
  }

  const statusLabel: Record<string, string> = {
    pending: 'Belum Dimulai',
    started: 'Sedang Dikerjakan',
    completed: 'Selesai',
    expired: 'Kadaluarsa',
  }
  const statusColor: Record<string, string> = {
    pending: '#DE9733',
    started: '#037894',
    completed: '#005353',
    expired: '#8A8A8D',
  }
  const statusBg: Record<string, string> = {
    pending: '#FEF8E6',
    started: '#E6F4F8',
    completed: '#E6F4F1',
    expired: '#F0F0F0',
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#D12E2E' }}>Error loading DiSC sessions</h2>
        <p style={{ color: '#666' }}>{error.message || 'Unknown database error'}</p>
        <button onClick={() => {}} style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#037894', color: '#fff', cursor: 'pointer' }}>
          Reload Page
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#037894', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 6px' }}>Assessment</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#020000', margin: 0 }}>DiSC Personality Test</h1>
          <p style={{ fontSize: '14px', color: '#8A8A8D', margin: '4px 0 0' }}>Semua sesi assessment yang telah dikirimkan kepada pelamar</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['D','I','S','C'] as Dimension[]).map(d => (
              <div key={d} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: DISC_DIMENSIONS[d].lightBg, border: `2px solid ${DISC_DIMENSIONS[d].color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: DISC_DIMENSIONS[d].color }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Dikirim', value: sessions?.length ?? 0, color: '#020000' },
          { label: 'Selesai', value: sessions?.filter(s => s.status === 'completed').length ?? 0, color: '#005353' },
          { label: 'Menunggu', value: sessions?.filter(s => s.status === 'pending' || s.status === 'started').length ?? 0, color: '#DE9733' },
          { label: 'Kadaluarsa', value: sessions?.filter(s => s.status === 'expired').length ?? 0, color: '#8A8A8D' },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid #E8E4E0' }}>
            <p style={{ fontSize: '28px', fontWeight: 800, color: stat.color, margin: '0 0 4px' }}>{stat.value}</p>
            <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0, fontWeight: 600 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Sessions list */}
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1.5px solid #E8E4E0', overflow: 'hidden' }}>
        {!sessions || sessions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '40px', margin: '0 0 12px' }}>📋</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#4C4845', margin: '0 0 6px' }}>Belum ada sesi DiSC</p>
            <p style={{ fontSize: '13px', color: '#8A8A8D', margin: 0 }}>Kirim test dari halaman detail pelamar</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #E8E4E0', backgroundColor: '#FAFAF9' }}>
                {['Pelamar', 'Kode Akses', 'Status', 'Profil DiSC', 'Dikirim', 'Selesai', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#8A8A8D', letterSpacing: '1px', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s: any, i: number) => {
                const appl = s.applicants
                const results = s.results
                const primary = results?.primaryType as Dimension | undefined
                const dim = primary ? DISC_DIMENSIONS[primary] : null

                return (
                  <tr key={s.id} style={{ borderBottom: i < sessions.length - 1 ? '1px solid #F0EDE9' : 'none', transition: 'background-color 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FAFAF9')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 2px' }}>{appl?.full_name || '-'}</p>
                      <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>{appl?.position_applied}{appl?.outlet_preference ? ` · ${appl.outlet_preference}` : ''}</p>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <code style={{ fontSize: '14px', fontWeight: 800, color: '#020000', backgroundColor: '#F7F5F2', padding: '4px 10px', borderRadius: '8px', letterSpacing: '2px' }}>{s.access_code}</code>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: statusColor[s.status], backgroundColor: statusBg[s.status], padding: '4px 10px', borderRadius: '8px' }}>
                        {statusLabel[s.status] || s.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {primary && dim ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: dim.lightBg, border: `2px solid ${dim.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: dim.color }}>{primary}</span>
                          </div>
                          <div>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: '#020000', margin: '0 0 1px' }}>{results?.pattern?.pattern || '-'}</p>
                            <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>{dim.label}</p>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#8A8A8D' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#8A8A8D', whiteSpace: 'nowrap' }}>
                      {new Date(s.sent_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#8A8A8D', whiteSpace: 'nowrap' }}>
                      {s.completed_at ? new Date(s.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {s.status === 'completed' && (
                        <Link href={`/dashboard/hrd/disc/${s.id}`}
                          style={{ fontSize: '12px', fontWeight: 700, color: '#037894', textDecoration: 'none', padding: '6px 14px', borderRadius: '8px', border: '1.5px solid #037894', whiteSpace: 'nowrap' }}>
                          Lihat Hasil →
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
