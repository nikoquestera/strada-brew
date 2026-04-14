import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

// POST /api/purchasing/parstock-agent
// Protected by Authorization: Bearer {CRON_SECRET}
// Called daily at 08:00 WIB (01:00 UTC) via Vercel Cron
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SERVICE_KEY!
  )

  const today = new Date().toISOString().slice(0, 10)
  let prs_created = 0
  let items_checked = 0
  let items_skipped_inactive = 0
  let items_skipped_sufficient = 0

  // Get all warehouse stock entries
  const { data: stockItems, error: stockErr } = await supabase
    .from('warehouse_stock')
    .select('id, item_id, gudang, qty_saat_ini, satuan, par_stock_calculated')

  if (stockErr) {
    console.error('[parstock-agent] stock fetch error:', stockErr)
    return NextResponse.json({ error: stockErr.message }, { status: 500 })
  }

  if (!stockItems || stockItems.length === 0) {
    return NextResponse.json({ prs_created: 0, items_checked: 0, items_skipped_inactive: 0, items_skipped_sufficient: 0 })
  }

  for (const stock of stockItems) {
    items_checked++

    // Try 14-day window first
    let windowDays = 14
    let parStock: number | null = null
    let avgUsage: number | null = null

    for (const days of [14, 28, 90]) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      const { data: poLines } = await supabase
        .from('purchase_order_lines')
        .select('qty_order, purchase_orders!inner(tanggal_po, status)')
        .eq('item_id', stock.item_id)
        .gte('purchase_orders.tanggal_po', since)
        .not('purchase_orders.status', 'eq', 'cancelled')

      const totalOrdered = (poLines ?? []).reduce((sum: number, l: any) => sum + Number(l.qty_order), 0)

      if (totalOrdered > 0) {
        windowDays = days
        avgUsage = totalOrdered / days
        // Par stock = enough for 14 days based on this window's demand rate
        parStock = Math.ceil((totalOrdered / days) * 14)
        break
      }
    }

    if (parStock === null) {
      // No orders in 90 days → inactive
      items_skipped_inactive++
      await supabase.from('parstock_agent_log').insert({
        run_date: today,
        item_id: stock.item_id,
        gudang: stock.gudang,
        window_days: 90,
        avg_usage_per_day: null,
        par_stock_calculated: null,
        qty_at_time_of_check: stock.qty_saat_ini,
        action_taken: 'skipped_inactive',
      })
      continue
    }

    // Update warehouse_stock with new par stock
    const par_stock_effective = parStock
    await supabase
      .from('warehouse_stock')
      .update({
        par_stock_calculated: parStock,
        par_stock_effective,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stock.id)

    if (stock.qty_saat_ini >= parStock) {
      items_skipped_sufficient++
      await supabase.from('parstock_agent_log').insert({
        run_date: today,
        item_id: stock.item_id,
        gudang: stock.gudang,
        window_days: windowDays,
        avg_usage_per_day: avgUsage,
        par_stock_calculated: parStock,
        qty_at_time_of_check: stock.qty_saat_ini,
        action_taken: 'skipped_sufficient',
      })
      continue
    }

    // Check if there's already an open PR or PO for this item
    const { data: existingPR } = await supabase
      .from('purchase_request_lines')
      .select('id, purchase_requests!inner(status)')
      .eq('item_id', stock.item_id)
      .in('purchase_requests.status', ['draft', 'reviewed'])
      .limit(1)

    const { data: existingPO } = await supabase
      .from('purchase_order_lines')
      .select('id, purchase_orders!inner(status)')
      .eq('item_id', stock.item_id)
      .in('purchase_orders.status', ['draft', 'pending_approval', 'approved', 'sent_vendor', 'partial_received'])
      .limit(1)

    if ((existingPR && existingPR.length > 0) || (existingPO && existingPO.length > 0)) {
      items_skipped_sufficient++
      continue
    }

    // Fetch item details for PR
    const { data: item } = await supabase
      .from('items')
      .select('tipe, satuan, gudang_sumber')
      .eq('id', stock.item_id)
      .single()

    if (!item) continue

    // Generate PR number
    const prNumRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/purchasing/po-number?prefix=PR`,
      { headers: { authorization: authHeader || '' } }
    )
    const { nomor: prNomor } = await prNumRes.json()

    // Need an outlet — use HO as default for warehouse auto-PRs
    const { data: hoOutlet } = await supabase
      .from('outlets')
      .select('id')
      .eq('kode', 'HO')
      .single()

    const qtyNeeded = Math.ceil(parStock - stock.qty_saat_ini)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { data: newPR, error: prErr } = await supabase
      .from('purchase_requests')
      .insert({
        nomor: prNomor,
        outlet_id: hoOutlet?.id,
        tanggal_permintaan: today,
        tanggal_dibutuhkan: tomorrow,
        sumber: 'auto_parstock',
        status: 'draft',
        catatan: `Auto-generated by par stock agent. Stok: ${stock.qty_saat_ini} ${stock.satuan}, Par: ${parStock} ${stock.satuan}`,
      })
      .select('id')
      .single()

    if (prErr || !newPR) {
      console.error('[parstock-agent] PR create error:', prErr)
      continue
    }

    await supabase.from('purchase_request_lines').insert({
      pr_id: newPR.id,
      item_id: stock.item_id,
      qty_diminta: qtyNeeded,
      satuan: stock.satuan,
      tipe: item.tipe,
      gudang_sumber: item.gudang_sumber,
    })

    await supabase.from('parstock_agent_log').insert({
      run_date: today,
      item_id: stock.item_id,
      gudang: stock.gudang,
      window_days: windowDays,
      avg_usage_per_day: avgUsage,
      par_stock_calculated: parStock,
      qty_at_time_of_check: stock.qty_saat_ini,
      action_taken: 'pr_created',
      pr_id: newPR.id,
    })

    prs_created++
  }

  console.log(`[parstock-agent] Done: ${prs_created} PRs created, ${items_checked} items checked, ${items_skipped_inactive} inactive, ${items_skipped_sufficient} sufficient`)

  return NextResponse.json({
    prs_created,
    items_checked,
    items_skipped_inactive,
    items_skipped_sufficient,
  })
}
