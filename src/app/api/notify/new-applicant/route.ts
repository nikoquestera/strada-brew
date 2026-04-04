import { NextRequest, NextResponse } from 'next/server'

const HRD_EMAIL = process.env.HRD_EMAIL || 'hrd@stradacoffee.com'

export async function POST(request: NextRequest) {
  const { applicant } = await request.json()

  const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #F7F5F2; padding: 32px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(3,120,148,0.12);">
    <div style="background: #020000; padding: 28px 32px;">
      <p style="color: #037894; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 4px;">Strada Brew · HRD Alert</p>
      <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0;">Pelamar Baru Masuk!</h1>
    </div>
    <div style="padding: 28px 32px;">
      <p style="color: #4C4845; font-size: 14px; margin: 0 0 20px;">Ada pelamar baru yang masuk melalui portal karir Strada Coffee.</p>
      <table style="width: 100%; border-collapse: collapse;">
        ${[
          ['Nama', applicant.full_name],
          ['Posisi', applicant.position_applied],
          ['Email', applicant.email],
          ['No. HP', applicant.phone],
          ['Pengalaman Kafe', applicant.has_cafe_experience ? `${applicant.cafe_experience_years} tahun` : 'Belum ada'],
          ['Sertifikasi', applicant.has_barista_cert ? 'Ada' : 'Tidak ada'],
          ['Domisili', applicant.domicile || '-'],
          ['Waktu Daftar', new Date().toLocaleString('id-ID')],
        ].map(([k, v]) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #F0EEEC; font-size: 13px; color: #8A8A8D; width: 40%;">${k}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #F0EEEC; font-size: 13px; color: #020000; font-weight: 600;">${v}</td>
        </tr>`).join('')}
      </table>
      <div style="margin-top: 24px; padding: 16px; background: rgba(3,120,148,0.05); border-radius: 12px; border: 1px solid rgba(3,120,148,0.15);">
        <p style="font-size: 13px; color: #037894; font-weight: 600; margin: 0 0 4px;">Quest AI Scoring</p>
        <p style="font-size: 13px; color: #4C4845; margin: 0;">Score AI sedang diproses. Cek portal BREW dalam beberapa menit.</p>
      </div>
      <a href="https://brew.stradacoffee.com/dashboard/hrd/rekrutmen" style="display: inline-block; margin-top: 20px; padding: 12px 28px; background: #037894; color: #ffffff; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none;">Lihat di Portal BREW →</a>
    </div>
    <div style="padding: 16px 32px; border-top: 1px solid #F0EEEC; text-align: center;">
      <p style="font-size: 11px; color: #8A8A8D; margin: 0;">Strada Brew · Internal HR System · brew.stradacoffee.com</p>
    </div>
  </div>
</body>
</html>`

  // Send via Resend (add RESEND_API_KEY to Vercel env)
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.log('RESEND_API_KEY not set — email skipped')
    return NextResponse.json({ success: true, note: 'email skipped - no API key' })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendKey}`
    },
    body: JSON.stringify({
      from: 'BREW · Strada Coffee <brew@stradacoffee.com>',
      to: [HRD_EMAIL],
      subject: `[Pelamar Baru] ${applicant.full_name} — ${applicant.position_applied}`,
      html: emailBody
    })
  })

  return NextResponse.json({ success: res.ok })
}