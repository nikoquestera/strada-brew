import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import FinanceLayout from './layout-client'

// Support both env var naming conventions
const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function FinanceDashboardLayout({ children }: { children: React.ReactNode }) {
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
  // If admin client fails for any reason, redirect to HRD (not /login)
  // so we never create a redirect loop with the proxy.
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

    if (userData?.role?.toUpperCase() !== 'FINANCE') {
      redirectTo = '/dashboard/hrd'
    } else {
      userEmail = user.email ?? ''
    }
  } catch (err) {
    // Admin client unavailable — redirect to HRD, not /login
    console.error('[finance/layout] admin role check failed:', err)
    redirectTo = '/dashboard/hrd'
  }

  if (redirectTo) redirect(redirectTo)

  return (
    <FinanceLayout userEmail={userEmail}>
      {children}
    </FinanceLayout>
  )
}
