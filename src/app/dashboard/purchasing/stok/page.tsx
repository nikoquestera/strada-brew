import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StokClient from './StokClient'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function StokPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_KEY!)

  const [{ data: aaronStock }, { data: ndahStock }, { data: userData }] = await Promise.all([
    db.from('warehouse_stock')
      .select('id, qty_saat_ini, satuan, par_stock_calculated, par_stock_effective, is_below_par, last_synced_at, updated_at, items(id, nama, kode_accurate, kategori, tipe, par_stock_override)')
      .eq('gudang', 'aaron')
      .order('is_below_par', { ascending: false }),
    db.from('warehouse_stock')
      .select('id, qty_saat_ini, satuan, par_stock_calculated, par_stock_effective, is_below_par, last_synced_at, updated_at, items(id, nama, kode_accurate, kategori, tipe, par_stock_override)')
      .eq('gudang', 'ndah')
      .order('is_below_par', { ascending: false }),
    db.from('brew_users').select('id, role').ilike('email', user.email ?? '').maybeSingle(),
  ])

  return (
    <StokClient
      aaronStock={(aaronStock ?? []) as any}
      ndahStock={(ndahStock ?? []) as any}
      userRole={userData?.role?.toLowerCase() ?? ''}
      userId={userData?.id ?? ''}
    />
  )
}
