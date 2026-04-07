import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { access_code } = await req.json()
  if (!access_code) return NextResponse.json({ error: 'Kode akses diperlukan' }, { status: 400 })

  const { data: session, error } = await supabase
    .from('disc_sessions')
    .select('id, status, expires_at, applicant_id')
    .eq('access_code', access_code.toUpperCase().trim())
    .maybeSingle()

  if (error || !session) return NextResponse.json({ error: 'Kode akses tidak ditemukan' }, { status: 404 })

  if (session.status === 'completed') {
    return NextResponse.json({ error: 'Test ini sudah pernah diselesaikan. Kode tidak bisa digunakan lagi.' }, { status: 409 })
  }
  if (session.status === 'expired' || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Kode akses sudah kadaluarsa.' }, { status: 410 })
  }

  // Mark as started if still pending
  if (session.status === 'pending') {
    await supabase
      .from('disc_sessions')
      .update({ status: 'started', started_at: new Date().toISOString() })
      .eq('id', session.id)
  }

  return NextResponse.json({ session_id: session.id, access_code: access_code.toUpperCase().trim() })
}
