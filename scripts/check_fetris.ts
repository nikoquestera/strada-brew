import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yalgiinueczpmrolisdd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbGdpaW51ZWN6cG1yb2xpc2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjE2NDksImV4cCI6MjA5MDc5NzY0OX0.x81uSt8iMz7pMqtuwRWvLWI45QZg-8KvWZSJrHFrEgo'
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
    console.log('Sessions for Fetris:', JSON.stringify(sessions, null, 2))
  }
}

debug()
