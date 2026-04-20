/**
 * mass_patch_uang_masuk.ts
 *
 * Perbaiki massal Jurnal Umum Uang Masuk di Accurate:
 *   DEBIT Kas Besar (1000.01.XX) → DEBIT Bank BCA (1000.02.XX)
 * KREDIT 1000.01.XX tidak diubah.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx ts-node -r dotenv/config scripts/finance/mass_patch_uang_masuk.ts [options]
 *
 * Flag opsional:
 *   --dry-run              Preview perubahan tanpa menyimpan ke Accurate
 *   --date  YYYY-MM-DD     Hanya jurnal dengan tanggal tersebut
 *   --from  YYYY-MM-DD     Tanggal mulai (inklusif)
 *   --to    YYYY-MM-DD     Tanggal selesai (inklusif)
 *   --store <NAMA_TOKO>    Filter per toko (LA.PIAZZA, MKG, BSD, SMB, SMS, ...)
 *                          Nama dicocokkan case-insensitive di keterangan jurnal
 *
 * Contoh:
 *   --date 2025-02-11 --store LA.PIAZZA
 *   --from 2025-01-01 --to 2025-03-31 --store MKG
 *   --from 2025-01-01                          (semua toko, open-ended)
 *
 * Log file: scripts/finance/logs/mass_patch_uang_masuk_YYYYMMDD_HHMMSS.log
 */

import axios from 'axios'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ─── CLI args ─────────────────────────────────────────────────────────────────

const isDryRun = process.argv.includes('--dry-run')

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}

function parseDate(raw: string | undefined, label: string): string | undefined {
  if (!raw) return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    console.error(`❌ Format ${label} tidak valid: "${raw}". Gunakan YYYY-MM-DD.`)
    process.exit(1)
  }
  return raw
}

const singleDate  = parseDate(getArg('--date'), '--date')
const dateFrom    = parseDate(singleDate ?? getArg('--from'), '--from')
const dateTo      = parseDate(singleDate ?? getArg('--to'),   '--to')
const storeFilter = getArg('--store')?.toUpperCase()

// Extract the revenue date (DD/MM/YYYY) embedded in the keterangan, e.g.:
//   "BREW - UANG MASUK STRADA LA.PIAZZA 11/02/2025"  →  "2025-02-11"
// Returns undefined if no date found in description.
function extractKeteranganDate(description: string): string | undefined {
  const m = description.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!m) return undefined
  return `${m[3]}-${m[2]}-${m[1]}` // YYYY-MM-DD
}

function isInDateRange(description: string): boolean {
  if (!dateFrom && !dateTo) return true
  const d = extractKeteranganDate(description)
  if (!d) return false // can't determine date → exclude to be safe
  if (dateFrom && d < dateFrom) return false
  if (dateTo   && d > dateTo)   return false
  return true
}

// Journal description format: "BREW - UANG MASUK STRADA <STORE> DD/MM/YYYY"
// We match storeFilter anywhere in the upper-cased description.
function matchesStore(description: string): boolean {
  if (!storeFilter) return true
  return description.toUpperCase().includes(storeFilter)
}

// Safety guard: only process journals that are genuinely Uang Masuk.
function isUangMasuk(description: string): boolean {
  return description.toUpperCase().includes('UANG MASUK')
}

// ─── Kas Besar → Bank BCA remap (only for DEBIT lines) ───────────────────────
// Key = akun Kas Besar, Value = akun Bank BCA penggantinya
const KAS_TO_BANK_MAP: Record<string, string> = {
  '1000.01.01': '1000.02.01', // LA.PIAZZA
  '1000.01.10': '1000.02.06', // BSD
  '1000.01.11': '1000.02.04', // MKG
  '1000.01.12': '1000.02.07', // SMB
  '1000.01.13': '1000.02.08', // SMB GOLD LOUNGE
  '1000.01.14': '1000.02.04', // SMS
}

