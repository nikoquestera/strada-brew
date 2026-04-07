import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeDiscResults, DiscAnswers, validateAnswers } from '@/lib/disc/scorer'

interface DiscSessionRow {
  id: string
  answers: DiscAnswers | null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { scope, sessionId } = await req.json().catch(() => ({})) as {
    scope?: 'session' | 'all-completed'
    sessionId?: string
  }

  let query = supabase
    .from('disc_sessions')
    .select('id, answers')
    .eq('status', 'completed')
    .not('answers', 'is', null)

  if (scope === 'session') {
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId wajib untuk scope session' }, { status: 400 })
    }
    query = query.eq('id', sessionId)
  }

  const { data: sessions, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (sessions ?? []) as DiscSessionRow[]
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    if (!row.answers) {
      skipped += 1
      continue
    }

    const validation = validateAnswers(row.answers)
    if (!validation.valid) {
      skipped += 1
      continue
    }

    const results = computeDiscResults(row.answers)
    const { error: updateError } = await supabase
      .from('disc_sessions')
      .update({ results })
      .eq('id', row.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message, updated, skipped }, { status: 500 })
    }

    updated += 1
  }

  return NextResponse.json({ success: true, updated, skipped })
}
