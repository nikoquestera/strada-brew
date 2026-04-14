import { createClient as createAdminClient } from '@supabase/supabase-js'
import CreatePOClient from './CreatePOClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function CreatePOPage() {
  // Only purchasing + admin can create POs
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_KEY!)

  const [{ data: outlets }, { data: vendors }, { data: items }] = await Promise.all([
    db.from('outlets').select('id, kode, nama').eq('aktif', true).order('kode'),
    db.from('vendors').select('id, kode, nama, kategori').eq('aktif', true).order('nama'),
    db.from('items').select('id, kode_accurate, kode_quinos, nama, tipe, satuan, gudang_sumber, vendor_id').eq('aktif', true).order('nama'),
  ])

  return (
    <CreatePOClient
      outlets={outlets ?? []}
      vendors={vendors ?? []}
      items={items ?? []}
    />
  )
}
