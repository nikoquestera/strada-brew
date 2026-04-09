import { createClient } from '@supabase/supabase-js'

function decodeJwtPayload(token: string) {
  const [, payload] = token.split('.')

  if (!payload) {
    throw new Error('SERVICE_SUPABASE_KEY is not a valid JWT')
  }

  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { ref?: string }
}

function getProjectRefFromUrl(url: string) {
  const host = new URL(url).hostname
  return host.split('.')[0] ?? ''
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SERVICE_SUPABASE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SERVICE_SUPABASE_KEY')
  }

  const expectedRef = getProjectRefFromUrl(url)
  const serviceRef = decodeJwtPayload(serviceKey).ref ?? ''

  if (serviceRef !== expectedRef) {
    throw new Error(
      `SERVICE_SUPABASE_KEY project mismatch: expected ${expectedRef}, got ${serviceRef || 'unknown'}`
    )
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
