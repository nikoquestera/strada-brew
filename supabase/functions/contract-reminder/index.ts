import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const HRD_EMAIL = Deno.env.get('HRD_EMAIL') || 'hrd@stradacoffee.com'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const today = new Date()
  const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
  const dateStr = in14Days.toISOString().split('T')[0]

  const { data: expiring } = await supabase
    .from('employees')
    .select('id, full_name, position, entity, outlet, contract_end')
    .eq('status', 'active')
    .eq('contract_end', dateStr)

  if (!expiring || expiring.length === 0) {
    return new Response(JSON.stringify({ message: 'No contracts expiring in 14 days' }))
  }

  const rows = expiring.map(e => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #F0EEEC;font-size:13px;">${e.full_name}</td>
      <td style="padding:10px;border-bottom:1px solid #F0EEEC;font-size:13px;">${e.position}</td>
      <td style="padding:10px;border-bottom:1px solid #F0EEEC;font-size:13px;">${e.entity}</td>
      <td style="padding:10px;border-bottom:1px solid #F0EEEC;font-size:13px;color:#FF4F31;font-weight:700;">${new Date(e.contract_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
    </tr>`).join('')

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#F7F5F2;padding:32px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid rgba(3,120,148,0.12);">
    <div style="background:#020000;padding:24px 28px;">
      <p style="color:#037894;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px;">Strada Brew · HR Alert</p>
      <h1 style="color:#ffffff;font-size:18px;font-weight:800;margin:0;">⚠ Kontrak Karyawan Akan Berakhir dalam 14 Hari</h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="font-size:14px;color:#4C4845;margin:0 0 16px;">${expiring.length} karyawan berikut kontraknya akan berakhir pada <strong>${dateStr}</strong>:</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#F7F5F2;">
            <th style="padding:10px;text-align:left;font-size:12px;color:#8A8A8D;">Nama</th>
            <th style="padding:10px;text-align:left;font-size:12px;color:#8A8A8D;">Posisi</th>
            <th style="padding:10px;text-align:left;font-size:12px;color:#8A8A8D;">Entity</th>
            <th style="padding:10px;text-align:left;font-size:12px;color:#8A8A8D;">Tgl Berakhir</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <a href="https://brew.stradacoffee.com/dashboard/hrd/karyawan" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#037894;color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">Lihat Data Karyawan →</a>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #F0EEEC;text-align:center;">
      <p style="font-size:11px;color:#8A8A8D;margin:0;">Strada Brew · brew.stradacoffee.com · Automated reminder</p>
    </div>
  </div>
</body>
</html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: 'BREW · Strada Coffee <brew@stradacoffee.com>',
      to: [HRD_EMAIL],
      subject: `[REMINDER] ${expiring.length} kontrak karyawan berakhir 14 hari lagi`,
      html
    })
  })

  // Mark reminders as sent
  await supabase.from('contract_reminders')
    .update({ reminder_14d_sent: true, reminder_sent_at: new Date().toISOString() })
    .in('employee_id', expiring.map(e => e.id))

  return new Response(JSON.stringify({ sent: expiring.length }))
})