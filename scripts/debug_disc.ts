import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  const { data: applicants, error: aError } = await supabase
    .from('applicants')
    .select('id, full_name')
    .ilike('full_name', '%Fetris%')
  
  if (aError) { console.error('A Error:', aError); return }
  console.log('Found Applicants:', applicants)

  if (applicants && applicants.length > 0) {
    const applicantIds = applicants.map(a => a.id)
    const { data: sessions, error: sError } = await supabase
      .from('disc_sessions')
      .select('*')
      .in('applicant_id', applicantIds)
    
    if (sError) { console.error('S Error:', sError); return }
    console.log('Sessions for Fetris:', sessions)
  }

  const { data: allSessions, error: allSerror } = await supabase
    .from('disc_sessions')
    .select('*')
  
  if (allSerror) { console.error('All S Error:', allSerror); return }
  console.log('All Sessions Count:', allSessions?.length)
  console.log('Sessions status breakdown:', 
    allSessions?.reduce((acc: any, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc }, {}))
}

debug()
