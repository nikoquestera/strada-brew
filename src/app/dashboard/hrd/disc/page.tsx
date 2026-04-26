export const dynamic = "force-dynamic"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DiscSessionsClient from './DiscSessionsClient'

export default async function DiscSessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sessions, error } = await supabase
    .from('disc_sessions')
    .select(`
      id, access_code, status, sent_at, completed_at, expires_at, created_by, results,
      applicants ( id, full_name, position_applied, outlet_preference )
    `)
    .order('sent_at', { ascending: false })

  if (error) {
    console.error('[disc] supabase error:', error)
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <style>{`.disc-row:hover { background-color: #FAFAF9; }`}</style>
      <DiscSessionsClient initialSessions={(sessions ?? []) as Parameters<typeof DiscSessionsClient>[0]['initialSessions']} />
    </div>
  )
}
