/**
 * mass_create_jurnal.ts
 *
 * Buat massal Jurnal Penjualan + Uang Masuk ke Accurate dari CSV sederhana.
 *
 * Usage:
 *   npx ts-node -e "require('dotenv').config({path:'.env.local'})" scripts/finance/mass_create_jurnal.ts
 *   npx ts-node -e "require('dotenv').config({path:'.env.local'})" scripts/finance/mass_create_jurnal.ts ./scripts/finance/MASS_INPUT_MKG_TEST.csv
 *
 * Format CSV (lihat mass_jurnal_template.csv untuk contoh):
 *   TANGGAL,TOKO,CASH,KREDIT BCA,DEBIT BCA,QRIS BCA,DEBIT,DEBIT BRI,KREDIT BRI,TRANSFER,GO-BIZ,OVO
 *   1/1/25,MKG,,261.949,615.653,1.697.171,,,,,,
 *
 * Kolom pembayaran di CSV = jumlah bank settlement (income).
 * Data penjualan (kredit jurnal) diambil dari tabel daily_revenue Supabase.
 * Jika daily_revenue belum ada untuk tanggal tersebut → baris dilewati.
 *
 * Kolom DEBIT        → digabung ke payment_debit_bca (non-BCA debit card)
 * Kolom DEBIT BRI    → digabung ke payment_transfer
 * Kolom KREDIT BRI   → digabung ke payment_transfer
 */

import axios from 'axios'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as dotenv from 'dotenv'
import { ACCURATE_MAPPING } from '../../src/lib/finance/accurate-mapping'
import { fetchQuinosRevenue } from '../../src/lib/finance/quinos'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SERVICE_SUPABASE_KEY!
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDate(raw: string): string {
  // Handles: 1/1/25, 01/01/25, 1/1/2025, 01/01/2025
  const parts = raw.trim().split('/')
  if (parts.length !== 3) throw new Error(`Format tanggal tidak dikenali: "${raw}"`)
  const [d, m, y] = parts
  const year = y.length === 2 ? `20${y}` : y
  return `${year}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`
}

function toAccurateDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function parseNum(raw: string): number {
  if (!raw || !raw.trim()) return 0
  // Indonesian format: 1.697.171 → remove dots, replace comma with dot for decimals
  return parseFloat(raw.trim().replace(/\./g, '').replace(',', '.')) || 0
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, ans => { rl.close(); resolve(ans.trim().toLowerCase() === 'y') })
  })
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

interface CsvRow {
  date: string          // YYYY-MM-DD
  store: string
  income: {
    payment_cash: number
    payment_credit_bca: number
    payment_debit_bca: number
    payment_qris: number
    payment_gobiz: number
    payment_ovo: number
    payment_transfer: number
  }
}

function parseCSV(filePath: string): CsvRow[] {
  const lines = fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))

  if (lines.length < 2) throw new Error('CSV kosong atau hanya header.')

  const headers = lines[0].split(',').map(h => h.trim().toUpperCase())
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const get = (colName: string) => {
      const idx = headers.indexOf(colName)
      return idx >= 0 ? parseNum(cols[idx]) : 0
    }

    const tanggal = cols[headers.indexOf('TANGGAL')]?.trim()
    const toko = cols[headers.indexOf('TOKO')]?.trim()

    if (!tanggal || !toko) {
      console.warn(`  ⚠️  Baris ${i + 1}: TANGGAL atau TOKO kosong, dilewati.`)
      continue
    }

    let date: string
    try { date = parseDate(tanggal) } catch (e: any) {
      console.warn(`  ⚠️  Baris ${i + 1}: ${e.message}, dilewati.`)
      continue
    }

    // DEBIT and DEBIT BRI/KREDIT BRI are merged into their closest mapping
    rows.push({
      date,
      store: toko,
      income: {
        payment_cash:       get('CASH'),
        payment_credit_bca: get('KREDIT BCA'),
        payment_debit_bca:  get('DEBIT BCA') + get('DEBIT'),   // non-BCA debit merged
        payment_qris:       get('QRIS BCA'),
        payment_gobiz:      get('GO-BIZ'),
        payment_ovo:        get('OVO'),
        payment_transfer:   get('TRANSFER') + get('DEBIT BRI') + get('KREDIT BRI'),
      }
    })
  }

  return rows
}

