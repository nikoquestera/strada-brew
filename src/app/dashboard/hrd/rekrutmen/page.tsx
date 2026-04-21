import { createClient } from '@/lib/supabase/server'
import RekrutmenClient from './RekrutmenClient'

export const dynamic = 'force-dynamic'

export default async function RekrutmenPage() {
  const supabase = await createClient()

  const { data: applicants, error } = await supabase
    .from('applicants')
    .select(`
      id, full_name, email, phone, position_applied,
      outlet_preference, source, pipeline_stage, quest_score,
      created_at,
      applicant_quest_scores (
        id, overall_score, recommendation, status, summary, processed_at
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('[RekrutmenPage] Fetch error:', error)
  }

  return <RekrutmenClient initialApplicants={applicants || []} />
}
