import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAccessCode } from '@/lib/disc/scorer'

async function getOrCreateTestId() {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('tests')
    .select('id')
    .eq('title', 'Tes Intelegensi')
    .maybeSingle()

  if (existing?.id) return { supabase, testId: existing.id }

  const { data, error } = await supabase
    .from('tests')
    .insert({
      title: 'Tes Intelegensi',
      description: 'Culture Fair Intelligence Test Skala 3B.',
      instructions: 'Instruksi kandidat dan soal diambil dari aset aplikasi.',
      time_limit_minutes: 12.5,
      is_active: true,
    })
    .select('id')
    .single()

  if (error || !data?.id) throw new Error(error?.message || 'Gagal menyiapkan master tes')
  return { supabase, testId: data.id }
}

export async function POST(req: NextRequest) {
  try {
    const { applicant_id } = await req.json()
    if (!applicant_id) return NextResponse.json({ error: 'applicant_id required' }, { status: 400 })

    const { supabase, testId } = await getOrCreateTestId()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let access_code = ''
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateAccessCode()
      const { data: existing } = await supabase
        .from('applicant_tests')
        .select('id')
        .eq('access_code', candidate)
        .maybeSingle()
      if (!existing) {
        access_code = candidate
        break
      }
    }

    if (!access_code) {
      return NextResponse.json({ error: 'Gagal membuat kode unik' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('applicant_tests')
      .insert({
        applicant_id,
        test_id: testId,
        access_code,
        status: 'pending',
        sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select(`
        id, access_code, status, sent_at, completed_at, score, score_percentage, total_points,
        tests ( title )
      `)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ session: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Terjadi kesalahan' }, { status: 500 })
  }
}
