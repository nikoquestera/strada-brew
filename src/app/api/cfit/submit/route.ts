import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CfitAnswers, scoreCfitAnswers } from '@/lib/cfit/scorer'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { access_code, answers } = await req.json() as { access_code: string; answers: CfitAnswers }

  if (!access_code || !answers) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }

  const { data: session, error } = await supabase
    .from('applicant_tests')
    .select('id, status, expires_at')
    .eq('access_code', access_code.toUpperCase().trim())
    .maybeSingle()

  if (error || !session) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  if (session.status === 'completed') return NextResponse.json({ error: 'Tes sudah diselesaikan' }, { status: 409 })
  if (session.status === 'expired' || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Sesi sudah kadaluarsa' }, { status: 410 })
  }

  const scored = scoreCfitAnswers(answers)

  const { error: updateError } = await supabase
    .from('applicant_tests')
    .update({
      status: 'completed',
      answers,
      score: scored.score,
      score_percentage: scored.percentage,
      total_points: scored.totalPoints,
      completed_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ success: true, score: scored.score, score_percentage: scored.percentage })
}
