import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return NextResponse.json({ role: 'HRD' })
    }

    // Bypass RLS using admin client
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SERVICE_SUPABASE_KEY!
    )

    const { data: userData } = await adminSupabase
      .from('brew_users')
      .select('role')
      .ilike('email', user.email)
      .maybeSingle()

    return NextResponse.json({ role: userData?.role?.toUpperCase() || 'HRD' })
  } catch (error) {
    return NextResponse.json({ role: 'HRD' })
  }
}
