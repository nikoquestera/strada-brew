import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'

// Support both env var naming conventions
const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function HRDLayout({ children }: { children: React.ReactNode }) {
  let userEmail = ''
  let redirectTo: string | null = null

  // Step 1: Verify the user is authenticated
  let user: any = null
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      redirect('/login')
    }
    user = data.user
  } catch {
    redirect('/login')
  }

  // Step 2: Check role via admin client
  // If admin client fails for any reason, treat user as HRD (don't redirect to /login)
  // so we never create a redirect loop with the proxy.
  userEmail = user.email ?? ''
  try {
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      SERVICE_KEY!
    )
    const { data: userData } = await adminSupabase
      .from('brew_users')
      .select('role')
      .ilike('email', user.email || '')
      .maybeSingle()

    if (userData?.role?.toUpperCase() === 'FINANCE') {
      redirectTo = '/dashboard/finance'
    }
    // Otherwise user is HRD or unknown — let them through
  } catch (err) {
    // Admin client unavailable — treat as HRD, don't redirect to /login
    console.error('[hrd/layout] admin role check failed:', err)
  }

  if (redirectTo) redirect(redirectTo)

  return (
    <DashboardShell userEmail={userEmail}>
      {children}
    </DashboardShell>
  )
}
