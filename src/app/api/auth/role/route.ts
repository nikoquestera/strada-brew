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
    const serviceKey =
      process.env.SERVICE_SUPABASE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey!
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
