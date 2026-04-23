import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use Service Role Key to bypass RLS for public submissions
const SERVICE_KEY = process.env.SERVICE_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { form, job_posting_id } = body

    if (!form?.full_name || !form?.email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 1. Insert Applicant
    const { data: newApplicant, error: insertError } = await supabase
      .from('applicants')
      .insert([{
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        birth_date: form.birth_date || null,
        domicile: form.domicile,
        position_applied: form.position_applied,
        outlet_preference: form.outlet_preference,
        has_cafe_experience: !!form.has_cafe_experience,
        cafe_experience_years: Math.round(parseFloat(form.cafe_experience_years) || 0),
        cafe_experience_detail: form.cafe_experience_detail,
        has_barista_cert: !!form.has_barista_cert,
        cert_detail: form.cert_detail,
        education_level: form.education_level,
        instagram_url: form.instagram_url,
        hr_notes: form.hr_notes,
        cv_url: form.cv_url || null,
        job_posting_id: job_posting_id ?? null,
        source: 'Portal',
        status: 'new',
        pipeline_stage: 'baru_masuk',
      }])
      .select('id')
      .single()

    if (insertError) {
      console.error('[api/apply] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    if (!newApplicant?.id) {
      return NextResponse.json({ error: 'Failed to create applicant ID' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      id: newApplicant.id 
    })
  } catch (err) {
    console.error('[api/apply] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
