/**
 * mass_patch_sms_jurnal.ts
 *
 * Perbaiki massal Jurnal Umum Uang Masuk SMS di Accurate:
 *   DEBIT 1000.02.04 (Bank BCA MKG 4599991899)
 *     → 1000.02.05 (Bank BCA SMS 4599993999)         jika bukan hari OVO
 *     → 1000.02.01 (Bank BCA LPZ 4281688817)         jika tanggal ada MASUK OVO di CSV
 *
 * Hanya memproses jurnal dengan keterangan "BREW - UANG MASUK STRADA SMS".
 * Keterangan tidak diubah.
 *
 * CSV referensi OVO: scripts/finance/MASS INPUT FINANCE SMS.csv
 *   Kolom: Tanggal,Toko,MASUK CASH,KREDIT BCA,DEBIT BCA,QRIS BCA,MASUK GO-BIZ,MASUK OVO
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx ts-node -r dotenv/config scripts/finance/mass_patch_sms_jurnal.ts [options]
 *
 * Flag opsional:
 *   --dry-run              Preview perubahan tanpa menyimpan ke Accurate
 *   --date  YYYY-MM-DD     Hanya jurnal dengan tanggal tersebut (dari keterangan)
 *   --from  YYYY-MM-DD     Tanggal mulai (inklusif, dari keterangan)
 *   --to    YYYY-MM-DD     Tanggal selesai (inklusif, dari keterangan)
 *   --debug                Print raw detail lines untuk setiap jurnal
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
const isDebug  = process.argv.includes('--debug')

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

const singleDate = parseDate(getArg('--date'), '--date')
const dateFrom   = parseDate(singleDate ?? getArg('--from'), '--from')
const dateTo     = parseDate(singleDate ?? getArg('--to'),   '--to')

// ─── Constants ────────────────────────────────────────────────────────────────

const SEARCH_KEYWORD    = 'BREW - UANG MASUK STRADA SMS'
const SOURCE_KODE       = '1000.02.04'  // Bank BCA MKG (wrong one currently on these journals)
const TARGET_KODE_SMS   = '1000.02.05'  // Bank BCA SMS 4599993999  (default)
const TARGET_KODE_LPZ   = '1000.02.01'  // Bank BCA LPZ 4281688817  (for OVO days)
const PAGE_SIZE         = 100

const CSV_PATH = path.join(process.cwd(), 'scripts/finance/MASS INPUT FINANCE SMS.csv')

// ─── Load CSV data ────────────────────────────────────────────────────────────
// Columns: Tanggal(0), Toko(1), MASUK CASH(2), KREDIT BCA(3), DEBIT BCA(4),
//          QRIS BCA(5), MASUK GO-BIZ(6), MASUK OVO(7)

interface CsvRow {
  smsAmount: number   // sum of cols 2-6: MASUK CASH + KREDIT BCA + DEBIT BCA + QRIS BCA + MASUK GO-BIZ
  ovoAmount: number   // col 7: MASUK OVO
}

function parseAmount(raw: string | undefined): number {
  if (!raw) return 0
  const n = parseFloat(raw.replace(/[",\s]/g, ''))
  return isNaN(n) ? 0 : n
}

function loadCsvData(): Map<string, CsvRow> {
  const result = new Map<string, CsvRow>()
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV tidak ditemukan: ${CSV_PATH}`)
    process.exit(1)
  }
  const lines = fs.readFileSync(CSV_PATH, 'utf-8').split('\n')
  for (let i = 1; i < lines.length; i++) {   // skip header
    const line = lines[i].trim()
    if (!line) continue
    const cols    = parseCsvLine(line)
    const rawDate = cols[0]?.trim()    // DD/MM/YYYY
    if (!rawDate) continue

    const parts = rawDate.split('/')
    if (parts.length !== 3) continue
    const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`

    const masukCash  = parseAmount(cols[2])
    const kreditBca  = parseAmount(cols[3])
    const debitBca   = parseAmount(cols[4])
    const qrisBca    = parseAmount(cols[5])
    const masukGoBiz = parseAmount(cols[6])
    const masukOvo   = parseAmount(cols[7])

    const smsAmount = Math.round((masukCash + kreditBca + debitBca + qrisBca + masukGoBiz) * 100) / 100
    const ovoAmount = Math.round(masukOvo * 100) / 100

    result.set(isoDate, { smsAmount, ovoAmount })
  }
  return result
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function extractKeteranganDate(description: string): string | undefined {
  const m = description.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!m) return undefined
  return `${m[3]}-${m[2]}-${m[1]}`
}

function isInDateRange(description: string): boolean {
  if (!dateFrom && !dateTo) return true
  const d = extractKeteranganDate(description)
  if (!d) return false
  if (dateFrom && d < dateFrom) return false
  if (dateTo   && d > dateTo)   return false
  return true
}

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
    this.logPath = path.join(logDir, `mass_patch_sms_jurnal_${wibFileStamp()}.log`)
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

async function fetchAllTargetJournals(conn: Conn, log: Logger): Promise<JournalSummary[]> {
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
      .filter((j: JournalSummary) =>
        j.description.toUpperCase().includes('UANG MASUK') &&
        isInDateRange(j.description)
      )

    all.push(...rows)
    log.write(`  Halaman ${page}: ${rawPage.length} total, ${rows.length} cocok (kumulatif: ${all.length})`)

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
  } catch {
    return null
  }
}

// ─── Normalise detail line ───────────────────────────────────────────────────

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

  const customerNo: string | undefined =
    line.customer?.no || line.customer?.number || line.customerNo || CUSTOMER_MAPPING[accountNo]

  if (customerNo) {
    out.customerNo     = customerNo
    out.subsidiaryType = 'CUSTOMER'
  }

  const vendorNo: string | undefined =
    line.vendor?.no || line.vendor?.number || line.vendorNo

  if (vendorNo && !customerNo) {
    out.vendorNo       = vendorNo
    out.subsidiaryType = 'VENDOR'
  }

  return out
}

// ─── Determine patch target & apply ──────────────────────────────────────────

interface PatchInfo {
  lineIdx: number
  from: string
  to: string
  amount: number
}

interface PatchResult {
  changed: boolean
  patched: PatchInfo[]
  updatedLines: any[]   // final line list to send to save.do (may have more lines than original)
}

/**
 * Non-OVO day: replace the single 1000.02.04 DEBIT line → 1000.02.05.
 * OVO day: replace the single 1000.02.04 DEBIT line with TWO lines:
 *   • 1000.02.05  amount = smsAmount (sum of non-OVO columns from CSV)
 *   • 1000.02.01  amount = ovoAmount (MASUK OVO from CSV)
 * csvRow is required when isOvoDay = true.
 */
