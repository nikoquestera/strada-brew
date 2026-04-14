import { createClient as createAdminClient } from '@supabase/supabase-js'
import PRListClient from './PRListClient'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function PRListPage() {
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_KEY!)
  const { data: prs } = await db
    .from('purchase_requests')
    .select(`
      id, nomor, sumber, status, tanggal_permintaan, tanggal_dibutuhkan, catatan,
      outlets(kode, nama),
      purchase_request_lines(id, item_id, qty_diminta, satuan, tipe)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  return <PRListClient prs={prs ?? []} />
}