// Inlined from src/lib/finance/accurate-mapping.ts — avoids ESM import issues
const CUSTOMER_MAPPING: Record<string, string> = {
  '1100.12': 'C.00098',
  '1100.16': 'C.00006',
  '1100.06': 'C.00006',
  '1100.17': 'C.00006',
  '1100.18': 'C.00006',
  '1100.19': 'C.00006',
  '1100.20': 'C.00006',
  '1100.22': 'C.00046',
  '1100.21': 'C.00046',
  '1100.23': 'C.00046',
  '1100.24': 'C.00046',
  '1100.25': 'C.00046',
  '1100.26': 'C.00046',
  '1100.13': 'C.00045',
  '1100.01': 'C.00045',
  '1100.10': 'C.00045',
  '1100.14': 'C.00045',
  '1100.15': 'C.00045',
  '1100.11': 'C.00045',
}

const VENDOR_MAPPING: Record<string, string> = {}

const SEARCH_KEYWORD = 'BREW - UANG MASUK'
const PAGE_SIZE      = 100

// ─── Setup ───────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SERVICE_SUPABASE_KEY!
const supabase    = createClient(supabaseUrl, supabaseKey)

// ─── WIB helpers ─────────────────────────────────────────────────────────────

function wibNow(): string {
  return new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).replace(/\//g, '-')
}

