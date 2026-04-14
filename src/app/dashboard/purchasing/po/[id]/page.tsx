import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PODetailClient from './PODetailClient'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_KEY!)

  const [{ data: po }, { data: userData }] = await Promise.all([
    db.from('purchase_orders')
      .select(`
        *,
        outlets(id, kode, nama),
        vendors(id, nama, kontak_wa, kontak_email),
        purchase_order_lines(
          id, qty_order, satuan, harga_satuan, total_harga, qty_received, catatan,
          items(id, nama, kode_accurate, tipe, satuan)
        ),
        brew_users!purchase_orders_created_by_fkey(full_name, email, role),
        approved_by_user:brew_users!purchase_orders_approved_by_fkey(full_name, email)
      `)
      .eq('id', id)
      .single(),
    db.from('brew_users').select('id, role').ilike('email', user.email ?? '').maybeSingle(),
  ])

  if (!po) notFound()

  // Risk analysis: check if any prices have changed by > 5% since PO was created
  let priceChanges: { nama: string; harga_po: number; harga_sekarang: number; delta_pct: number }[] = []
  const lines = (po.purchase_order_lines as any[]) ?? []
  if (lines.length > 0 && po.vendor_id) {
    for (const line of lines) {
      const { data: currentPrice } = await db
        .from('kamus_harga_aktif')
        .select('harga_beli')
        .eq('item_id', line.item_id ?? line.items?.id)
        .eq('vendor_id', po.vendor_id)
        .maybeSingle()
      if (currentPrice?.harga_beli && line.harga_satuan) {
        const delta = ((currentPrice.harga_beli - line.harga_satuan) / line.harga_satuan) * 100
        if (Math.abs(delta) > 5) {
          priceChanges.push({
            nama: line.items?.nama ?? '',
            harga_po: line.harga_satuan,
            harga_sekarang: currentPrice.harga_beli,
            delta_pct: Math.round(delta),
          })
        }
      }
    }
  }

  return (
    <PODetailClient
      po={po}
      userRole={userData?.role?.toLowerCase() ?? ''}
      userId={userData?.id ?? ''}
      priceChanges={priceChanges}
    />
  )
}
