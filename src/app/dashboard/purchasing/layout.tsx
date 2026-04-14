import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import PurchasingShell from '@/components/PurchasingShell'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

// Roles that have any access to the purchasing module
const PURCHASING_ROLES = ['purchasing', 'warehouse', 'roastery', 'purchasing_approver', 'finance', 'admin']

export default async function PurchasingLayout({ children }: { children: React.ReactNode }) {
  let userEmail = ''
  let userRole = ''
  let redirectTo: string | null = null

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

    const role = userData?.role?.toLowerCase() ?? ''
    userRole = role

    if (!PURCHASING_ROLES.includes(role)) {
      // HRD or unknown → send to HRD dashboard
      redirectTo = '/dashboard/hrd'
    }
  } catch (err) {
    console.error('[purchasing/layout] admin role check failed:', err)
    // If admin client fails, let them through to avoid locking out
    userRole = 'purchasing'
  }

  if (redirectTo) redirect(redirectTo)

  return (
    <PurchasingShell userEmail={userEmail} userRole={userRole}>
      {children}
    </PurchasingShell>
  )
}
