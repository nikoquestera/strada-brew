import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { DISC_DIMENSIONS, DISC_QUESTIONS, Dimension } from '@/lib/disc/data'
import { DiscResults } from '@/lib/disc/scorer'

interface Props { params: Promise<{ id: string }> }

const DIMS: Dimension[] = ['D', 'I', 'S', 'C']

function GraphBar({ dim, value, max = 20, label }: { dim: Dimension; value: number; max?: number; label: string }) {
  const d = DISC_DIMENSIONS[dim]
  const pct = Math.max(0, Math.min(100, ((value + max) / (max * 2)) * 100))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
      <span style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D' }}>{value > 0 ? `+${value}` : value}</span>
      <div style={{ width: '100%', height: '120px', position: 'relative', backgroundColor: '#F7F5F2', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse' }}>
        {/* midline */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', backgroundColor: '#E8E4E0' }} />
        {/* bar - from center */}
        {value >= 0 ? (
          <div style={{ position: 'absolute', bottom: '50%', left: '10%', right: '10%', height: `${(value / max) * 50}%`, backgroundColor: d.color, borderRadius: '4px 4px 0 0', opacity: 0.85 }} />
        ) : (
          <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: `${(Math.abs(value) / max) * 50}%`, backgroundColor: d.color, borderRadius: '0 0 4px 4px', opacity: 0.35 }} />
        )}
      </div>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: d.lightBg, border: `2px solid ${d.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color: d.color }}>{dim}</span>
      </div>
      <span style={{ fontSize: '10px', fontWeight: 600, color: '#8A8A8D', textAlign: 'center' }}>{label}</span>
    </div>
  )
}

function CountBar({ dim, value, max = 16 }: { dim: Dimension; value: number; max?: number }) {
  const d = DISC_DIMENSIONS[dim]
  const pct = Math.round((value / max) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: d.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: d.color }}>{dim}</span>
      </div>
      <div style={{ flex: 1, height: '8px', backgroundColor: '#F0F0F0', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: d.color, borderRadius: '4px', transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color: '#020000', minWidth: '20px', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export default async function DiscResultPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('disc_sessions')
    .select(`
      id, access_code, status, created_at, completed_at, answers, results, created_by,
      applicants ( id, full_name, email, phone, position_applied, outlet_preference )
    `)
    .eq('id', id)
    .single()

  if (!session) notFound()
  if (session.status !== 'completed') {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '0 24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <p style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</p>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#020000', marginBottom: '8px' }}>Test belum selesai</h2>
        <p style={{ color: '#8A8A8D', marginBottom: '24px' }}>Pelamar belum menyelesaikan DiSC assessment ini.</p>
        <Link href="/dashboard/hrd/disc" style={{ color: '#037894', fontWeight: 700, textDecoration: 'none' }}>← Kembali ke daftar</Link>
      </div>
    )
  }

  const results = session.results as DiscResults
  const answers = session.answers as Record<string, { most: string; least: string }>
  const appl = session.applicants as any
  const primary = results.primaryType
  const dim = DISC_DIMENSIONS[primary]

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      {/* Back nav */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/dashboard/hrd/disc" style={{ fontSize: '13px', color: '#8A8A8D', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
          ← Semua Sesi DiSC
        </Link>
        {appl?.id && (
          <span style={{ color: '#E8E4E0', margin: '0 8px' }}>|</span>
        )}
        {appl?.id && (
          <Link href={`/dashboard/hrd/rekrutmen/${appl.id}`} style={{ fontSize: '13px', color: '#037894', textDecoration: 'none', fontWeight: 600 }}>
            Profil {appl.full_name} →
          </Link>
        )}
      </div>

      {/* Hero card */}
      <div style={{ backgroundColor: '#020000', borderRadius: '24px', padding: '32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        {/* Large dim letter watermark */}
        <div style={{ position: 'absolute', right: '-10px', top: '-20px', fontSize: '160px', fontWeight: 900, color: dim.color, opacity: 0.12, lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
          {primary}
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#8FC6C5', margin: '0 0 12px' }}>
                DiSC Profile — {session.access_code}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: `3px solid ${dim.color}`, backgroundColor: dim.lightBg + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '28px', fontWeight: 900, color: dim.color }}>{primary}</span>
                </div>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '0 0 4px' }}>{results.pattern?.pattern || primary}</h1>
                  <p style={{ fontSize: '14px', color: dim.color, fontWeight: 700, margin: 0 }}>{dim.label} — Tipe Utama</p>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(228,222,216,0.7)', margin: '16px 0 0', lineHeight: 1.7, maxWidth: '520px' }}>
                {results.pattern?.description}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '12px', color: '#8FC6C5', fontWeight: 700, margin: '0 0 4px' }}>{appl?.full_name}</p>
              <p style={{ fontSize: '12px', color: 'rgba(228,222,216,0.5)', margin: '0 0 2px' }}>{appl?.position_applied}{appl?.outlet_preference ? ` · ${appl.outlet_preference}` : ''}</p>
              <p style={{ fontSize: '11px', color: 'rgba(228,222,216,0.4)', margin: 0 }}>
                Selesai {new Date(session.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Pattern keys */}
          {results.patternKey && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'rgba(228,222,216,0.4)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Dimensi:</span>
              {results.patternKey.split('-').map((d: string) => {
                const dd = DISC_DIMENSIONS[d as Dimension]
                return dd ? (
                  <span key={d} style={{ padding: '3px 10px', borderRadius: '20px', border: `1.5px solid ${dd.color}`, color: dd.color, fontSize: '12px', fontWeight: 800 }}>
                    {d} {dd.label}
                  </span>
                ) : null
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Graph III — Change (Perceived Self) */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#020000', margin: '0 0 4px' }}>Grafik III — Diri yang Dipersepsikan</h2>
          <p style={{ fontSize: '12px', color: '#8A8A8D', margin: '0 0 20px' }}>Change = Most – Least (cerminan kepribadian asli)</p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '200px' }}>
            {DIMS.map(d => (
              <GraphBar key={d} dim={d} value={results.graph3[d]} max={12} label={DISC_DIMENSIONS[d].label.split(' ')[0]} />
            ))}
          </div>
        </div>

        {/* Score breakdown */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#020000', margin: '0 0 4px' }}>Skor Mentah</h2>
          <p style={{ fontSize: '12px', color: '#8A8A8D', margin: '0 0 20px' }}>Jumlah pilihan "Paling" (P) dan "Kurang" (K) per dimensi</p>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#037894', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 10px' }}>Grafik I — Paling (Public Self)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DIMS.map(d => <CountBar key={d} dim={d} value={results.graph1[d]} />)}
            </div>
          </div>

          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#005353', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 10px' }}>Grafik II — Kurang (Private Self)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DIMS.map(d => <CountBar key={d} dim={d} value={results.graph2[d]} />)}
            </div>
          </div>
        </div>
      </div>

      {/* 3 Character Sections — Gambaran Karakter */}
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '28px', border: '1.5px solid #E8E4E0', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#020000', margin: '0 0 4px' }}>Gambaran Karakter</h2>
        <p style={{ fontSize: '12px', color: '#8A8A8D', margin: '0 0 24px' }}>Tiga dimensi kepribadian dari hasil DiSC Assessment</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { label: 'Kepribadian di Muka Umum', sub: 'Graph I — Public Self', p: results.pattern1, accent: '#037894', bg: '#E6F4F8' },
            { label: 'Kepribadian Saat Tekanan', sub: 'Graph II — Under Pressure', p: results.pattern2, accent: '#DE9733', bg: '#FEF8E6' },
            { label: 'Kepribadian Asli', sub: 'Graph III — Real Self (Utama)', p: results.pattern, accent: dim.color, bg: dim.lightBg },
          ].map(({ label, sub, p, accent, bg }) => (
            <div key={label} style={{ borderRadius: '16px', padding: '20px', backgroundColor: bg, border: `1.5px solid ${accent}30` }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: accent, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 2px' }}>{sub}</p>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#020000', margin: '0 0 12px' }}>{p?.pattern || '—'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(p?.behaviour || []).map((b: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: accent, marginTop: '5px', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#4C4845', fontWeight: 500, lineHeight: 1.5 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Behavioural traits & Jobs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#020000', margin: '0 0 16px' }}>Karakter Utama</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(results.pattern?.behaviour || []).map((b: string, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', backgroundColor: dim.lightBg, border: `1px solid ${dim.color}20` }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dim.color, flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#020000' }}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#020000', margin: '0 0 4px' }}>Kecocokan Pekerjaan</h2>
          <p style={{ fontSize: '12px', color: '#8A8A8D', margin: '0 0 16px' }}>Posisi yang sesuai dengan profil ini</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(results.pattern?.jobs || []).map((job: string, i: number) => (
              <span key={i} style={{ padding: '6px 12px', borderRadius: '20px', backgroundColor: '#F7F5F2', border: '1px solid #E8E4E0', fontSize: '12px', fontWeight: 600, color: '#4C4845' }}>
                {job.trim()}
              </span>
            ))}
          </div>

          {/* Dimension descriptions */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F0EDE9' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 12px' }}>Dimensi yang Aktif</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[primary, ...results.secondaryTypes].map((d: Dimension) => {
                const dd = DISC_DIMENSIONS[d]
                return (
                  <div key={d} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: dd.lightBg, border: `2px solid ${dd.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: dd.color }}>{d}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#020000', margin: '0 0 2px' }}>{dd.label}</p>
                      <p style={{ fontSize: '11px', color: '#8A8A8D', margin: 0, lineHeight: 1.5 }}>{dd.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Keyword chips for all dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {DIMS.map(d => {
          const dd = DISC_DIMENSIONS[d]
          const score = results.graph3[d]
          const isActive = d === primary || results.secondaryTypes.includes(d)
          return (
            <div key={d} style={{ backgroundColor: isActive ? dd.lightBg : '#F7F5F2', borderRadius: '16px', padding: '16px', border: `1.5px solid ${isActive ? dd.color + '40' : '#E8E4E0'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: isActive ? dd.color : '#E8E4E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: isActive ? '#fff' : '#8A8A8D' }}>{d}</span>
                </div>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: isActive ? '#020000' : '#8A8A8D', margin: 0 }}>{dd.label}</p>
                  <p style={{ fontSize: '11px', color: isActive ? dd.color : '#8A8A8D', margin: 0, fontWeight: 700 }}>
                    Skor: {score > 0 ? '+' : ''}{score}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {dd.keywords.map(k => (
                  <span key={k} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', backgroundColor: isActive ? dd.color + '15' : '#E8E4E0', color: isActive ? dd.color : '#8A8A8D', fontWeight: 600 }}>{k}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Answer review */}
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1.5px solid #E8E4E0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F0EDE9' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#020000', margin: 0 }}>Detail Jawaban</h2>
          <p style={{ fontSize: '12px', color: '#8A8A8D', margin: '4px 0 0' }}>24 jawaban yang diberikan pelamar</p>
        </div>
        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {DISC_QUESTIONS.map(q => {
            const ans = answers?.[q.no] || answers?.[String(q.no)]
            return (
              <div key={q.no} style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#FAFAF9', border: '1px solid #F0EDE9' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pertanyaan {q.no}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {q.options.map(opt => {
                    const isMost  = ans?.most  === opt.term
                    const isLeast = ans?.least === opt.term
                    return (
                      <div key={opt.term} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 800, width: '18px', height: '18px',
                          borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          backgroundColor: isMost ? '#E6F4F8' : isLeast ? '#E6F4F1' : 'transparent',
                          color: isMost ? '#037894' : isLeast ? '#005353' : 'transparent',
                          border: `1px solid ${isMost ? '#037894' : isLeast ? '#005353' : 'transparent'}`,
                        }}>
                          {isMost ? 'P' : isLeast ? 'K' : ''}
                        </span>
                        <span style={{ fontSize: '12px', color: isMost ? '#037894' : isLeast ? '#005353' : '#8A8A8D', fontWeight: isMost || isLeast ? 700 : 400 }}>
                          {opt.term}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
