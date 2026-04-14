import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import GRDetailClient from './GRDetailClient'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function GRDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_KEY!)

  const [{ data: gr }, { data: userData }] = await Promise.all([
    db.from('goods_receipts')
      .select(`
        *,
        outlets(kode, nama),
        purchase_orders(
          id, nomor, tipe, total_nilai,
          vendors(nama),
          purchase_order_lines(
            id, qty_order, satuan, harga_satuan, total_harga,
            items(id, nama, kode_accurate, tipe)
          )
        ),
        goods_receipt_lines(
          id, po_line_id, qty_diterima, satuan, harga_aktual, total_aktual, alasan_selisih, catatan,
          items(id, nama, kode_accurate)
        )
      `)
      .eq('id', id)
      .single(),
    db.from('brew_users').select('id, role').ilike('email', user.email ?? '').maybeSingle(),
  ])

  if (!gr) notFound()

  // If GR has no lines yet, pre-populate from PO lines
  const poLines = (gr.purchase_orders as any)?.purchase_order_lines ?? []
  const existingGRLines = (gr.goods_receipt_lines as any[]) ?? []

  return (
    <GRDetailClient
      gr={gr}
      poLines={poLines}
      existingGRLines={existingGRLines}
      userRole={userData?.role?.toLowerCase() ?? ''}
      userId={userData?.id ?? ''}
    />
  )
}
