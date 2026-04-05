import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import JobDetailClient from './JobDetailClient'

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !job) notFound()

  const { data: applicants } = await supabase
    .from('applicants')
    .select('id, full_name, pipeline_stage, created_at, applicant_quest_scores(overall_score, status, recommendation)')
    .eq('job_posting_id', params.id)
    .order('created_at', { ascending: false })

  return <JobDetailClient job={job} applicants={applicants || []} />
}