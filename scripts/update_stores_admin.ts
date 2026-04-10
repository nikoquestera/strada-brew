import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SERVICE_SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function updateStores() {
  const allowedStores = ['LA.PIAZZA', 'MKG', 'SMB', 'SMB GOLD LOUNGE', 'SMS']
  
  // First, deactivate all stores
  const { error: err1 } = await supabase.from('stores').update({ is_active: false }).neq('name', '')
  if (err1) {
    console.error('Error deactivating stores:', err1)
    return
  }
  
  // Upsert the allowed ones
  for (let i = 0; i < allowedStores.length; i++) {
    const store = allowedStores[i]
    const { error: err2 } = await supabase.from('stores').upsert({
      name: store,
      is_active: true,
      sort_order: (i + 1) * 10
    }, { onConflict: 'name' })
    if (err2) {
      console.error(`Error upserting ${store}:`, err2)
    }
  }
  
  console.log('Stores updated successfully in Supabase.')
}

updateStores()
