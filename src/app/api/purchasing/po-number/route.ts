import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

const TYPE_CODES: Record<string, string> = {
  fresh: 'FSH',
  dry_goods: 'DRY',
  frozen: 'FRZ',
  packaging: 'PKG',
  roastery: 'RST',
}

const TABLE_MAP: Record<string, string> = {
  PO: 'purchase_orders',
  PR: 'purchase_requests',
  GR: 'goods_receipts',
}

// GET /api/purchasing/po-number?prefix=PO&tipe=fresh
// Returns next sequential number like PO-20260414-FSH-001
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const prefix = (searchParams.get('prefix') || 'PO').toUpperCase()
  const tipe = searchParams.get('tipe') || ''

  if (!TABLE_MAP[prefix]) {
    return NextResponse.json({ error: `Invalid prefix: ${prefix}` }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SERVICE_KEY!
  )

  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')  // YYYYMMDD
  const typeCode = TYPE_CODES[tipe] ?? ''
  const pattern = typeCode
    ? `${prefix}-${dateStr}-${typeCode}-%`
    : `${prefix}-${dateStr}-%`

  const table = TABLE_MAP[prefix]
  const { data, error } = await supabase
    .from(table)
    .select('nomor')
    .ilike('nomor', pattern)
    .order('nomor', { ascending: false })
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let seq = 1
  if (data && data.length > 0) {
    const lastNomor = data[0].nomor as string
    const parts = lastNomor.split('-')
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastSeq)) seq = lastSeq + 1
  }

  const seqStr = seq.toString().padStart(3, '0')
  const nomor = typeCode
    ? `${prefix}-${dateStr}-${typeCode}-${seqStr}`
    : `${prefix}-${dateStr}-${seqStr}`

  return NextResponse.json({ nomor })
}