function wibFileStamp(): string {
  const d = new Date(new Date().getTime() + 7 * 3600 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}_${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
}

// ─── Logger ───────────────────────────────────────────────────────────────────

class Logger {
  private logPath: string
  private lines: string[] = []

  constructor(logDir: string) {
    fs.mkdirSync(logDir, { recursive: true })
    this.logPath = path.join(logDir, `mass_patch_uang_masuk_${wibFileStamp()}.log`)
  }

  write(line: string) {
    this.lines.push(line)
    console.log(line)
  }

  section(title: string) {
    const bar = '─'.repeat(70)
    this.write(bar)
    this.write(title)
    this.write(bar)
  }

  flush() {
    fs.writeFileSync(this.logPath, this.lines.join('\n') + '\n', 'utf-8')
  }

  get path() { return this.logPath }
}

// ─── Accurate Auth ───────────────────────────────────────────────────────────

type Conn = { accessToken: string; sessionId: string; apiBaseUrl: string }

async function getAccurateConnection(): Promise<Conn> {
  const { data: tokenData, error } = await supabase.from('accurate_tokens').select('*').limit(1).maybeSingle()
  if (error || !tokenData) throw new Error(`No Accurate tokens found. Error: ${error?.message ?? 'null row'}`)

  let accessToken = tokenData.access_token
  const isExpired = new Date(tokenData.expires_at) <= new Date()
  console.log(`Token expires_at: ${tokenData.expires_at} — ${isExpired ? 'EXPIRED, refreshing...' : 'still valid'}`)

  if (isExpired) {
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

  async function tryGetSession(token: string): Promise<Conn> {
    const dbListRes = await axios.get('https://account.accurate.id/api/db-list.do', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const dbId = dbListRes.data.d[0].id
    const sessionRes = await axios.get(`https://account.accurate.id/api/open-db.do?id=${dbId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return {
      accessToken: token,
      sessionId: sessionRes.data.session,
      apiBaseUrl: `${sessionRes.data.host}/accurate`
    }
  }

  try {
    return await tryGetSession(accessToken)
  } catch (e: any) {
    if (e.response?.status !== 401) throw e
    const envToken = process.env.ACCURATE_ACCESS_TOKEN
    if (!envToken) throw new Error('DB token returned 401 and ACCURATE_ACCESS_TOKEN is not set in .env.local.')
    console.log('⚠️  DB token invalid (401). Trying ACCURATE_ACCESS_TOKEN from .env.local...')
    const conn = await tryGetSession(envToken)
    await supabase.from('accurate_tokens').update({
      access_token: envToken,
      updated_at: new Date().toISOString()
    }).eq('id', tokenData.id)
    console.log('✅ DB updated with token from .env.local.')
    return conn
  }
}

// ─── Fetch journal list (paginated) ──────────────────────────────────────────

interface JournalSummary {
  id: number
  no: string
  description: string
  transDate: string
}

async function fetchAllUangMasukJournals(conn: Conn, log: Logger): Promise<JournalSummary[]> {
  const headers = { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }
  const all: JournalSummary[] = []
  let page = 1

  const rangeDesc = dateFrom || dateTo
    ? ` (tanggal: ${dateFrom ?? '*'} s/d ${dateTo ?? '*'})`
    : ' (semua tanggal)'
  log.write(`Mencari jurnal dengan keyword: "${SEARCH_KEYWORD}"${rangeDesc} ...`)

  while (true) {
    const res = await axios.get(`${conn.apiBaseUrl}/api/journal-voucher/list.do`, {
      params: {
        fields: 'id,no,description,transDate',
        'filter.keywords.op': 'CONTAIN',
        'filter.keywords.val': SEARCH_KEYWORD,
        'sp.page': page,
        'sp.pageSize': PAGE_SIZE,
      },
      headers,
    })

    if (!res.data.s) {
      throw new Error(`Gagal fetch list jurnal halaman ${page}: ${JSON.stringify(res.data.d)}`)
    }

    const rawPage: any[] = res.data.d ?? []

    const rows: JournalSummary[] = rawPage
      .map((j: any) => ({
        id: j.id,
        no: j.no || j.number || String(j.id),
        description: j.description || '',
        transDate: j.transDate || '',
      }))
      // Client-side: must be Uang Masuk, date range by keterangan date, store filter
      .filter((j: JournalSummary) =>
        isUangMasuk(j.description) &&
        isInDateRange(j.description) &&
        matchesStore(j.description)
      )

    all.push(...rows)
    log.write(`  Halaman ${page}: ${rawPage.length} total, ${rows.length} cocok (kumulatif: ${all.length})`)

    // Stop when raw page is smaller than PAGE_SIZE — last page
    if (rawPage.length < PAGE_SIZE) break
    page++
    await new Promise(r => setTimeout(r, 300))
  }

  return all
}

// ─── Fetch journal detail ─────────────────────────────────────────────────────

interface JournalDetail {
  id: number
  no: string
  description: string
  transDate: string
  detailJournalVoucher: any[]
}

async function fetchJournalDetail(id: number, conn: Conn): Promise<JournalDetail | null> {
  const headers = { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }
  try {
    const res = await axios.get(`${conn.apiBaseUrl}/api/journal-voucher/detail.do`, {
      params: { id },
      headers,
    })
    if (!res.data.s || !res.data.d) return null
    const d = res.data.d
    return {
      id: d.id,
      no: d.no || d.number || String(d.id),
      description: d.description || '',
      transDate: d.transDate || d.transactionDate || '',
      detailJournalVoucher: d.detailJournalVoucher || [],
    }
  } catch (e) {
    return null
  }
}

// ─── Normalise a detail line from Accurate response → save.do format ─────────
// Accurate detail.do returns accounts and subsidiaries as nested objects.
// save.do expects flat strings (accountNo, customerNo, vendorNo).

function normaliseDetail(line: any): any {
  const accountNo: string =
    typeof line.accountNoRef === 'string'      ? line.accountNoRef
    : typeof line.accountNo === 'string'       ? line.accountNo
    : typeof line.account?.number === 'string' ? line.account.number
    : String(line.accountNoRef ?? line.accountNo ?? '')

  const amountType: 'DEBIT' | 'CREDIT' =
    (line.amountType ?? line.detailType ?? '').toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT'

  const amount: number = Math.round(Number(line.amount ?? 0) * 100) / 100

  const out: any = { accountNo, amountType, amount }

  // Customer: read from nested object, flat field, or fall back to CUSTOMER_MAPPING
  const customerNo: string | undefined =
    line.customer?.no
    || line.customer?.number
    || line.customerNo
    || CUSTOMER_MAPPING[accountNo]

  if (customerNo) {
    out.customerNo    = customerNo
    out.subsidiaryType = 'CUSTOMER'
  }

  // Vendor: read from nested object or flat field, or fall back to VENDOR_MAPPING
  const vendorNo: string | undefined =
    line.vendor?.no
    || line.vendor?.number
    || line.vendorNo
    || VENDOR_MAPPING[accountNo]

  if (vendorNo && !customerNo) {
    out.vendorNo      = vendorNo
    out.subsidiaryType = 'VENDOR'
  }

  return out
}

// ─── Patch a single journal ───────────────────────────────────────────────────

interface PatchResult {
  changed: boolean
  patched: Array<{ lineIdx: number; from: string; to: string; amount: number }>
}

function patchDetails(raw: any[]): PatchResult {
  const lines = raw.map(normaliseDetail)
  const patched: PatchResult['patched'] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.amountType === 'DEBIT' && KAS_TO_BANK_MAP[line.accountNo]) {
      const newAccount = KAS_TO_BANK_MAP[line.accountNo]
      patched.push({ lineIdx: i + 1, from: line.accountNo, to: newAccount, amount: line.amount })
      lines[i] = { ...line, accountNo: newAccount }
    }
  }

  return { changed: patched.length > 0, patched }
}

// ─── Confirm prompt ───────────────────────────────────────────────────────────

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, ans => { rl.close(); resolve(ans.trim().toLowerCase() === 'y') })
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const logDir = path.join(process.cwd(), 'scripts/finance/logs')
  const log    = new Logger(logDir)

  log.write(`BREW — Mass Patch Uang Masuk (Kas Besar → Bank BCA)`)
  log.write(`Mode       : ${isDryRun ? '🔍 DRY RUN — tidak ada yang disimpan' : '✏️  LIVE — akan menyimpan ke Accurate'}`)
  log.write(`Filter tgl : ${singleDate ? `Tanggal ${singleDate}` : dateFrom || dateTo ? `${dateFrom ?? '*'} s/d ${dateTo ?? '*'}` : 'Semua tanggal'} (tanggal di keterangan jurnal)`)
  log.write(`Filter toko: ${storeFilter ?? 'Semua toko'}`)
  log.write(`Dijalankan : ${wibNow()} WIB`)
  log.write(`Log file   : ${log.path}`)
  log.write('')
  log.write('Tabel remap DEBIT:')
  for (const [from, to] of Object.entries(KAS_TO_BANK_MAP)) {
    log.write(`  ${from.padEnd(12)} → ${to}`)
  }
  log.write('')

  log.write('Menghubungkan ke Accurate...')
  const conn = await getAccurateConnection()
  log.write(`✅ Terhubung. Session: ${conn.sessionId}`)
  log.write('')

  // ── Fase 1: Fetch semua jurnal Uang Masuk BREW ───────────────────────────────
  log.section('FASE 1 — AMBIL DAFTAR JURNAL')
  const journals = await fetchAllUangMasukJournals(conn, log)
  log.write(`\nTotal jurnal ditemukan: ${journals.length}`)
  log.flush()

  if (journals.length === 0) {
    log.write('Tidak ada jurnal yang perlu diproses.')
    log.flush()
    process.exit(0)
  }

  // ── Fase 2: Preview — fetch detail dan hitung yang perlu dipatch ─────────────
  log.write('')
  log.section('FASE 2 — PREVIEW (ambil detail & identifikasi perubahan)')

  type PatchCandidate = {
    journal: JournalSummary
    detail: JournalDetail
    patchResult: PatchResult
  }

  const candidates: PatchCandidate[] = []
  const noChangeList: string[] = []
  const fetchErrors: string[] = []

  for (let i = 0; i < journals.length; i++) {
    const j = journals[i]
    process.stdout.write(`\r  Memeriksa [${i + 1}/${journals.length}] ${j.no.padEnd(25)}`)

    const detail = await fetchJournalDetail(j.id, conn)
    if (!detail) {
      fetchErrors.push(j.no)
      log.write(`\n  ❌ GAGAL FETCH  ${j.no}`)
      log.flush()
      await new Promise(r => setTimeout(r, 300))
      continue
    }

    if (process.argv.includes('--debug')) {
      log.write(`\n  [DEBUG] Raw detailJournalVoucher for ${j.no}:`)
      log.write(JSON.stringify(detail.detailJournalVoucher, null, 2))
      log.flush()
    }

    const patchResult = patchDetails(detail.detailJournalVoucher)
    if (patchResult.changed) {
      candidates.push({ journal: j, detail, patchResult })
    } else {
      noChangeList.push(j.no)
      log.write(`\n  ⏭️  SKIP (no Kas Besar DEBIT)  ${j.no.padEnd(25)} | ${j.description}`)
    }

    await new Promise(r => setTimeout(r, 200))
  }

  process.stdout.write('\n')
  log.write('')
  log.write(`Perlu diubah       : ${candidates.length}`)
  log.write(`Tidak ada perubahan: ${noChangeList.length}`)
  log.write(`Gagal fetch detail : ${fetchErrors.length}`)

  if (candidates.length === 0) {
    log.write('\nTidak ada jurnal yang perlu dipatch.')
    log.flush()
    process.exit(0)
  }

  log.write('')
  log.write('Daftar jurnal yang akan diubah:')
  for (const c of candidates) {
    log.write(`  ${c.journal.no.padEnd(25)} | ${c.journal.transDate.padEnd(12)} | ${c.journal.description}`)
    for (const p of c.patchResult.patched) {
      log.write(`    Baris ${p.lineIdx}: DEBIT ${p.from} → ${p.to}  (Rp ${p.amount.toLocaleString('id-ID')})`)
    }
  }
  log.flush()

  if (isDryRun) {
    log.write('')
    log.write('=== DRY RUN SELESAI — tidak ada perubahan yang disimpan ===')
    log.flush()
    process.exit(0)
  }

  // ── Konfirmasi ───────────────────────────────────────────────────────────────
  const ok = await confirm(`\n⚠️  Ubah ${candidates.length} jurnal di Accurate? Tindakan ini TIDAK BISA dibatalkan. (y/n): `)
  if (!ok) {
    log.write(`\n[${wibNow()} WIB] Proses dibatalkan oleh user.`)
    log.flush()
    process.exit(0)
  }

  // ── Fase 3: Patch ────────────────────────────────────────────────────────────
  log.write('')
  log.section('FASE 3 — PATCH')

  let saved   = 0
  let failed  = 0

  const headers = { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }

  for (let i = 0; i < candidates.length; i++) {
    const { journal, detail, patchResult } = candidates[i]
    const prefix = `  [${String(i + 1).padStart(3)}/${candidates.length}]`

    // Rebuild detail lines with patches applied
    const updatedLines = detail.detailJournalVoucher.map(normaliseDetail)
    for (const p of patchResult.patched) {
      updatedLines[p.lineIdx - 1].accountNo = p.to
    }

    // transDate: prefer journal-level field, fall back to first detail line's transactionDate
    const transDate =
      detail.transDate ||
      detail.detailJournalVoucher[0]?.transactionDate ||
      ''

    try {
      const res = await axios.post(
        `${conn.apiBaseUrl}/api/journal-voucher/save.do`,
        {
          id: detail.id,
          transDate,
          detailJournalVoucher: updatedLines,
        },
        { headers: { ...headers, 'Content-Type': 'application/json' } }
      )

      if (res.data.s !== false) {
        saved++
        const changes = patchResult.patched.map(p => `${p.from}→${p.to} Rp ${p.amount.toLocaleString('id-ID')}`).join(', ')
        log.write(`${prefix} ✅ PATCHED  | ${wibNow()} WIB | ${journal.no.padEnd(25)} | ${changes}`)
      } else {
        failed++
        const errMsg = Array.isArray(res.data.d) ? res.data.d.join(', ') : String(res.data.d)
        log.write(`${prefix} ❌ REJECTED | ${wibNow()} WIB | ${journal.no.padEnd(25)} | Error: ${errMsg}`)
      }
    } catch (e: any) {
      failed++
      const errMsg = e.response?.data?.d ? JSON.stringify(e.response.data.d) : e.message
      log.write(`${prefix} ❌ ERROR    | ${wibNow()} WIB | ${journal.no.padEnd(25)} | Error: ${errMsg}`)
    }

    log.flush()
    await new Promise(r => setTimeout(r, 500))
  }

  // ── Ringkasan ─────────────────────────────────────────────────────────────────
  log.write('')
  log.section('RINGKASAN AKHIR')
  log.write(`Selesai pada      : ${wibNow()} WIB`)
  log.write(`Total perlu patch : ${candidates.length}`)
  log.write(`Berhasil dipatch  : ${saved}`)
  log.write(`Gagal             : ${failed}`)
  log.write(`Tidak ada perubahan: ${noChangeList.length}`)
  log.write(`Gagal fetch detail : ${fetchErrors.length}`)
  log.write(`Log tersimpan     : ${log.path}`)
  log.flush()
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message)
  if (e.response) {
    console.error('  Status :', e.response.status)
    console.error('  URL    :', e.config?.url)
    console.error('  Body   :', JSON.stringify(e.response.data ?? null, null, 2))
  }
  process.exit(1)
})
