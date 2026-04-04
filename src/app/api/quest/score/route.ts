import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runQuestScoring } from '@/lib/quest'

export async function POST(request: NextRequest) {
  const { applicant_id } = await request.json()
  if (!applicant_id) return NextResponse.json({ error: 'Missing applicant_id' }, { status: 400 })

  const supabase = await createClient()

  // Get applicant data
  const { data: applicant } = await supabase
    .from('applicants')
    .select('*, job_postings(*)')
    .eq('id', applicant_id)
    .single()

  if (!applicant) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })

  // Mark as processing
  await supabase.from('applicant_quest_scores')
    .update({ status: 'processing' })
    .eq('applicant_id', applicant_id)

  try {
    const result = await runQuestScoring({
      applicant: {
        full_name: applicant.full_name,
        has_cafe_experience: applicant.has_cafe_experience,
        cafe_experience_years: applicant.cafe_experience_years,
        cafe_experience_detail: applicant.cafe_experience_detail,
        has_barista_cert: applicant.has_barista_cert,
        cert_detail: applicant.cert_detail,
        education_level: applicant.education_level,
        instagram_url: applicant.instagram_url,
        motivation: applicant.hr_notes,
        domicile: applicant.domicile,
        position_applied: applicant.position_applied,
      },
      job: applicant.job_postings ? {
        title: applicant.job_postings.title,
        min_experience_years: applicant.job_postings.min_experience_years,
        ai_screening_notes: applicant.job_postings.ai_screening_notes,
      } : undefined
    })

    await supabase.from('applicant_quest_scores')
      .update({
        ...result,
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('applicant_id', applicant_id)

    await supabase.from('applicants')
      .update({ quest_score: result.overall_score })
      .eq('id', applicant_id)

    return NextResponse.json({ success: true, score: result.overall_score })
  } catch {
    await supabase.from('applicant_quest_scores')
      .update({ status: 'failed' })
      .eq('applicant_id', applicant_id)
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 })
  }
}