/**
 * One-time script: creates Supabase Auth users for everyone in brew_users table.
 *
 * Usage:
 *   npx tsx scripts/setup-auth-users.ts
 *
 * What it does:
 *   - Reads all rows from brew_users (email + role)
 *   - Creates a Supabase Auth account for each with password "strada" and email pre-confirmed
 *   - Skips users that already exist in Auth
 *
 * Run from the project root. Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SERVICE_SUPABASE_KEY  (service role key — never the anon key)
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local manually (no dotenv dependency needed)
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SERVICE_SUPABASE_KEY
const DEFAULT_PASSWORD = 'strada'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SERVICE_SUPABASE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  console.log('Reading brew_users table...\n')

  const { data: users, error } = await supabase
    .from('brew_users')
    .select('email, role')
    .order('email')

  if (error) {
    console.error('Failed to read brew_users:', error.message)
    process.exit(1)
  }

  if (!users || users.length === 0) {
    console.log('No users found in brew_users table.')
    return
  }

  console.log(`Found ${users.length} user(s) in brew_users:\n`)

  for (const user of users) {
    const email = user.email?.toLowerCase()
    const role = user.role?.toUpperCase()

    if (!email) {
      console.warn(`  SKIP — missing email for row:`, user)
      continue
    }

    process.stdout.write(`  ${email} (${role}) ... `)

    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,  // skip email verification
    })

    if (createError) {
      const alreadyExists =
        createError.message.toLowerCase().includes('already been registered') ||
        createError.message.toLowerCase().includes('already exists')

      if (alreadyExists) {
        // Find the existing user and reset their password
        const { data: list } = await supabase.auth.admin.listUsers()
        const existing = list?.users?.find(u => u.email?.toLowerCase() === email)
        if (existing) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existing.id,
            { password: DEFAULT_PASSWORD, email_confirm: true }
          )
          if (updateError) {
            console.log(`ERROR resetting password: ${updateError.message}`)
          } else {
            console.log(`password reset to "strada" (id: ${existing.id})`)
          }
        } else {
          console.log('already exists — could not locate to reset password')
        }
      } else {
        console.log(`ERROR: ${createError.message}`)
      }
    } else {
      console.log(`created (id: ${data.user?.id})`)
    }
  }

  console.log('\nDone. Users can log in with their email and password "strada".')
  console.log('They can change their password from inside the dashboard.')
}

main()
