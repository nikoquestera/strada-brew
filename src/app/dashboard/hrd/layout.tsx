import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'

export default async function HRDLayout({ children }: { children: React.ReactNode }) {
  let userEmail = ''

  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')
    userEmail = user?.email ?? ''
  } catch {
    redirect('/login')
  }

  return (
    <DashboardShell userEmail={userEmail}>
      {children}
    </DashboardShell>
  )
}