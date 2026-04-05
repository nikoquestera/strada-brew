import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ApplicantDetailClient from './ApplicantDetailClient'

export default async function ApplicantDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Core applicant data - no applicant_activities (table may not exist)
  const { data: applicant, error } = await supabase
    .from('applicants')
    .select(`
      id, full_name, email, phone, birth_date, domicile,
      instagram_url, position_applied, outlet_preference,
      source, pipeline_stage, quest_score, created_at,
      has_cafe_experience, cafe_experience_years,
      cafe_experience_detail, has_barista_cert, cert_detail,
      education_level, hr_notes, status,
      applicant_quest_scores (*)
    `)
    .eq('id', params.id)
    .single()

  if (error || !applicant) {
    console.error('Applicant fetch error:', error)
    notFound()
  }

  // Try to get activities - graceful fallback if table doesn't exist
  const activitiesResult = await supabase
    .from('applicant_activities')
    .select('*')
    .eq('applicant_id', params.id)
    .order('created_at', { ascending: false })
    .then(r => r)
    .catch(() => ({ data: [] }))

  const applicantWithActivities = {
    ...applicant,
    applicant_activities: activitiesResult.data || []
  }

  return <ApplicantDetailClient applicant={applicantWithActivities} />
}