import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { access_code } = await req.json()
  if (!access_code) return NextResponse.json({ error: 'Kode akses diperlukan' }, { status: 400 })

  const { data: session, error } = await supabase
    .from('applicant_tests')
    .select('id, status, expires_at')
    .eq('access_code', access_code.toUpperCase().trim())
    .maybeSingle()

  if (error || !session) return NextResponse.json({ error: 'Kode akses tidak ditemukan' }, { status: 404 })
  if (session.status === 'completed') return NextResponse.json({ error: 'Tes sudah diselesaikan' }, { status: 409 })
  if (session.status === 'expired' || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Kode akses sudah kadaluarsa.' }, { status: 410 })
  }

  if (session.status === 'pending') {
    const { error: updateError } = await supabase
      .from('applicant_tests')
      .update({ status: 'started', started_at: new Date().toISOString() })
      .eq('id', session.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
