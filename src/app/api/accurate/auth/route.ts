import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = process.env.ACCURATE_OAUTH_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://brew.stradacoffee.com'}/api/accurate/callback`
  const scope = 'account_view company_data journal_voucher_save' // Add needed scopes

  if (!clientId) {
    return NextResponse.json({ error: 'ACCURATE_OAUTH_CLIENT_ID not configured' }, { status: 500 })
  }

  const authUrl = `https://account.accurate.id/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`

  return NextResponse.redirect(authUrl)
}