// ─── Accurate Auth ───────────────────────────────────────────────────────────

async function getAccurateConnection() {
  const { data: tokenData, error } = await supabase
    .from('accurate_tokens').select('*').limit(1).maybeSingle()
  if (error || !tokenData) throw new Error('Token Accurate tidak ditemukan di database.')

  let accessToken = tokenData.access_token

  if (new Date(tokenData.expires_at) <= new Date()) {
    console.log('Token expired, memperbarui...')
    const authHeader = Buffer.from(
      `${process.env.ACCURATE_OAUTH_CLIENT_ID}:${process.env.ACCURATE_OAUTH_CLIENT_SECRET}`
    ).toString('base64')
    const refreshRes = await axios.post(
      'https://account.accurate.id/oauth/token',
      new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokenData.refresh_token }).toString(),
      { headers: { Authorization: `Basic ${authHeader}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
    accessToken = refreshRes.data.access_token
    await supabase.from('accurate_tokens').update({
      access_token: accessToken,
      refresh_token: refreshRes.data.refresh_token,
      expires_at: new Date(Date.now() + refreshRes.data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', tokenData.id)
  }

  const dbListRes = await axios.get('https://account.accurate.id/api/db-list.do', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const dbId = dbListRes.data.d[0].id
  const sessionRes = await axios.get(`https://account.accurate.id/api/open-db.do?id=${dbId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  return {
    accessToken,
    sessionId: sessionRes.data.session,
    apiBaseUrl: `${sessionRes.data.host}/accurate`
  }
}

// ─── Journal Helpers ──────────────────────────────────────────────────────────

function addDetail(details: any[], account: string, type: 'DEBIT' | 'CREDIT', amount: number) {
  if (!account) return
  const trimmed = account.trim()
  const rounded = Math.round(amount * 100) / 100
  if (rounded <= 0) return

  const detail: any = { accountNo: trimmed, amountType: type, amount: rounded }

  const customerNo = ACCURATE_MAPPING.CUSTOMER_MAPPING[trimmed]
  if (customerNo) { detail.customerNo = customerNo; detail.subsidiaryType = 'CUSTOMER' }

  const vendorNo = ACCURATE_MAPPING.VENDOR_MAPPING[trimmed]
  if (vendorNo) { detail.vendorNo = vendorNo; detail.subsidiaryType = 'VENDOR' }

  details.push(detail)
}

async function deleteIfExists(
  description: string,
  conn: { accessToken: string; sessionId: string; apiBaseUrl: string }
) {
  try {
    const res = await axios.get(`${conn.apiBaseUrl}/api/journal-voucher/list.do`, {
      params: { fields: 'id,description', 'filter.keywords.op': 'EQUAL', 'filter.keywords.val': description },
      headers: { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }
    })
    if (res.data.s && res.data.d?.length > 0) {
      await axios.delete(`${conn.apiBaseUrl}/api/journal-voucher/delete.do`, {
        params: { id: res.data.d[0].id },
        headers: { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }
      })
      return true
    }
  } catch (_) {}
  return false
}

async function postJournal(
  memo: string,
  transDate: string,
  details: any[],
  conn: { accessToken: string; sessionId: string; apiBaseUrl: string }
) {
  const debit  = details.filter(d => d.amountType === 'DEBIT').reduce((s, d) => s + d.amount, 0)
  const credit = details.filter(d => d.amountType === 'CREDIT').reduce((s, d) => s + d.amount, 0)
  if (Math.abs(debit - credit) > 1) {
    throw new Error(`Tidak balance — D: ${debit.toLocaleString('id-ID')} K: ${credit.toLocaleString('id-ID')} (selisih ${Math.abs(debit - credit).toLocaleString('id-ID')})`)
  }

  const revised = await deleteIfExists(memo, conn)
  if (revised) console.log(`     🔄 Jurnal lama dihapus (revisi).`)

  const res = await axios.post(`${conn.apiBaseUrl}/api/journal-voucher/save.do`,
    { transDate, description: memo, detailJournalVoucher: details },
    { headers: { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId, 'Content-Type': 'application/json' } }
  )

  if (!res.data.s) {
    const err = Array.isArray(res.data.d) ? res.data.d.join(', ') : String(res.data.d)
    throw new Error(`Accurate reject: ${err}`)
  }
}

// ─── Process one row ──────────────────────────────────────────────────────────

async function processRow(
  row: CsvRow,
  conn: { accessToken: string; sessionId: string; apiBaseUrl: string }
) {
  const { date, store, income } = row
  const mapping = ACCURATE_MAPPING.STORES[store]
  if (!mapping) throw new Error(`Mapping untuk toko "${store}" tidak ditemukan.`)

  // Always fetch fresh data from Quinos so the latest formula is applied,
  // then upsert into daily_revenue (overwrites any stale record).
  console.log(`     📡 Mengambil data dari Quinos...`)
  const qData = await fetchQuinosRevenue(date, store)

  await supabase.from('daily_revenue').upsert(
    { ...qData, updated_at: new Date().toISOString() },
    { onConflict: 'store_name,transaction_date' }
  )

  // rev = fresh Quinos data (POS gross amounts + penjualan breakdown)
  // income = CSV bank settlement amounts (net)
  // fees = POS - settlement
  const rev = qData

  const biayaAdminBank =
    Math.max(0, (rev.payment_credit_bca || 0) - income.payment_credit_bca) +
    Math.max(0, (rev.payment_debit_bca  || 0) - income.payment_debit_bca)  +
    Math.max(0, (rev.payment_qris       || 0) - income.payment_qris)

  const biayaMerchant =
    Math.max(0, (rev.payment_gobiz || 0) + (rev.payment_ovo || 0) -
                 income.payment_gobiz    - income.payment_ovo)

  const accurateDate = toAccurateDate(date)

  // H+1 date for Uang Masuk
  const txDate = new Date(date)
  txDate.setDate(txDate.getDate() + 1)
  const accurateDateH1 = toAccurateDate(txDate.toISOString().split('T')[0])

  const memoPenjualan = `BREW - PENJUALAN STRADA ${store} ${accurateDate}`
  const memoUangMasuk = `BREW - UANG MASUK STRADA ${store} ${accurateDate}`

  // ── Jurnal 1: Penjualan ───────────────────────────────────────────────────
  const dp: any[] = []

  addDetail(dp, mapping.payment_credit_bca, 'DEBIT', rev.payment_credit_bca || 0)
  addDetail(dp, mapping.payment_debit_bca,  'DEBIT', rev.payment_debit_bca  || 0)
  addDetail(dp, mapping.payment_qris,       'DEBIT', rev.payment_qris       || 0)
  addDetail(dp, mapping.payment_gobiz,      'DEBIT', rev.payment_gobiz      || 0)
  addDetail(dp, mapping.payment_ovo,        'DEBIT', rev.payment_ovo        || 0)
  addDetail(dp, mapping.payment_cash,       'DEBIT', rev.payment_cash       || 0)
  addDetail(dp, mapping.payment_transfer,   'DEBIT', rev.payment_transfer   || 0)

  // Global vouchers
  for (const key in ACCURATE_MAPPING.GLOBAL) {
    if (key.startsWith('payment_')) {
      addDetail(dp, ACCURATE_MAPPING.GLOBAL[key], 'DEBIT', rev[key] || 0)
    }
  }
  // Store-specific vouchers
  if (mapping.payment_bsd_workshop_vou)    addDetail(dp, mapping.payment_bsd_workshop_vou,    'DEBIT', rev.payment_bsd_workshop_vou    || 0)
  if (mapping.payment_voucher_smkg)        addDetail(dp, mapping.payment_voucher_smkg,         'DEBIT', rev.payment_voucher_smkg         || 0)
  if (mapping.payment_workshop_sms_voucher) addDetail(dp, mapping.payment_workshop_sms_voucher,'DEBIT', rev.payment_workshop_sms_voucher || 0)
  if (mapping.payment_cl_upperwest)        addDetail(dp, mapping.payment_cl_upperwest,         'DEBIT', rev.payment_cl_upperwest         || 0)

  addDetail(dp, mapping.discount, 'DEBIT', rev.revenue_discount || 0)

  addDetail(dp, mapping.sales_bar,                 'CREDIT', rev.penjualan_bar                 || 0)
  addDetail(dp, mapping.sales_beans,               'CREDIT', rev.penjualan_coffee_beans         || 0)
  addDetail(dp, mapping.sales_kitchen,             'CREDIT', rev.penjualan_makanan              || 0)
  addDetail(dp, mapping.sales_konsinyasi,          'CREDIT', rev.penjualan_konsinyasi           || 0)
  addDetail(dp, mapping.sales_bundling,            'CREDIT', rev.penjualan_bundling             || 0)
  addDetail(dp, mapping.sales_inventory,           'CREDIT', rev.penjualan_inventory            || 0)
  addDetail(dp, mapping.sales_modifier,            'CREDIT', rev.penjualan_modifier             || 0)
  addDetail(dp, mapping.sales_konsinyasi_no_brand, 'CREDIT', rev.penjualan_konsinyasi_no_brand  || 0)
  addDetail(dp, mapping.service_charge,            'CREDIT', rev.hutang_service                 || 0)
  addDetail(dp, mapping.tax,                       'CREDIT', rev.hutang_pajak_pemkot            || 0)

  await postJournal(memoPenjualan, accurateDate, dp, conn)
  console.log(`     ✅ Jurnal Penjualan OK`)

  // ── Jurnal 2: Uang Masuk ─────────────────────────────────────────────────
  const du: any[] = []

  const totalNetReceipt =
    income.payment_credit_bca +
    income.payment_debit_bca  +
    income.payment_qris       +
    income.payment_gobiz      +
    income.payment_ovo        +
    income.payment_cash       +
    income.payment_transfer

  addDetail(du, mapping.settlement_bca,                             'DEBIT',  totalNetReceipt)
  addDetail(du, mapping.admin_bank     || ACCURATE_MAPPING.GLOBAL.admin_bank,     'DEBIT', biayaAdminBank)
  addDetail(du, mapping.admin_merchant || ACCURATE_MAPPING.GLOBAL.admin_merchant, 'DEBIT', biayaMerchant)

  const coreKeys = [
    'payment_cash', 'payment_transfer', 'payment_credit_bca',
    'payment_debit_bca', 'payment_qris', 'payment_gobiz', 'payment_ovo'
  ]
  for (const key of coreKeys) {
    const amount = rev[key] || 0
    if (amount > 0) {
      const account = mapping[key] || ACCURATE_MAPPING.GLOBAL[key]
      if (account) addDetail(du, account, 'CREDIT', amount)
    }
  }

  await postJournal(memoUangMasuk, accurateDateH1, du, conn)
  console.log(`     ✅ Jurnal Uang Masuk OK (tanggal ${accurateDateH1})`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2] || path.join(process.cwd(), 'scripts/finance/mass_jurnal_template.csv')

  if (!fs.existsSync(csvPath)) {
    console.error(`\n❌ File tidak ditemukan: ${csvPath}`)
    process.exit(1)
  }

  console.log(`\nMembaca CSV: ${csvPath}`)
  let rows: CsvRow[]
  try {
    rows = parseCSV(csvPath)
  } catch (e: any) {
    console.error(`\n❌ Error membaca CSV: ${e.message}`)
    process.exit(1)
  }

  if (rows.length === 0) {
    console.error('❌ Tidak ada baris valid di CSV.')
    process.exit(1)
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Ditemukan ${rows.length} baris:`)
  rows.forEach((r, i) => console.log(
    `  ${i + 1}. ${r.date}  ${r.store.padEnd(16)}  ` +
    Object.entries(r.income).filter(([,v]) => v > 0)
      .map(([k, v]) => `${k.replace('payment_','').toUpperCase()} ${v.toLocaleString('id-ID')}`)
      .join('  ')
  ))
  console.log('─'.repeat(60))

  const ok = await confirm(`\nPost ${rows.length} hari ke Accurate (Penjualan + Uang Masuk)? (y/n): `)
  if (!ok) { console.log('Dibatalkan.'); process.exit(0) }

  console.log(`\nMenghubungkan ke Accurate...`)
  const conn = await getAccurateConnection()
  console.log(`✅ Terhubung. Session: ${conn.sessionId}\n`)

  let success = 0
  let failed  = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    console.log(`[${i + 1}/${rows.length}] ${row.date} — ${row.store}`)
    try {
      await processRow(row, conn)
      success++
    } catch (e: any) {
      failed++
      console.log(`     ❌ ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 700))
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`✅ Selesai!  Berhasil: ${success}  |  Gagal: ${failed}`)
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message)
  process.exit(1)
})
