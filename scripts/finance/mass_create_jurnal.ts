/**
 * mass_create_jurnal.ts
 *
 * Buat massal jurnal umum Accurate dari CSV template.
 *
 * Usage:
 *   npx ts-node -e "require('dotenv').config({path:'.env.local'})" scripts/finance/mass_create_jurnal.ts
 *   npx ts-node -e "require('dotenv').config({path:'.env.local'})" scripts/finance/mass_create_jurnal.ts ./path/to/your.csv
 *
 * Input CSV (default: ./scripts/finance/mass_jurnal_template.csv):
 *   Setiap baris = satu baris detail jurnal.
 *   Baris yang punya tanggal + keterangan sama akan digabung menjadi SATU jurnal.
 *
 * Kolom CSV:
 *   tanggal       - Format YYYY-MM-DD  (contoh: 2026-04-01)
 *   keterangan    - Deskripsi jurnal   (contoh: BREW - Penjualan cafe BSD tanggal 01/04/2026)
 *   kode_akun     - Kode akun Accurate (contoh: 1100.13)
 *   tipe          - DEBIT atau CREDIT
 *   nominal       - Angka tanpa titik/koma (contoh: 5000000)
 *   customer_no   - (Opsional) Nomor customer jika akun piutang (contoh: C.00045)
 *   vendor_no     - (Opsional) Nomor vendor jika akun hutang  (contoh: V.00001)
 *
 * Catatan:
 *   - Jika jurnal dengan keterangan yang sama sudah ada di Accurate, script akan
 *     menghapusnya dulu (revisi) sebelum membuat yang baru.
 *   - Script akan skip jurnal yang tidak balance (selisih > Rp 1).
 */

import axios from 'axios'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SERVICE_SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Accurate Auth ───────────────────────────────────────────────────────────

async function getAccurateConnection() {
  const { data: tokenData, error } = await supabase.from('accurate_tokens').select('*').limit(1).maybeSingle()
  if (error || !tokenData) throw new Error('No Accurate tokens found in database.')

  let accessToken = tokenData.access_token

  if (new Date(tokenData.expires_at) <= new Date()) {
    console.log('Token expired, refreshing...')
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toAccurateDate(dateStr: string): string {
  // YYYY-MM-DD → DD/MM/YYYY
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function parseCsvLine(line: string): string[] {
  // Handle quoted fields containing commas
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
    current += ch
  }
  result.push(current.trim())
  return result
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (ans) => { rl.close(); resolve(ans.trim().toLowerCase() === 'y') })
  })
}

// ─── Delete existing journal by description (for revision) ───────────────────

async function deleteIfExists(
  description: string,
  conn: { accessToken: string; sessionId: string; apiBaseUrl: string }
): Promise<boolean> {
  const headers = { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }
  try {
    const res = await axios.get(`${conn.apiBaseUrl}/api/journal-voucher/list.do`, {
      params: {
        fields: 'id,description',
        'filter.keywords.op': 'EQUAL',
        'filter.keywords.val': description
      },
      headers
    })
    if (!res.data.s || !res.data.d?.length) return false

    const id = res.data.d[0].id
    await axios.delete(`${conn.apiBaseUrl}/api/journal-voucher/delete.do`, {
      params: { id },
      headers
    })
    return true
  } catch (_) {
    return false
  }
}

// ─── Parse & group CSV rows into journals ─────────────────────────────────────

interface DetailRow {
  accountNo: string
  amountType: 'DEBIT' | 'CREDIT'
  amount: number
  customerNo?: string
  vendorNo?: string
}

interface Journal {
  tanggal: string        // YYYY-MM-DD
  keterangan: string
  details: DetailRow[]
  lineNumbers: number[]  // for error reporting
}

function parseCSV(csvPath: string): Journal[] {
  const raw = fs.readFileSync(csvPath, 'utf-8')
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l)

  const header = parseCsvLine(lines[0].toLowerCase())
  const idx = {
    tanggal:     header.indexOf('tanggal'),
    keterangan:  header.indexOf('keterangan'),
    kode_akun:   header.indexOf('kode_akun'),
    tipe:        header.indexOf('tipe'),
    nominal:     header.indexOf('nominal'),
    customer_no: header.indexOf('customer_no'),
    vendor_no:   header.indexOf('vendor_no')
  }

  const required = ['tanggal', 'keterangan', 'kode_akun', 'tipe', 'nominal'] as const
  for (const col of required) {
    if (idx[col] === -1) throw new Error(`Kolom "${col}" tidak ditemukan di header CSV.`)
  }

  const journalMap = new Map<string, Journal>()

  for (let i = 1; i < lines.length; i++) {
    // Skip comment lines
    if (lines[i].startsWith('#')) continue

    const cols = parseCsvLine(lines[i])
    if (cols.every(c => !c)) continue

    const tanggal    = cols[idx.tanggal]
    const keterangan = cols[idx.keterangan]
    const kode_akun  = cols[idx.kode_akun]
    const tipe       = cols[idx.tipe]?.toUpperCase()
    const nominal    = parseFloat(cols[idx.nominal]?.replace(/[.,\s]/g, '') || '0')
    const customer_no = idx.customer_no >= 0 ? cols[idx.customer_no] : ''
    const vendor_no   = idx.vendor_no   >= 0 ? cols[idx.vendor_no]   : ''

    if (!tanggal || !keterangan || !kode_akun || !tipe || !nominal) {
      console.warn(`  ⚠️  Baris ${i + 1} tidak lengkap, dilewati.`)
      continue
    }

    if (tipe !== 'DEBIT' && tipe !== 'CREDIT') {
      console.warn(`  ⚠️  Baris ${i + 1}: tipe harus DEBIT atau CREDIT (ditemukan: "${tipe}"), dilewati.`)
      continue
    }

    if (isNaN(nominal) || nominal <= 0) {
      console.warn(`  ⚠️  Baris ${i + 1}: nominal tidak valid ("${cols[idx.nominal]}"), dilewati.`)
      continue
    }

    const key = `${tanggal}||${keterangan}`
    if (!journalMap.has(key)) {
      journalMap.set(key, { tanggal, keterangan, details: [], lineNumbers: [] })
    }

    const journal = journalMap.get(key)!
    journal.lineNumbers.push(i + 1)

    const detail: DetailRow = {
      accountNo: kode_akun.trim(),
      amountType: tipe as 'DEBIT' | 'CREDIT',
      amount: Math.round(nominal * 100) / 100
    }
    if (customer_no) { detail.customerNo = customer_no; (detail as any).subsidiaryType = 'CUSTOMER' }
    if (vendor_no)   { detail.vendorNo   = vendor_no;   (detail as any).subsidiaryType = 'VENDOR' }

    journal.details.push(detail)
  }

  return Array.from(journalMap.values())
}

