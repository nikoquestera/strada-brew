import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ApplicantDetailClient from './ApplicantDetailClient'

export default async function ApplicantDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: applicant } = await supabase
    .from('applicants')
    .select(`
      *,
      applicant_quest_scores (*),
      applicant_activities (*, brew_users(full_name))
    `)
    .eq('id', params.id)
    .single()

  if (!applicant) notFound()

  return <ApplicantDetailClient applicant={applicant} />
}