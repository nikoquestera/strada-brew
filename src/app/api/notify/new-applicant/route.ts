import { NextRequest, NextResponse } from 'next/server'

const HRD_EMAIL = process.env.HRD_EMAIL || 'hrd@stradacoffee.com'

export async function POST(request: NextRequest) {
  // Accept either a full applicant object or just the data fields
  const body = await request.json()
  // Support both calling conventions:
  //   { applicant: { full_name, ... } }  (old)
  //   { applicant_id, full_name, ... }   (inline data passed from apply form)
  const applicant = body.applicant ?? body

  if (!applicant?.full_name) {
    return NextResponse.json({ error: 'Missing applicant data' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.log('[notify] RESEND_API_KEY not set — email skipped')
    return NextResponse.json({ success: true, note: 'email skipped - no API key' })
  }

  const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(3,120,148,0.12);">
    <div style="background:#020000;padding:28px 32px;">
      <p style="color:#037894;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Strada BREW · HRD Alert</p>
      <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;">Pelamar Baru Masuk! 🎯</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="color:#4C4845;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Ada pelamar baru melalui portal karir Strada Coffee. Berikut ringkasan datanya:
      </p>
      <table style="width:100%;border-collapse:collapse;">
        ${([
          ['Nama', applicant.full_name],
          ['Posisi Dilamar', applicant.position_applied || '-'],
          ['Email', applicant.email || '-'],
          ['No. HP', applicant.phone || '-'],
          ['Domisili', applicant.domicile || '-'],
          ['Pengalaman Kafe', applicant.has_cafe_experience ? `${applicant.cafe_experience_years || 0} tahun` : 'Belum ada'],
          ['Sertifikasi Barista', applicant.has_barista_cert ? 'Ada' : 'Tidak ada'],
          ['Pendidikan', applicant.education_level || '-'],
          ['Waktu Daftar', new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })],
        ] as [string, string][]).map(([k, v]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #F0EEEC;font-size:13px;color:#8A8A8D;width:42%;vertical-align:top;">${k}</td>
          <td style="padding:10px 0;border-bottom:1px solid #F0EEEC;font-size:13px;color:#020000;font-weight:600;">${v}</td>
        </tr>`).join('')}
      </table>

      <div style="margin-top:24px;padding:16px;background:rgba(3,120,148,0.06);border-radius:12px;border:1px solid rgba(3,120,148,0.15);">
        <p style="font-size:13px;color:#037894;font-weight:700;margin:0 0 4px;">✦ Quest AI Scoring</p>
        <p style="font-size:13px;color:#4C4845;margin:0;">Profil sedang dianalisa secara otomatis. Cek portal BREW dalam beberapa menit untuk melihat skor.</p>
      </div>

      <a href="https://brew.stradacoffee.com/dashboard/hrd/rekrutmen"
        style="display:inline-block;margin-top:20px;padding:12px 28px;background:#037894;color:#ffffff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
        Lihat di Portal BREW →
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #F0EEEC;text-align:center;">
      <p style="font-size:11px;color:#8A8A8D;margin:0;">Strada BREW · Internal HR System · brew.stradacoffee.com</p>
    </div>
  </div>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'BREW · Strada Coffee <brew@stradacoffee.com>',
        to: [HRD_EMAIL],
        subject: `[Pelamar Baru] ${applicant.full_name} — ${applicant.position_applied || 'Posisi tidak diketahui'}`,
        html: emailBody,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[notify] Resend error:', res.status, data)
      return NextResponse.json({ success: false, error: data }, { status: 200 }) // non-blocking
    }

    console.log('[notify] Email sent to', HRD_EMAIL, 'for applicant', applicant.full_name)
    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    console.error('[notify] Exception:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 200 })
  }
}
