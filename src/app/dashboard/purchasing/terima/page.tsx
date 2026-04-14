import { createClient as createAdminClient } from '@supabase/supabase-js'
import GRListClient from './GRListClient'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function GRListPage() {
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_KEY!)
  const { data: grs } = await db
    .from('goods_receipts')
    .select(`
      id, nomor, status, tanggal_terima, penerima, surat_jalan_nomor, invoice_nomor, surat_jalan_url,
      outlets(kode, nama),
      purchase_orders(nomor, tipe, vendors(nama))
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  return <GRListClient grs={grs ?? []} />
}
