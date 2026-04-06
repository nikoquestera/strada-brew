export const dynamic = "force-dynamic"
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('job_postings')
    .select('id, job_id, title, department, location, outlet, employment_type, salary_display, description, requirements, is_urgent, is_active')
    .eq('job_id', id)
    .single()

  if (!job) notFound()

  const requirementLines = job.requirements
    ? (Array.isArray(job.requirements) ? job.requirements : String(job.requirements).split('\n').filter(Boolean))
    : []

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #F7F5F2; }
        .apply-btn:hover { background: #026a80 !important; }
        .back-link:hover { color: rgba(228,222,216,0.9) !important; }
        @media (max-width: 600px) {
          .job-header { padding: 20px 16px !important; }
          .job-body { padding: 20px 16px !important; }
          .job-meta-grid { grid-template-columns: 1fr 1fr !important; }
          .apply-btn { font-size: 15px !important; padding: 14px 20px !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F2' }}>
        {/* Top bar */}
        <div style={{ backgroundColor: '#020000', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/apply" className="back-link"
            style={{ color: 'rgba(228,222,216,0.5)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', transition: 'color 0.15s' }}>
            ← Semua Lowongan
          </Link>
          <img src="/strada-logo.svg" alt="Strada Coffee" style={{ height: '32px', width: 'auto', marginLeft: 'auto' }} />
        </div>

        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 16px 40px' }}>

          {/* Header card */}
          <div style={{ backgroundColor: '#020000', borderRadius: '0 0 20px 20px', padding: '28px 32px 32px', marginBottom: '20px' }} className="job-header">
            {job.is_urgent && (
              <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '6px', backgroundColor: '#FF4F31', color: '#fff', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
                Segera Diisi
              </span>
            )}
            <h1 style={{ color: '#ffffff', fontSize: '26px', fontWeight: 800, margin: '0 0 6px', lineHeight: 1.2 }}>{job.title}</h1>
            <p style={{ color: '#8FC6C5', fontSize: '14px', margin: '0 0 20px' }}>{job.department} · Strada Coffee</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }} className="job-meta-grid">
              {[
                { icon: '📍', label: 'Lokasi', value: job.outlet || job.location || '-' },
                { icon: '💼', label: 'Tipe', value: job.employment_type || 'Full-time' },
                { icon: '💰', label: 'Gaji', value: job.salary_display || 'Kompetitif' },
              ].map(item => (
                <div key={item.label} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 14px' }}>
                  <p style={{ fontSize: '18px', margin: '0 0 4px' }}>{item.icon}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(228,222,216,0.4)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{item.label}</p>
                  <p style={{ fontSize: '13px', color: '#ffffff', margin: 0, fontWeight: 600 }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px 28px', border: '1.5px solid #E8E4E0', marginBottom: '16px' }} className="job-body">
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#020000', margin: '0 0 14px' }}>Tentang Posisi Ini</h2>
              <p style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{job.description}</p>
            </div>
          )}

          {/* Requirements */}
          {requirementLines.length > 0 && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px 28px', border: '1.5px solid #E8E4E0', marginBottom: '24px' }} className="job-body">
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#020000', margin: '0 0 14px' }}>Kualifikasi & Persyaratan</h2>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {requirementLines.map((req: string, i: number) => (
                  <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#037894', fontSize: '14px', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✦</span>
                    <span style={{ fontSize: '14px', color: '#4C4845', lineHeight: 1.6 }}>{req.replace(/^[-•*]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div style={{ backgroundColor: '#020000', borderRadius: '16px', padding: '24px 28px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(228,222,216,0.6)', fontSize: '13px', margin: '0 0 16px' }}>
              Siap bergabung bersama tim Strada Coffee?
            </p>
            <Link href={`/apply?job=${job.job_id}`} className="apply-btn"
              style={{ display: 'inline-block', padding: '16px 40px', borderRadius: '12px', backgroundColor: '#037894', color: '#fff', fontWeight: 800, fontSize: '16px', textDecoration: 'none', transition: 'background 0.15s', letterSpacing: '0.3px' }}>
              Lamar Sekarang →
            </Link>
            <p style={{ color: 'rgba(228,222,216,0.3)', fontSize: '11px', margin: '14px 0 0' }}>
              Proses pendaftaran hanya beberapa menit
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
