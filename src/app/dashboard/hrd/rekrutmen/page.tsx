import { createClient } from '@/lib/supabase/server'
import RekrutmenClient from './RekrutmenClient'

export default async function RekrutmenPage() {
  const supabase = await createClient()

  const { data: applicants, error } = await supabase
    .from('applicants')
    .select(`
      id, full_name, email, phone, position_applied,
      outlet_preference, source, pipeline_stage, quest_score,
      created_at,
      applicant_quest_scores (
        overall_score, recommendation, status, summary
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#FF4F31', fontSize: '14px' }}>Error: {error.message}</p>
      </div>
    )
  }

  return <RekrutmenClient initialApplicants={applicants || []} />
}