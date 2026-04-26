'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DISC_DIMENSIONS, Dimension } from '@/lib/disc/data'
import DiscRecomputeButton from '@/components/DiscRecomputeButton'

interface DiscSessionListItem {
  id: string
  access_code: string
  status: string
  sent_at?: string | null
  completed_at?: string | null
  results?: {
    primaryType?: Dimension
    pattern?: { pattern?: string }
  } | null
  applicants?: {
    id?: string
    full_name?: string
    position_applied?: string
    outlet_preference?: string
  } | null
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

export default function DiscSessionsClient({ initialSessions }: { initialSessions: DiscSessionListItem[] }) {
  const supabase = createClient()
  const [sessions, setSessions] = useState(initialSessions)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirmSession = sessions.find(s => s.id === confirmDeleteId)

  async function handleDelete() {
    if (!confirmDeleteId) return
    setDeleting(true)
    const { error } = await supabase.from('disc_sessions').delete().eq('id', confirmDeleteId)
    if (!error) {
      setSessions(prev => prev.filter(s => s.id !== confirmDeleteId))
    }
    setDeleting(false)
    setConfirmDeleteId(null)
  }

  return (
    <>
      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmDeleteId(null)} />
          <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '20px', padding: '28px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: '0 0 8px' }}>Hapus Sesi Ini?</p>
            <p style={{ fontSize: '14px', color: '#4C4845', margin: '0 0 4px' }}>
              <strong>{confirmSession?.applicants?.full_name || 'Sesi ini'}</strong> — Kode: <code style={{ fontWeight: 800, letterSpacing: '1px' }}>{confirmSession?.access_code}</code>
            </p>
            <p style={{ fontSize: '13px', color: '#8A8A8D', margin: '0 0 24px' }}>Data sesi dan hasil tes akan dihapus permanen dan tidak bisa dipulihkan.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #E8E4E0', fontSize: '14px', fontWeight: 700, color: '#4C4845', cursor: 'pointer', backgroundColor: '#fff' }}>
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 700, color: '#fff', backgroundColor: deleting ? '#FCA5A5' : '#DC2626', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#037894', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 6px' }}>Assessment</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#020000', margin: 0 }}>Tes Kepribadian</h1>
          <p style={{ fontSize: '14px', color: '#8A8A8D', margin: '4px 0 0' }}>Semua sesi assessment yang telah dikirimkan kepada pelamar</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {(['D', 'I', 'S', 'C'] as Dimension[]).map(d => (
            <div key={d} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: DISC_DIMENSIONS[d].lightBg, border: `2px solid ${DISC_DIMENSIONS[d].color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: DISC_DIMENSIONS[d].color }}>{d}</span>
            </div>
          ))}
          <DiscRecomputeButton scope="all-completed" label="Hitung Ulang Data Tersimpan" compact />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Dikirim', value: sessions.length, color: '#020000' },
          { label: 'Selesai', value: sessions.filter(s => s.status === 'completed').length, color: '#005353' },
          { label: 'Menunggu', value: sessions.filter(s => s.status === 'pending' || s.status === 'started').length, color: '#DE9733' },
          { label: 'Kadaluarsa', value: sessions.filter(s => s.status === 'expired').length, color: '#8A8A8D' },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid #E8E4E0' }}>
            <p style={{ fontSize: '28px', fontWeight: 800, color: stat.color, margin: '0 0 4px' }}>{stat.value}</p>
            <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0, fontWeight: 600 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Sessions list */}
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1.5px solid #E8E4E0', overflow: 'hidden' }}>
        {sessions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '40px', margin: '0 0 12px' }}>📋</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#4C4845', margin: '0 0 6px' }}>Belum ada sesi Tes Kepribadian</p>
            <p style={{ fontSize: '13px', color: '#8A8A8D', margin: 0 }}>Kirim test dari halaman detail pelamar</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #E8E4E0', backgroundColor: '#FAFAF9' }}>
                {['Pelamar', 'Kode Akses', 'Status', 'Profil Kepribadian', 'Dikirim', 'Selesai', '', ''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#8A8A8D', letterSpacing: '1px', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const appl = s.applicants
                const results = s.results
                const primary = results?.primaryType as Dimension | undefined
                const dim = primary ? DISC_DIMENSIONS[primary] : null

                return (
                  <tr key={s.id} className="disc-row" style={{ borderBottom: i < sessions.length - 1 ? '1px solid #F0EDE9' : 'none' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 2px' }}>{appl?.full_name || '-'}</p>
                      <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>{appl?.position_applied}{appl?.outlet_preference ? ` · ${appl.outlet_preference}` : ''}</p>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <code style={{ fontSize: '14px', fontWeight: 800, color: '#020000', backgroundColor: '#F7F5F2', padding: '4px 10px', borderRadius: '8px', letterSpacing: '2px' }}>{s.access_code}</code>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: statusColor[s.status] ?? '#8A8A8D', backgroundColor: statusBg[s.status] ?? '#F0F0F0', padding: '4px 10px', borderRadius: '8px' }}>
                        {statusLabel[s.status] ?? s.status}
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
                      {s.sent_at ? new Date(s.sent_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
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
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => setConfirmDeleteId(s.id)}
                        title="Hapus sesi"
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1.5px solid #FCA5A5', backgroundColor: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={14} color="#DC2626" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
