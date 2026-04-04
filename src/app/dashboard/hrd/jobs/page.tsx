import { createClient } from '@/lib/supabase/server'
import JobsClient from './JobsClient'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: jobs } = await supabase
    .from('job_postings')
    .select('*')
    .order('created_at', { ascending: false })

  return <JobsClient initialJobs={jobs || []} />
}