// ─── Validate balance ─────────────────────────────────────────────────────────

function validateBalance(journal: Journal): { ok: boolean; diff: number } {
  const debit  = journal.details.filter(d => d.amountType === 'DEBIT').reduce((s, d) => s + d.amount, 0)
  const credit = journal.details.filter(d => d.amountType === 'CREDIT').reduce((s, d) => s + d.amount, 0)
  const diff = Math.abs(debit - credit)
  return { ok: diff <= 1, diff }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2] || path.join(process.cwd(), 'scripts/finance/mass_jurnal_template.csv')

  if (!fs.existsSync(csvPath)) {
    console.error(`\n❌ File tidak ditemukan: ${csvPath}`)
    console.error('Isi file mass_jurnal_template.csv terlebih dahulu lalu jalankan kembali.')
    process.exit(1)
  }

  console.log(`\nMembaca CSV: ${csvPath}`)
  let journals: Journal[]
  try {
    journals = parseCSV(csvPath)
  } catch (e: any) {
    console.error(`\n❌ Error membaca CSV: ${e.message}`)
    process.exit(1)
  }

  if (journals.length === 0) {
    console.error('❌ Tidak ada data jurnal yang valid di dalam file CSV.')
    process.exit(1)
  }

  // Pre-flight validation: check balance
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`Validasi ${journals.length} jurnal...`)
  console.log('─'.repeat(70))

  const validJournals: Journal[]   = []
  const invalidJournals: Journal[] = []

  for (const j of journals) {
    const { ok, diff } = validateBalance(j)
    const date = toAccurateDate(j.tanggal)
    if (ok) {
      const total = j.details.filter(d => d.amountType === 'DEBIT').reduce((s, d) => s + d.amount, 0)
      console.log(`  ✅ OK       ${date}  ${j.keterangan.substring(0, 50)}  (${j.details.length} baris, Rp ${total.toLocaleString('id-ID')})`)
      validJournals.push(j)
    } else {
      console.log(`  ❌ TIDAK BALANCE  ${date}  ${j.keterangan.substring(0, 50)}  (Selisih: Rp ${diff.toLocaleString('id-ID')})`)
      invalidJournals.push(j)
    }
  }

  console.log('─'.repeat(70))
  console.log(`\nValid: ${validJournals.length}  |  Tidak balance (skip): ${invalidJournals.length}`)

  if (validJournals.length === 0) {
    console.log('\nTidak ada jurnal yang bisa dipost.')
    process.exit(0)
  }

  // Confirm
  const ok = await confirm(`\nPost ${validJournals.length} jurnal ke Accurate? (y/n): `)
  if (!ok) { console.log('Dibatalkan.'); process.exit(0) }

  console.log(`\nMenghubungkan ke Accurate...`)
  const conn = await getAccurateConnection()
  console.log(`✅ Terhubung. Session: ${conn.sessionId}\n`)

  // Post
  console.log('─'.repeat(70))
  let success = 0
  let failed  = 0

  for (let i = 0; i < validJournals.length; i++) {
    const j = validJournals[i]
    const transDate = toAccurateDate(j.tanggal)
    const label = `[${i + 1}/${validJournals.length}] ${transDate} | ${j.keterangan.substring(0, 45)}`

    try {
      // Delete existing journal with same description (revision)
      const wasDeleted = await deleteIfExists(j.keterangan, conn)
      if (wasDeleted) console.log(`  🔄 Revisi: jurnal lama dihapus.`)

      const payload = {
        transDate,
        description: j.keterangan,
        detailJournalVoucher: j.details
      }

      const res = await axios.post(`${conn.apiBaseUrl}/api/journal-voucher/save.do`, payload, {
        headers: {
          Authorization: `Bearer ${conn.accessToken}`,
          'X-Session-ID': conn.sessionId,
          'Content-Type': 'application/json'
        }
      })

      if (res.data.s) {
        success++
        console.log(`  ✅ OK    ${label}`)
      } else {
        failed++
        const errMsg = Array.isArray(res.data.d) ? res.data.d.join(', ') : String(res.data.d)
        console.log(`  ❌ FAIL  ${label}\n         Accurate: ${errMsg}`)
      }
    } catch (e: any) {
      failed++
      const errMsg = e.response?.data?.d ? String(e.response.data.d) : e.message
      console.log(`  ❌ ERR   ${label}\n         ${errMsg}`)
    }

    await new Promise(r => setTimeout(r, 600))
  }

  console.log('─'.repeat(70))
  console.log(`\n✅ Selesai!  Berhasil: ${success}  |  Gagal: ${failed}`)
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message)
  process.exit(1)
})