function patchDetails(raw: any[], isOvoDay: boolean, csvRow?: CsvRow): PatchResult {
  const lines = raw.map(normaliseDetail)
  const patched: PatchInfo[] = []
  const updatedLines: any[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.amountType === 'DEBIT' && line.accountNo === SOURCE_KODE) {
      if (isOvoDay && csvRow) {
        // Split into two lines using amounts from CSV
        const linesSms = { ...line, accountNo: TARGET_KODE_SMS, amount: csvRow.smsAmount }
        const lineLpz  = { ...line, accountNo: TARGET_KODE_LPZ, amount: csvRow.ovoAmount }
        updatedLines.push(linesSms)
        updatedLines.push(lineLpz)
        patched.push({ lineIdx: i + 1, from: SOURCE_KODE, to: `${TARGET_KODE_SMS}+${TARGET_KODE_LPZ}`, amount: line.amount })
      } else {
        const newLine = { ...line, accountNo: TARGET_KODE_SMS }
        updatedLines.push(newLine)
        patched.push({ lineIdx: i + 1, from: SOURCE_KODE, to: TARGET_KODE_SMS, amount: line.amount })
      }
    } else {
      updatedLines.push(line)
    }
  }

  return { changed: patched.length > 0, patched, updatedLines }
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

  // Load CSV
  const csvData  = loadCsvData()
  const ovoDates = new Set([...csvData.entries()].filter(([, r]) => r.ovoAmount > 0).map(([d]) => d))
  log.write(`BREW — Mass Patch Jurnal Uang Masuk SMS (1000.02.04 → 1000.02.05 / split OVO)`)
  log.write(`Mode       : ${isDryRun ? '🔍 DRY RUN — tidak ada yang disimpan' : '✏️  LIVE — akan menyimpan ke Accurate'}`)
  log.write(`Filter tgl : ${singleDate ? `Tanggal ${singleDate}` : dateFrom || dateTo ? `${dateFrom ?? '*'} s/d ${dateTo ?? '*'}` : 'Semua tanggal'}`)
  log.write(`Keyword    : "${SEARCH_KEYWORD}"`)
  log.write(`Source kode: ${SOURCE_KODE} (DEBIT)`)
  log.write(`Normal days: ${SOURCE_KODE} → ${TARGET_KODE_SMS} (Bank BCA SMS 4599993999)`)
  log.write(`OVO days   : ${SOURCE_KODE} split → ${TARGET_KODE_SMS} (non-OVO sum) + ${TARGET_KODE_LPZ} (OVO, Bank BCA LPZ 4281688817)`)
  log.write(`OVO dates (${ovoDates.size}): ${[...ovoDates].sort().join(', ')}`)
  log.write(`Dijalankan : ${wibNow()} WIB`)
  log.write(`Log file   : ${log.path}`)
  log.write('')

  log.write('Menghubungkan ke Accurate...')
  const conn = await getAccurateConnection()
  log.write(`✅ Terhubung. Session: ${conn.sessionId}`)
  log.write('')

  // ── Fase 1: Fetch list ────────────────────────────────────────────────────
  log.section('FASE 1 — AMBIL DAFTAR JURNAL')
  const journals = await fetchAllTargetJournals(conn, log)
  log.write(`\nTotal jurnal ditemukan: ${journals.length}`)
  log.flush()

  if (journals.length === 0) {
    log.write('Tidak ada jurnal yang perlu diproses.')
    log.flush()
    process.exit(0)
  }

  // ── Fase 2: Preview ───────────────────────────────────────────────────────
  log.write('')
  log.section('FASE 2 — PREVIEW (ambil detail & identifikasi perubahan)')

  type PatchCandidate = {
    journal: JournalSummary
    detail: JournalDetail
    patchResult: PatchResult
    isOvoDay: boolean
    csvRow?: CsvRow
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

    if (isDebug) {
      log.write(`\n  [DEBUG] Raw detailJournalVoucher for ${j.no}:`)
      log.write(JSON.stringify(detail.detailJournalVoucher, null, 2))
      log.flush()
    }

    const jDate    = extractKeteranganDate(j.description)
    const isOvoDay = jDate ? ovoDates.has(jDate) : false
    const csvRow   = jDate ? csvData.get(jDate) : undefined

    const patchResult = patchDetails(detail.detailJournalVoucher, isOvoDay, csvRow)

    if (patchResult.changed) {
      candidates.push({ journal: j, detail, patchResult, isOvoDay, csvRow })
    } else {
      noChangeList.push(j.no)
      log.write(`\n  ⏭️  SKIP (no ${SOURCE_KODE} DEBIT)  ${j.no.padEnd(25)} | ${j.description}`)
    }

    await new Promise(r => setTimeout(r, 200))
  }

  process.stdout.write('\n')
  log.write('')
  log.write(`Perlu diubah       : ${candidates.length}`)
  log.write(`  → ${TARGET_KODE_SMS} only (normal)    : ${candidates.filter(c => !c.isOvoDay).length}`)
  log.write(`  → split SMS+LPZ   (OVO day) : ${candidates.filter(c =>  c.isOvoDay).length}`)
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
    if (c.isOvoDay && c.csvRow) {
      log.write(`  ${c.journal.no.padEnd(25)} | ${c.journal.transDate.padEnd(12)} | [OVO SPLIT] | ${c.journal.description}`)
      log.write(`    → ${TARGET_KODE_SMS} DEBIT Rp ${c.csvRow.smsAmount.toLocaleString('id-ID')} (MASUK CASH+KREDIT BCA+DEBIT BCA+QRIS BCA+GO-BIZ)`)
      log.write(`    → ${TARGET_KODE_LPZ} DEBIT Rp ${c.csvRow.ovoAmount.toLocaleString('id-ID')} (MASUK OVO)`)
    } else {
      log.write(`  ${c.journal.no.padEnd(25)} | ${c.journal.transDate.padEnd(12)} | [normal]    | ${c.journal.description}`)
      for (const p of c.patchResult.patched) {
        log.write(`    Baris ${p.lineIdx}: DEBIT ${p.from} → ${p.to}  (Rp ${p.amount.toLocaleString('id-ID')})`)
      }
    }
  }
  log.flush()

  if (isDryRun) {
    log.write('')
    log.write('=== DRY RUN SELESAI — tidak ada perubahan yang disimpan ===')
    log.flush()
    process.exit(0)
  }

  // ── Konfirmasi ────────────────────────────────────────────────────────────
  const ok = await confirm(`\n⚠️  Ubah ${candidates.length} jurnal di Accurate? Tindakan ini TIDAK BISA dibatalkan. (y/n): `)
  if (!ok) {
    log.write(`\n[${wibNow()} WIB] Proses dibatalkan oleh user.`)
    log.flush()
    process.exit(0)
  }

  // ── Fase 3: Patch ─────────────────────────────────────────────────────────
  log.write('')
  log.section('FASE 3 — PATCH')

  let saved  = 0
  let failed = 0

  const headers = { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }

  for (let i = 0; i < candidates.length; i++) {
    const { journal, detail, patchResult } = candidates[i]
    const prefix = `  [${String(i + 1).padStart(3)}/${candidates.length}]`

    // Use the already-built updatedLines from patchDetails()
    const updatedLines = patchResult.updatedLines

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

  // ── Ringkasan ─────────────────────────────────────────────────────────────
  log.write('')
  log.section('RINGKASAN AKHIR')
  log.write(`Selesai pada       : ${wibNow()} WIB`)
  log.write(`Total perlu patch  : ${candidates.length}`)
  log.write(`Berhasil dipatch   : ${saved}`)
  log.write(`Gagal              : ${failed}`)
  log.write(`Tidak ada perubahan: ${noChangeList.length}`)
  log.write(`Gagal fetch detail : ${fetchErrors.length}`)
  log.write(`Log tersimpan      : ${log.path}`)
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
