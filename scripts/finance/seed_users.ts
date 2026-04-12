import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SERVICE_SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const INITIAL_USERS = [
  { email: 'selena@stradacoffee.com', name: 'Selena', role: 'finance' },
  { email: 'clara@stradacoffee.com', name: 'Clara', role: 'finance' },
  { email: 'cipta@stradacoffee.com', name: 'Cipta', role: 'finance' }
]

async function seedUsers() {
  console.log('🚀 Seeding users into BREW...')

  for (const user of INITIAL_USERS) {
    console.log(`\nChecking user: ${user.email}`)

    // 1. Create Auth User if not exists (using Admin API)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'InitialPassword123!', // You should change this immediately
      email_confirm: true
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`   - User already exists in Supabase Auth.`)
      } else {
        console.error(`   - Error creating auth user: ${authError.message}`)
      }
    } else {
      console.log(`   - Auth user created successfully.`)
    }

    // 2. Upsert into brew_users table
    const { error: dbError } = await supabase
      .from('brew_users')
      .upsert({
        email: user.email,
        full_name: user.name,
        role: user.role
      }, { onConflict: 'email' })

    if (dbError) {
      console.error(`   - Error upserting into brew_users: ${dbError.message}`)
    } else {
      console.log(`   - User details saved to brew_users table.`)
    }
  }

  console.log('\n✅ Seeding complete!')
  console.log('NOTE: Initial password for all new users is: InitialPassword123!')
}

seedUsers()
