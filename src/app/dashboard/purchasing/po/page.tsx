import { createClient as createAdminClient } from '@supabase/supabase-js'
import POListClient from './POListClient'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function POListPage() {
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_KEY!)

  const [{ data: outlets }, { data: vendors }] = await Promise.all([
    db.from('outlets').select('id, kode, nama').eq('aktif', true).order('kode'),
    db.from('vendors').select('id, kode, nama, kategori').eq('aktif', true).order('nama'),
  ])

  return <POListClient outlets={outlets ?? []} vendors={vendors ?? []} />
}
