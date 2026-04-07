import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeDiscResults, validateAnswers, DiscAnswers } from '@/lib/disc/scorer'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { access_code, answers } = await req.json() as { access_code: string; answers: DiscAnswers }

  if (!access_code || !answers) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }

  const { data: session, error } = await supabase
    .from('disc_sessions')
    .select('id, status, expires_at')
    .eq('access_code', access_code.toUpperCase().trim())
    .maybeSingle()

  if (error || !session) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  if (session.status === 'completed') return NextResponse.json({ error: 'Test sudah diselesaikan' }, { status: 409 })
  if (session.status === 'expired' || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Sesi sudah kadaluarsa' }, { status: 410 })
  }

  // Validate all 24 answered, no same most/least
  const { valid, unanswered } = validateAnswers(answers)
  if (!valid) {
    return NextResponse.json({ error: 'Belum semua pertanyaan dijawab', unanswered }, { status: 422 })
  }

  const results = computeDiscResults(answers)

  const { error: updateError } = await supabase
    .from('disc_sessions')
    .update({
      status: 'completed',
      answers,
      results,
      completed_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true, results })
}
