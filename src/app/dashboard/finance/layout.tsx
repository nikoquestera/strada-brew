import { createClient } from '@/lib/supabase/server'
import { isFinanceUser } from '@/lib/auth/access'
import { redirect } from 'next/navigation'
import FinanceLayout from './layout-client'

export default async function FinanceDashboardLayout({ children }: { children: React.ReactNode }) {
  let userEmail = ''

  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')

    if (!isFinanceUser(user.email)) redirect('/dashboard/hrd')

    userEmail = user?.email ?? ''
  } catch {
    redirect('/login')
  }

  return (
    <FinanceLayout userEmail={userEmail}>
      {children}
    </FinanceLayout>
  )
}
