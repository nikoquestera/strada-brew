import { createClient as createAdminClient } from '@supabase/supabase-js'
import PriceImportClient from './PriceImportClient'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function PriceImportPage() {
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_KEY!)
  const { data: vendors } = await db
    .from('vendors')
    .select('id, kode, nama, kategori')
    .eq('aktif', true)
    .order('nama')

  return <PriceImportClient vendors={vendors ?? []} />
}
