import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import axios from 'axios'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.json({ error: `Authorization failed: ${error}` }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = process.env.ACCURATE_OAUTH_CLIENT_ID
  const clientSecret = process.env.ACCURATE_OAUTH_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://brew.stradacoffee.com'}/api/accurate/callback`

  try {
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    
    const response = await axios.post('https://account.accurate.id/oauth/token', 
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    const { access_token, refresh_token, expires_in } = response.data
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    const { error: upsertError } = await supabase
      .from('accurate_tokens')
      .upsert({
        user_id: user.id,
        access_token,
        refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })

    if (upsertError) {
      throw new Error(`Database error: ${upsertError.message}`)
    }

    // Redirect back to finance dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://brew.stradacoffee.com'}/dashboard/finance/revenue-store?accurate=connected`)

  } catch (err: any) {
    console.error('Accurate Callback Error:', err.response?.data || err.message)
    return NextResponse.json({ 
      error: 'Failed to exchange token', 
      details: err.response?.data || err.message 
    }, { status: 500 })
  }
}
