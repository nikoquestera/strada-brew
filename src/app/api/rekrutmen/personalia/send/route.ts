import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

const SERVICE_KEY = process.env.SERVICE_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    const { applicant_id } = await request.json()
    if (!applicant_id) return NextResponse.json({ error: 'Missing applicant_id' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      SERVICE_KEY!
    )

    const access_code = nanoid(10).toUpperCase()

    const { data: session, error } = await supabase
      .from('personalia_sessions')
      .insert([{
        applicant_id,
        access_code,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, session })
  } catch (err: any) {
    console.error('[personalia/send] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
