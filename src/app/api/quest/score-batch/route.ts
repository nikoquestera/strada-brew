import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runQuestScoring } from '@/lib/quest'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get all applicants with pending scores
  const { data: pending } = await supabase
    .from('applicant_quest_scores')
    .select('applicant_id')
    .eq('status', 'pending')
    .limit(10)  // Process 10 at a time to avoid timeout

  if (!pending || pending.length === 0) {
    return NextResponse.json({ message: 'No pending scores', processed: 0 })
  }

  let processed = 0
  for (const item of pending) {
    try {
      const { data: applicant } = await supabase
        .from('applicants')
        .select('*')
        .eq('id', item.applicant_id)
        .single()

      if (!applicant) continue

      await supabase.from('applicant_quest_scores')
        .update({ status: 'processing' })
        .eq('applicant_id', item.applicant_id)

      const result = await runQuestScoring({
        applicant: {
          full_name: applicant.full_name,
          has_cafe_experience: applicant.has_cafe_experience || false,
          cafe_experience_years: applicant.cafe_experience_years || 0,
          cafe_experience_detail: applicant.cafe_experience_detail,
          has_barista_cert: applicant.has_barista_cert || false,
          cert_detail: applicant.cert_detail,
          education_level: applicant.education_level,
          instagram_url: applicant.instagram_url,
          motivation: applicant.hr_notes,
          domicile: applicant.domicile,
          position_applied: applicant.position_applied,
        }
      })

      await supabase.from('applicant_quest_scores')
        .update({
          ...result,
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('applicant_id', item.applicant_id)

      await supabase.from('applicants')
        .update({ quest_score: result.overall_score })
        .eq('id', item.applicant_id)

      processed++
    } catch {
      await supabase.from('applicant_quest_scores')
        .update({ status: 'failed' })
        .eq('applicant_id', item.applicant_id)
    }
  }

  return NextResponse.json({ processed, remaining: (pending.length - processed) })
}