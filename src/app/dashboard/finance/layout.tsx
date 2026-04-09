import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FinanceLayout from './layout-client'

export default async function FinanceDashboardLayout({ children }: { children: React.ReactNode }) {
  let userEmail = ''

  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')
    
    // Verify user is finance staff
    if (user.email?.toLowerCase() !== 'selena@stradacoffee.com') {
      // For now, allow other users but they can be restricted later
      // redirect('/login')
    }
    
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
