import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { access_code } = await req.json()
  if (!access_code) return NextResponse.json({ error: 'Kode akses diperlukan' }, { status: 400 })

  const { data: session, error } = await supabase
    .from('applicant_tests')
    .select('id, status, expires_at, started_at, completed_at, tests ( title )')
    .eq('access_code', access_code.toUpperCase().trim())
    .maybeSingle()

  if (error || !session) return NextResponse.json({ error: 'Kode akses tidak ditemukan' }, { status: 404 })
  if (session.status === 'completed') {
    return NextResponse.json({ error: 'Tes ini sudah pernah diselesaikan. Kode tidak bisa digunakan lagi.' }, { status: 409 })
  }
  if (session.status === 'expired' || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Kode akses sudah kadaluarsa.' }, { status: 410 })
  }

  const relatedTests = session.tests as { title?: string | null }[] | { title?: string | null } | null

  return NextResponse.json({
    session_id: session.id,
    access_code: access_code.toUpperCase().trim(),
    status: session.status,
    started_at: session.started_at,
    completed_at: session.completed_at,
    title: Array.isArray(relatedTests) ? relatedTests[0]?.title : relatedTests?.title,
  })
}
