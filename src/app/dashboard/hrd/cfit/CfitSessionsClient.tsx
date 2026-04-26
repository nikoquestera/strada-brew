'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { classifyCfitScore } from '@/lib/cfit/classification'

interface CfitSessionListItem {
  id: string
  access_code: string
  status: string
  sent_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  score?: number | null
  total_points?: number | null
  applicants?: {
    id?: string
    full_name?: string | null
    position_applied?: string | null
    outlet_preference?: string | null
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

export default function CfitSessionsClient({ initialSessions }: { initialSessions: CfitSessionListItem[] }) {
  const supabase = createClient()
  const [sessions, setSessions] = useState(initialSessions)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirmSession = sessions.find(s => s.id === confirmDeleteId)
  const confirmApplicant = Array.isArray(confirmSession?.applicants) ? confirmSession?.applicants[0] : confirmSession?.applicants

  async function handleDelete() {
    if (!confirmDeleteId) return
    setDeleting(true)
    const { error } = await supabase.from('applicant_tests').delete().eq('id', confirmDeleteId)
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
              <strong>{confirmApplicant?.full_name || 'Sesi ini'}</strong> — Kode: <code style={{ fontWeight: 800, letterSpacing: '1px' }}>{confirmSession?.access_code}</code>
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
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#037894', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 6px' }}>Assessment</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#020000', margin: 0 }}>Tes Intelegensi</h1>
          <p style={{ fontSize: '14px', color: '#8A8A8D', margin: '4px 0 0' }}>Monitoring seluruh tes yang telah dikirim kepada pelamar dan hasil yang sudah selesai</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {[
            { label: 'CFIT 3B', value: '4 Subtes', bg: '#020000', color: '#fff' },
            { label: 'Penilaian', value: 'Raw Score + IQ', bg: '#E6F4F8', color: '#037894' },
          ].map((pill) => (
            <div key={pill.label} style={{ borderRadius: '16px', padding: '12px 14px', backgroundColor: pill.bg }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: pill.color, margin: '0 0 4px', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.8 }}>{pill.label}</p>
              <p style={{ fontSize: '14px', fontWeight: 800, color: pill.color, margin: 0 }}>{pill.value}</p>
            </div>
          ))}
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

      {/* Sessions table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1.5px solid #E8E4E0', overflow: 'hidden' }}>
        {sessions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '40px', margin: '0 0 12px' }}>🧠</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#4C4845', margin: '0 0 6px' }}>Belum ada sesi Tes Intelegensi</p>
            <p style={{ fontSize: '13px', color: '#8A8A8D', margin: 0 }}>Kirim tes dari halaman detail pelamar untuk mulai memonitor hasil</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #E8E4E0', backgroundColor: '#FAFAF9' }}>
                {['Pelamar', 'Kode Akses', 'Status', 'Skor', 'Klasifikasi IQ', 'Dikirim', 'Selesai', '', ''].map((header, i) => (
                  <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#8A8A8D', letterSpacing: '1px', textTransform: 'uppercase' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => {
                const applicant = Array.isArray(session.applicants) ? session.applicants[0] : session.applicants
                const classification = typeof session.score === 'number' ? classifyCfitScore(session.score) : null

                return (
                  <tr key={session.id} className="cfit-row" style={{ borderBottom: index < sessions.length - 1 ? '1px solid #F0EDE9' : 'none' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#020000', margin: '0 0 2px' }}>{applicant?.full_name || '-'}</p>
                      <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>{applicant?.position_applied || '-'}{applicant?.outlet_preference ? ` · ${applicant.outlet_preference}` : ''}</p>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <code style={{ fontSize: '14px', fontWeight: 800, color: '#020000', backgroundColor: '#F7F5F2', padding: '4px 10px', borderRadius: '8px', letterSpacing: '2px' }}>{session.access_code}</code>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: statusColor[session.status] ?? '#8A8A8D', backgroundColor: statusBg[session.status] ?? '#F0F0F0', padding: '4px 10px', borderRadius: '8px' }}>
                        {statusLabel[session.status] ?? session.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {typeof session.score === 'number' ? (
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 800, color: '#020000', margin: '0 0 2px' }}>{session.score}/{session.total_points || 50}</p>
                          <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>Raw score</p>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#8A8A8D' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {classification ? (
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: 700, color: '#020000', margin: '0 0 2px' }}>SS {classification.scaledScore} · {classification.category}</p>
                          <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0 }}>{classification.intelligenceClass}</p>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#8A8A8D' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#8A8A8D', whiteSpace: 'nowrap' }}>
                      {session.sent_at ? new Date(session.sent_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#8A8A8D', whiteSpace: 'nowrap' }}>
                      {session.completed_at ? new Date(session.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {session.status === 'completed' && (
                        <Link
                          href={`/dashboard/hrd/cfit/${session.id}`}
                          style={{ fontSize: '12px', fontWeight: 700, color: '#037894', textDecoration: 'none', padding: '6px 14px', borderRadius: '8px', border: '1.5px solid #037894', whiteSpace: 'nowrap' }}
                        >
                          Lihat Hasil →
                        </Link>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => setConfirmDeleteId(session.id)}
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
