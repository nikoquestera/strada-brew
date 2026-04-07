import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAccessCode } from '@/lib/disc/scorer'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { applicant_id } = await req.json()
  if (!applicant_id) return NextResponse.json({ error: 'applicant_id required' }, { status: 400 })

  // Generate a unique access code (retry up to 5 times for collision)
  let access_code = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateAccessCode()
    const { data: existing } = await supabase
      .from('disc_sessions')
      .select('id')
      .eq('access_code', candidate)
      .maybeSingle()
    if (!existing) { access_code = candidate; break }
  }
  if (!access_code) return NextResponse.json({ error: 'Gagal membuat kode unik' }, { status: 500 })

  const { data, error } = await supabase
    .from('disc_sessions')
    .insert({
      applicant_id,
      access_code,
      status: 'pending',
      created_by: user.email,
      sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data })
}
