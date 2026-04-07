import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import CfitCropImage from '@/components/CfitCropImage'
import { createClient } from '@/lib/supabase/server'
import { classifyCfitScore } from '@/lib/cfit/classification'
import { CFIT_QUESTIONS, CFIT_TOTAL_POINTS } from '@/lib/cfit/data'
import { CfitAnswers, scoreCfitAnswers } from '@/lib/cfit/scorer'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CfitResultPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('applicant_tests')
    .select(`
      id, access_code, status, sent_at, started_at, completed_at, score, score_percentage, total_points, answers,
      applicants ( id, full_name, position_applied, outlet_preference ),
      tests ( title )
    `)
    .eq('id', id)
    .single()

  if (!session) notFound()

  const answers = (session.answers || {}) as CfitAnswers
  const scored = scoreCfitAnswers(answers)
  const rawScore = typeof session.score === 'number' ? session.score : scored.score
  const totalPoints = typeof session.total_points === 'number' ? session.total_points : CFIT_TOTAL_POINTS
  const percentage = typeof session.score_percentage === 'number' ? session.score_percentage : scored.percentage
  const classification = classifyCfitScore(rawScore)
  const applicant = Array.isArray(session.applicants) ? session.applicants[0] : session.applicants

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '32px 24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <Link href={applicant?.id ? `/dashboard/hrd/rekrutmen/${applicant.id}` : '/dashboard/hrd/rekrutmen'} style={{ fontSize: '13px', color: '#8A8A8D', textDecoration: 'none', fontWeight: 600 }}>
            ← Kembali ke profil kandidat
          </Link>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#037894', letterSpacing: '2px', textTransform: 'uppercase', margin: '16px 0 6px' }}>Tes Kandidat</p>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#020000', margin: 0 }}>Laporan Tes Intelegensi</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#020000', margin: '0 0 4px' }}>{applicant?.full_name || 'Kandidat'}</p>
          <p style={{ fontSize: '12px', color: '#8A8A8D', margin: 0 }}>{applicant?.position_applied || '-'}{applicant?.outlet_preference ? ` · ${applicant.outlet_preference}` : ''}</p>
        </div>
      </div>

      <div style={{ backgroundColor: '#020000', borderRadius: '24px', padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '14px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#8FC6C5', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 8px' }}>Ringkasan</p>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Tes Intelegensi CFIT 3B</h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)', margin: '0 0 14px', lineHeight: 1.7 }}>
              Jawaban kandidat tersimpan lengkap dan telah dibandingkan dengan kunci dari `JAWABAN CFIT.jpeg`.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                `Kode ${session.access_code}`,
                `Status ${session.status}`,
                session.completed_at ? `Selesai ${new Date(session.completed_at).toLocaleDateString('id-ID')}` : 'Belum selesai',
              ].map((item) => (
                <span key={item} style={{ padding: '5px 10px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.16)', color: '#fff', fontSize: '12px', fontWeight: 700 }}>{item}</span>
              ))}
            </div>
          </div>
          {[
            { label: 'Raw Score', value: `${rawScore}/${totalPoints}`, color: '#fff', bg: 'rgba(255,255,255,0.08)' },
            { label: 'SS', value: classification.scaledScore, color: '#8FC6C5', bg: 'rgba(3,120,148,0.16)' },
            { label: 'Kategori', value: classification.category, color: '#F6D48F', bg: 'rgba(222,151,51,0.16)' },
          ].map((card) => (
            <div key={card.label} style={{ borderRadius: '18px', padding: '18px', backgroundColor: card.bg }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{card.label}</p>
              <p style={{ fontSize: '24px', fontWeight: 900, color: card.color, margin: 0 }}>{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#020000', margin: '0 0 10px' }}>Klasifikasi Nilai IQ</h2>
          <p style={{ fontSize: '13px', color: '#4C4845', margin: '0 0 12px', lineHeight: 1.7 }}>
            Berdasarkan tabel `KLASIFIKASI CFIT.jpeg`, raw score <b>{rawScore}</b> dikonversi menjadi <b>SS {classification.scaledScore}</b> dengan taraf kecerdasan <b>{classification.intelligenceClass}</b> dan kategori <b>{classification.category}</b>.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ padding: '7px 12px', borderRadius: '999px', backgroundColor: '#F7F5F2', border: '1px solid #E8E4E0', fontSize: '12px', fontWeight: 700, color: '#4C4845' }}>Taraf: {classification.intelligenceClass}</span>
            <span style={{ padding: '7px 12px', borderRadius: '999px', backgroundColor: '#E6F4F8', border: '1px solid rgba(3,120,148,0.2)', fontSize: '12px', fontWeight: 700, color: '#037894' }}>Kategori: {classification.category}</span>
            <span style={{ padding: '7px 12px', borderRadius: '999px', backgroundColor: '#E6F4F1', border: '1px solid rgba(0,83,83,0.2)', fontSize: '12px', fontWeight: 700, color: '#005353' }}>Akurasi: {percentage}%</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#020000', margin: '0 0 12px' }}>Ringkasan HRD</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              `Total jawaban benar: ${rawScore} dari ${totalPoints} soal.`,
              `Subtes 2 dinilai benar hanya bila dua jawaban yang dipilih tepat seluruhnya.`,
              `Tidak ada hasil yang ditampilkan ke kandidat; review hanya tersedia di portal HRD.`,
            ].map((item) => (
              <div key={item} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#037894', marginTop: '7px', flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: '#4C4845', margin: 0, lineHeight: 1.6 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '22px', padding: '24px', border: '1.5px solid #E8E4E0' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#020000', margin: '0 0 18px' }}>Detail Jawaban Kandidat</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {CFIT_QUESTIONS.map((question) => {
            const item = scored.perQuestion.find((entry) => entry.id === question.id)!
            const submitted = item.submitted.join(', ') || '—'
            const correct = item.correct.join(', ')
            return (
              <div key={question.id} style={{ borderRadius: '18px', border: '1px solid #E8E4E0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', backgroundColor: item.isCorrect ? '#E6F4F1' : '#FFF5F4', borderBottom: '1px solid #E8E4E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A8D', margin: '0 0 4px', letterSpacing: '1px', textTransform: 'uppercase' }}>Subtes {question.subtestId}</p>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#020000', margin: 0 }}>Soal {question.questionNo}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: '#fff', border: '1px solid #E8E4E0', fontSize: '12px', fontWeight: 700, color: '#4C4845' }}>Jawaban kandidat: {submitted}</span>
                    <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: '#fff', border: '1px solid #E8E4E0', fontSize: '12px', fontWeight: 700, color: '#4C4845' }}>Kunci: {correct}</span>
                    <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: item.isCorrect ? '#E6F4F1' : '#FFF0EE', border: `1px solid ${item.isCorrect ? 'rgba(0,83,83,0.15)' : 'rgba(255,79,49,0.2)'}`, fontSize: '12px', fontWeight: 800, color: item.isCorrect ? '#005353' : '#FF4F31' }}>
                      {item.isCorrect ? 'Benar' : 'Salah'}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '18px', backgroundColor: '#FCFBFA' }}>
                  <CfitCropImage visual={question.visual} alt={`${question.id} visual`} compact maxWidth={860} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
