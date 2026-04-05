import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ApplicantDetailClient from './ApplicantDetailClient'

export default async function ApplicantDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: applicant, error } = await supabase
    .from('applicants')
    .select(`
      id, full_name, email, phone, birth_date, domicile,
      instagram_url, position_applied, outlet_preference,
      source, pipeline_stage, quest_score, created_at,
      has_cafe_experience, cafe_experience_years,
      cafe_experience_detail, has_barista_cert, cert_detail,
      education_level, hr_notes, status,
      applicant_quest_scores (*),
      applicant_activities (*)
    `)
    .eq('id', params.id)
    .single()

  if (error || !applicant) notFound()

  return <ApplicantDetailClient applicant={applicant} />
}
