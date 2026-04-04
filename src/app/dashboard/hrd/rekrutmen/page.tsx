import { createClient } from '@/lib/supabase/server'
import RekrutmenClient from './RekrutmenClient'

export default async function RekrutmenPage() {
  const supabase = await createClient()

  const { data: applicants } = await supabase
    .from('applicants')
    .select(`
      *,
      applicant_quest_scores (
        overall_score, recommendation, status, summary, strengths, concerns
      )
    `)
    .order('created_at', { ascending: false })

  return <RekrutmenClient initialApplicants={applicants || []} />
}