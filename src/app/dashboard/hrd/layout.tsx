import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'

export default async function HRDLayout({ children }: { children: React.ReactNode }) {
  let userEmail = ''

  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')
    
    // Check role in database securely using admin client to bypass RLS
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SERVICE_SUPABASE_KEY!
    )

    const { data: userData } = await adminSupabase
      .from('brew_users')
      .select('role')
      .ilike('email', user.email || '')
      .maybeSingle()
    
    if (userData?.role?.toUpperCase() === 'FINANCE') {
      redirect('/dashboard/finance')
    }
    
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
