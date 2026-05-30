import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  // Step 1: Verify authentication
  let user: { email?: string } | null = null
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) redirect('/login')
    user = data.user
  } catch {
    redirect('/login')
  }

  const userEmail = user?.email ?? ''
  let redirectTo: string | null = null

  // Step 2: Check role via admin client
  try {
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      SERVICE_KEY!
    )
    const { data: userData } = await adminSupabase
      .from('brew_users')
      .select('role')
      .ilike('email', userEmail)
      .maybeSingle()

    const role = userData?.role?.toLowerCase() ?? ''

    // Only ops_manager and admin may access this module
    if (role === 'hrd') {
      redirectTo = '/dashboard/hrd'
    } else if (role === 'finance') {
      redirectTo = '/dashboard/finance'
    } else if (['purchasing', 'warehouse', 'roastery', 'purchasing_approver'].includes(role)) {
      redirectTo = '/dashboard/purchasing'
    }
    // ops_manager, admin, or unknown → let through
  } catch (err) {
    console.error('[ops/layout] admin role check failed:', err)
    // Don't block on failure — let through
  }

  if (redirectTo) redirect(redirectTo)

  return (
    <DashboardShell userEmail={userEmail} role="ops_manager">
      {children}
    </DashboardShell>
  )
}
