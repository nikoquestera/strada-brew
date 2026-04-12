import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import FinanceLayout from './layout-client'

export default async function FinanceDashboardLayout({ children }: { children: React.ReactNode }) {
  let userEmail = ''
  let redirectTo: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      redirectTo = '/login'
    } else {
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

      if (userData?.role?.toUpperCase() !== 'FINANCE') {
        redirectTo = '/dashboard/hrd'
      } else {
        userEmail = user.email ?? ''
      }
    }
  } catch {
    redirectTo = '/login'
  }

  if (redirectTo) redirect(redirectTo)

  return (
    <FinanceLayout userEmail={userEmail}>
      {children}
    </FinanceLayout>
  )
}
