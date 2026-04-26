export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CfitSessionsClient from './CfitSessionsClient'

interface CfitSessionRaw {
  id: string
  access_code: string
  status: string
  sent_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  score?: number | null
  total_points?: number | null
  applicants?: {
    id?: string
    full_name?: string | null
    position_applied?: string | null
    outlet_preference?: string | null
  } | null
  tests?: { title?: string | null } | null
}

export default async function CfitSessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sessions, error } = await supabase
    .from('applicant_tests')
    .select(`
      id, access_code, status, sent_at, started_at, completed_at, score, total_points,
      applicants ( id, full_name, position_applied, outlet_preference ),
      tests ( title )
    `)
    .order('sent_at', { ascending: false })

  if (error) {
    console.error('[cfit] supabase error:', error)
  }

  const list = ((sessions || []) as CfitSessionRaw[]).filter((item) => {
    const test = Array.isArray(item.tests) ? item.tests[0] : item.tests
    return test?.title === 'Tes Intelegensi'
  })

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '32px 24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <style>{`.cfit-row:hover { background-color: #FAFAF9; }`}</style>
      <CfitSessionsClient initialSessions={list} />
    </div>
  )
}
