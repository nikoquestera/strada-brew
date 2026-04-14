import { createClient as createAdminClient } from '@supabase/supabase-js'
import KamusHargaClient from './KamusHargaClient'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function KamusHargaPage() {
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_KEY!)

  const [{ data: vendors }, { data: prices }] = await Promise.all([
    db.from('vendors').select('id, kode, nama, kategori').eq('aktif', true).order('nama'),
    db.from('kamus_harga_aktif').select('*').order('nama_item'),
  ])

  return <KamusHargaClient vendors={vendors ?? []} prices={prices ?? []} />
}
