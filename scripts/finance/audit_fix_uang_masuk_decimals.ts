/**
 * audit_fix_uang_masuk_decimals.ts
 *
 * Compare BREW UANG MASUK journals in Accurate against the bank CSV to find
 * amounts that were submitted as rounded integers but should have 2 decimals.
 *
 * Correct amounts are derived from:
 *   CSV  — bank income columns (KREDIT BCA, DEBIT BCA, QRIS BCA, GO-BIZ, OVO)
 *   Journal CREDIT lines — Quinos POS integers already in Accurate
 *
 * Three amounts are checked (all DEBIT):
 *   settlement_bca  (1000.02.01) = KREDIT + DEBIT + QRIS + GOBIZ + OVO  (CSV)
 *   admin_bank      (6000.01.08) = Σ piutang_bca CREDIT − (KREDIT+DEBIT+QRIS CSV)
 *   merchant        (6000.01.36) = Σ piutang_gobiz + piutang_ovo CREDIT − (GOBIZ+OVO CSV)
 *
 * Safety check before flagging:
 *   Math.round(correct) === journalAmount  AND  correct !== journalAmount
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx ts-node -r dotenv/config \
 *     scripts/finance/audit_fix_uang_masuk_decimals.ts [options]
 *
 * Options:
 *   --csv   PATH              CSV file (default: ./scripts/finance/MASS_INPUT_ALL-2025.csv)
 *   --store LA.PIAZZA         Store name as in CSV column TOKO (default: LA.PIAZZA)
 *   --from  YYYY-MM-DD        Revenue date start, default 2025-08-17
 *   --to    YYYY-MM-DD        Revenue date end,   default 2026-04-12
 *   --dry-run                 Preview only — do not patch Accurate
 *
 * Log: scripts/finance/logs/audit_fix_decimals_YYYYMMDD_HHMMSS.log
 */

import axios from 'axios'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ─── CLI args ─────────────────────────────────────────────────────────────────

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}

const isDryRun    = process.argv.includes('--dry-run')
const storeFilter = (getArg('--store') ?? 'LA.PIAZZA').toUpperCase()
const dateFrom    = getArg('--from') ?? '2025-08-17'
const dateTo      = getArg('--to')   ?? '2026-04-12'
const csvPath     = getArg('--csv')  ?? path.join(process.cwd(), 'scripts/finance/MASS_INPUT_ALL-2025.csv')

// ─── Per-store account config ─────────────────────────────────────────────────
// piutang_bca  = account used for payment_credit_bca, payment_debit_bca, payment_qris
// piutang_gobiz / piutang_ovo = matching credit accounts

const STORE_CFG: Record<string, {
  settlement_bca: string
  admin_bank:     string
  admin_merchant: string
  piutang_bca:    string
  piutang_gobiz:  string
  piutang_ovo:    string
}> = {
  'LA.PIAZZA':       { settlement_bca: '1000.02.01', admin_bank: '6000.01.08', admin_merchant: '6000.01.36', piutang_bca: '1100.01', piutang_gobiz: '1100.06', piutang_ovo: '1100.21' },
  'BSD':             { settlement_bca: '1000.02.06', admin_bank: '6000.01.08', admin_merchant: '6000.01.36', piutang_bca: '1100.13', piutang_gobiz: '1100.16', piutang_ovo: '1100.22' },
  'MKG':             { settlement_bca: '1000.02.04', admin_bank: '6000.01.08', admin_merchant: '6000.01.36', piutang_bca: '1100.10', piutang_gobiz: '1100.17', piutang_ovo: '1100.23' },
  'SMB':             { settlement_bca: '1000.02.07', admin_bank: '6000.01.08', admin_merchant: '6000.01.36', piutang_bca: '1100.14', piutang_gobiz: '1100.18', piutang_ovo: '1100.24' },
  'SMB GOLD LOUNGE': { settlement_bca: '1000.02.08', admin_bank: '6000.01.08', admin_merchant: '6000.01.36', piutang_bca: '1100.15', piutang_gobiz: '1100.19', piutang_ovo: '1100.25' },
  'SMS':             { settlement_bca: '1000.02.04', admin_bank: '6000.01.08', admin_merchant: '6000.01.36', piutang_bca: '1100.11', piutang_gobiz: '1100.20', piutang_ovo: '1100.26' },
}

// ─── Customer mapping (inlined) ───────────────────────────────────────────────

const CUSTOMER_MAPPING: Record<string, string> = {
  '1100.12': 'C.00098',
  '1100.16': 'C.00006', '1100.06': 'C.00006', '1100.17': 'C.00006',
  '1100.18': 'C.00006', '1100.19': 'C.00006', '1100.20': 'C.00006',
  '1100.22': 'C.00046', '1100.21': 'C.00046', '1100.23': 'C.00046',
  '1100.24': 'C.00046', '1100.25': 'C.00046', '1100.26': 'C.00046',
  '1100.13': 'C.00045', '1100.01': 'C.00045', '1100.10': 'C.00045',
  '1100.14': 'C.00045', '1100.15': 'C.00045', '1100.11': 'C.00045',
}

// ─── Setup ────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SERVICE_SUPABASE_KEY!
const supabase    = createClient(supabaseUrl, supabaseKey)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wibNow(): string {
  return new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).replace(/\//g, '-')
}
function wibFileStamp(): string {
  const d = new Date(new Date().getTime() + 7 * 3600 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}_${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
}
function r2(n: number): number  { return Math.round(n * 100) / 100 }
function hasDecimal(n: number): boolean { return n !== Math.round(n) }
function fmt(n: number): string {
  return n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

class Logger {
  private logPath: string; private lines: string[] = []
  constructor(logDir: string) {
    fs.mkdirSync(logDir, { recursive: true })
    this.logPath = path.join(logDir, `audit_fix_decimals_${wibFileStamp()}.log`)
  }
  write(line: string) { this.lines.push(line); console.log(line) }
  section(title: string) { const b = '─'.repeat(70); this.write(b); this.write(title); this.write(b) }
  flush() { fs.writeFileSync(this.logPath, this.lines.join('\n') + '\n', 'utf-8') }
  get path() { return this.logPath }
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

interface CsvRow {
  revenueDate: string  // YYYY-MM-DD
  kredit_bca:  number
  debit_bca:   number
  qris_bca:    number
  gobiz:       number
  ovo:         number
}

function parseNum(raw: string | undefined): number {
  if (!raw?.trim()) return 0
  return parseFloat(raw.replace(/[^\d.-]/g, '')) || 0
}

function parseCsv(filePath: string, store: string, from: string, to: string): CsvRow[] {
  const lines   = fs.readFileSync(filePath, 'utf-8').split('\n').map(l => l.trim()).filter(Boolean)
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toUpperCase())

  const col = (row: string[], name: string) => {
    const idx = headers.indexOf(name)
    return idx >= 0 ? row[idx]?.replace(/"/g, '').trim() : undefined
  }

  const results: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    // CSV-aware split (handle quoted commas)
    const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, '').trim())

    const rawDate  = col(cols, 'TANGGAL') ?? cols[0]
    const rawStore = col(cols, 'TOKO')    ?? cols[1]
    if (!rawDate || !rawStore) continue
    if (rawStore.toUpperCase() !== store) continue

    // Parse DD/MM/YYYY or D/M/YY into YYYY-MM-DD
    const parts = rawDate.split(/[\/\-]/)
    if (parts.length !== 3) continue
    let [d, m, y] = parts
    if (d.length === 4) { [y, m, d] = [d, m, parts[2]] }
    const year = y.length === 2 ? `20${y}` : y
    const revenueDate = `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`

    if (revenueDate < from || revenueDate > to) continue

    results.push({
      revenueDate,
      kredit_bca: parseNum(col(cols, 'KREDIT BCA')),
      debit_bca:  parseNum(col(cols, 'DEBIT BCA')),
      qris_bca:   parseNum(col(cols, 'QRIS BCA')),
      gobiz:      parseNum(col(cols, 'MASUK GO-BIZ')),
      ovo:        parseNum(col(cols, 'MASUK OVO')),
    })
  }

  return results.sort((a, b) => a.revenueDate.localeCompare(b.revenueDate))
}

// ─── Accurate auth ────────────────────────────────────────────────────────────

type Conn = { accessToken: string; sessionId: string; apiBaseUrl: string }

async function getAccurateConnection(): Promise<Conn> {
  const { data: tokenData, error } = await supabase.from('accurate_tokens').select('*').limit(1).maybeSingle()
  if (error || !tokenData) throw new Error(`No Accurate tokens found. ${error?.message ?? ''}`)

  let accessToken = tokenData.access_token
  if (new Date(tokenData.expires_at) <= new Date()) {
    const authHeader = Buffer.from(`${process.env.ACCURATE_OAUTH_CLIENT_ID}:${process.env.ACCURATE_OAUTH_CLIENT_SECRET}`).toString('base64')
    const r = await axios.post('https://account.accurate.id/oauth/token',
      new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokenData.refresh_token }).toString(),
      { headers: { Authorization: `Basic ${authHeader}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
    accessToken = r.data.access_token
    await supabase.from('accurate_tokens').update({
      access_token: accessToken, refresh_token: r.data.refresh_token,
      expires_at: new Date(Date.now() + r.data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', tokenData.id)
  }

  async function trySession(token: string): Promise<Conn> {
    const dbList = await axios.get('https://account.accurate.id/api/db-list.do', { headers: { Authorization: `Bearer ${token}` } })
    const sess   = await axios.get(`https://account.accurate.id/api/open-db.do?id=${dbList.data.d[0].id}`, { headers: { Authorization: `Bearer ${token}` } })
    return { accessToken: token, sessionId: sess.data.session, apiBaseUrl: `${sess.data.host}/accurate` }
  }

  try { return await trySession(accessToken) } catch (e: any) {
    if (e.response?.status !== 401) throw e
    const envToken = process.env.ACCURATE_ACCESS_TOKEN
    if (!envToken) throw new Error('401 and no ACCURATE_ACCESS_TOKEN in .env.local')
    const conn = await trySession(envToken)
    await supabase.from('accurate_tokens').update({ access_token: envToken, updated_at: new Date().toISOString() }).eq('id', tokenData.id)
    return conn
  }
}

// ─── Journal lookup ───────────────────────────────────────────────────────────

interface JournalData {
  id: number
  transDate: string
  detail: any[]
}

async function lookupJournal(description: string, conn: Conn): Promise<JournalData | null> {
  const headers = { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }

  const listRes = await axios.get(`${conn.apiBaseUrl}/api/journal-voucher/list.do`, {
    params: { fields: 'id,description,transDate', 'filter.keywords.op': 'EQUAL', 'filter.keywords.val': description },
    headers,
  })
  if (!listRes.data.s || !listRes.data.d?.length) return null
  const j = listRes.data.d[0]

  const detRes = await axios.get(`${conn.apiBaseUrl}/api/journal-voucher/detail.do`, {
    params: { id: j.id },
    headers,
  })
  if (!detRes.data.s || !detRes.data.d) return null
  const d = detRes.data.d

  return {
    id:        d.id,
    transDate: d.transDate || d.transactionDate || j.transDate || '',
    detail:    d.detailJournalVoucher || [],
  }
}

// ─── Extract account line amounts from journal ────────────────────────────────

function lineAccount(line: any): string {
  return typeof line.accountNoRef === 'string' ? line.accountNoRef
    : typeof line.accountNo === 'string'       ? line.accountNo
    : typeof line.account?.number === 'string' ? line.account.number
    : String(line.accountNoRef ?? line.accountNo ?? '')
}

function lineAmount(line: any): number {
  return Math.round(Number(line.amount ?? 0) * 100) / 100
}

function sumCredits(detail: any[], accountNo: string): number {
  return r2(
    detail
      .filter(l => lineAccount(l) === accountNo && (l.amountType ?? '').toUpperCase() === 'CREDIT')
      .reduce((s, l) => s + lineAmount(l), 0)
  )
}

// ─── normaliseDetail (for save.do) ────────────────────────────────────────────

function normaliseDetail(line: any): any {
  const accountNo = lineAccount(line)
  const amountType: 'DEBIT' | 'CREDIT' =
    (line.amountType ?? line.detailType ?? '').toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT'
  const amount = Math.round(Number(line.amount ?? 0) * 100) / 100

  const out: any = { accountNo, amountType, amount }

  const customerNo = line.customer?.no || line.customer?.number || line.customerNo || CUSTOMER_MAPPING[accountNo]
  if (customerNo) { out.customerNo = customerNo; out.subsidiaryType = 'CUSTOMER' }

  return out
}

// ─── Confirm ──────────────────────────────────────────────────────────────────

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => { rl.question(question, ans => { rl.close(); resolve(ans.trim().toLowerCase() === 'y') }) })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const logDir = path.join(process.cwd(), 'scripts/finance/logs')
  const log    = new Logger(logDir)

  log.write('BREW — Audit & Fix Uang Masuk Decimal Amounts')
  log.write(`Mode       : ${isDryRun ? '🔍 DRY RUN' : '✏️  LIVE'}`)
  log.write(`Toko       : ${storeFilter}`)
  log.write(`Periode    : ${dateFrom} s/d ${dateTo}  (tanggal keterangan jurnal)`)
  log.write(`CSV        : ${csvPath}`)
  log.write(`Dijalankan : ${wibNow()} WIB`)
  log.write(`Log        : ${log.path}`)
  log.write('')

  const cfg = STORE_CFG[storeFilter]
  if (!cfg) {
    log.write(`❌ Store "${storeFilter}" tidak ada di STORE_CFG.`)
    log.flush(); process.exit(1)
  }

  // ── 1. Parse CSV ─────────────────────────────────────────────────────────────
  log.section('FASE 1 — BACA CSV')

  if (!fs.existsSync(csvPath)) {
    log.write(`❌ File tidak ditemukan: ${csvPath}`)
    log.flush(); process.exit(1)
  }

  const csvRows = parseCsv(csvPath, storeFilter, dateFrom, dateTo)
  log.write(`Ditemukan ${csvRows.length} baris untuk ${storeFilter} antara ${dateFrom} dan ${dateTo}`)
  log.flush()

  if (csvRows.length === 0) {
    log.write('Tidak ada baris CSV yang cocok.')
    log.flush(); process.exit(0)
  }

  // ── 2. Connect to Accurate ───────────────────────────────────────────────────
  log.write('\nMenghubungkan ke Accurate...')
  const conn = await getAccurateConnection()
  log.write(`✅ Terhubung. Session: ${conn.sessionId}`)
  log.write('')

  // ── 3. Audit each date ───────────────────────────────────────────────────────
  log.section('FASE 2 — AUDIT (bandingkan CSV vs Accurate)')

  type Fix = {
    lineIdx:       number
    accountNo:     string
    amountType:    'DEBIT' | 'CREDIT'
    label:         string
    currentAmount: number
    correctAmount: number
  }

  type DateResult = {
    revenueDate: string
    journalDesc: string
    journalId:   number
    transDate:   string
    rawDetail:   any[]
    fixes:       Fix[]
  }

  const toFix:    DateResult[] = []
  const noFix:    string[]     = []
  const notFound: string[]     = []

  for (let i = 0; i < csvRows.length; i++) {
    const row = csvRows[i]
    const { revenueDate, kredit_bca, debit_bca, qris_bca, gobiz, ovo } = row

    const [y, m, d] = revenueDate.split('-')
    const ddmmyyyy   = `${d}/${m}/${y}`
    const journalDesc = `BREW - UANG MASUK STRADA ${storeFilter} ${ddmmyyyy}`

    process.stdout.write(`\r  [${i+1}/${csvRows.length}] ${revenueDate} ...              `)

    const journal = await lookupJournal(journalDesc, conn)
    if (!journal) {
      notFound.push(revenueDate)
      log.write(`\n  ⚠️  TIDAK DITEMUKAN  ${revenueDate}  ${journalDesc}`)
      log.flush()
      await new Promise(r => setTimeout(r, 300))
      continue
    }

    // Derive correct amounts
    const csvBcaSum      = r2(kredit_bca + debit_bca + qris_bca)
    const csvGobizOvoSum = r2(gobiz + ovo)
    const correctSettlement = r2(csvBcaSum + csvGobizOvoSum)

    const posBcaFromJournal     = sumCredits(journal.detail, cfg.piutang_bca)
    const posGobizFromJournal   = sumCredits(journal.detail, cfg.piutang_gobiz)
    const posOvoFromJournal     = sumCredits(journal.detail, cfg.piutang_ovo)
    const correctAdminBank      = r2(posBcaFromJournal - csvBcaSum)
    const correctMerchant       = r2((posGobizFromJournal + posOvoFromJournal) - csvGobizOvoSum)

    // Find DEBIT lines to check
    const fixes: Fix[] = []

    const checkLine = (
      accountNo: string,
      correctAmount: number,
      label: string,
      preferLargest = false
    ) => {
      if (!hasDecimal(correctAmount)) return  // nothing to fix if correct is already whole

      const candidates = journal.detail
        .map((line: any, idx: number) => ({
          idx,
          accountNo: lineAccount(line),
          amountType: (line.amountType ?? '').toUpperCase(),
          amount: lineAmount(line),
        }))
        .filter(l =>
          l.accountNo === accountNo &&
          l.amountType === 'DEBIT' &&
          Math.round(correctAmount) === Math.round(l.amount)  // integer parts must match
        )

      if (!candidates.length) return

      const match = preferLargest
        ? candidates.reduce((a, b) => a.amount > b.amount ? a : b)
        : candidates[0]

      // Confirm: current is rounded version of correct, and they actually differ
      if (Math.round(correctAmount) === Math.round(match.amount) && correctAmount !== match.amount) {
        fixes.push({
          lineIdx:       match.idx,
          accountNo,
          amountType:    'DEBIT',
          label,
          currentAmount: match.amount,
          correctAmount,
        })
      }
    }

    checkLine(cfg.settlement_bca, correctSettlement, 'Settlement BCA',      true)
    checkLine(cfg.admin_bank,     correctAdminBank,  'Biaya Admin Bank')
    checkLine(cfg.admin_merchant, correctMerchant,   'Biaya Merchant Online')

    if (fixes.length > 0) {
      toFix.push({
        revenueDate, journalDesc,
        journalId: journal.id,
        transDate: journal.transDate,
        rawDetail: journal.detail,
        fixes,
      })
    } else {
      noFix.push(revenueDate)
    }

    await new Promise(r => setTimeout(r, 250))
  }

  process.stdout.write('\n')
  log.write('')
  log.write(`Total tanggal CSV       : ${csvRows.length}`)
  log.write(`  → Perlu difix         : ${toFix.length}`)
  log.write(`  → Sudah benar / skip  : ${noFix.length}`)
  log.write(`  → Jurnal tidak ada    : ${notFound.length}`)
  if (notFound.length) log.write(`     ${notFound.join(', ')}`)
  log.write('')

  if (toFix.length === 0) {
    log.write('Tidak ada jurnal yang perlu difix.')
    log.flush(); process.exit(0)
  }

  // ── 4. Preview ───────────────────────────────────────────────────────────────
  log.section('PREVIEW PERUBAHAN')

  for (const item of toFix) {
    log.write(`\n  ${item.revenueDate}  |  ${item.journalDesc}  (id: ${item.journalId})`)
    for (const fix of item.fixes) {
      log.write(`    ${fix.label.padEnd(26)} [${fix.accountNo}] DEBIT`)
      log.write(`      SEKARANG : Rp ${fmt(fix.currentAmount)}`)
      log.write(`      BENAR    : Rp ${fmt(fix.correctAmount)}`)
      log.write(`      CEK      : Math.round(${fmt(fix.correctAmount)}) = ${Math.round(fix.correctAmount)} = ${Math.round(fix.currentAmount)} ✓`)
    }
  }

  log.flush()

  if (isDryRun) {
    log.write('\n=== DRY RUN SELESAI — tidak ada yang disimpan ===')
    log.flush(); process.exit(0)
  }

  // ── 5. Confirm ───────────────────────────────────────────────────────────────
  const ok = await confirm(`\n⚠️  Fix ${toFix.length} jurnal di Accurate? TIDAK BISA dibatalkan. (y/n): `)
  if (!ok) {
    log.write(`\n[${wibNow()} WIB] Dibatalkan.`)
    log.flush(); process.exit(0)
  }

  // ── 6. Patch ─────────────────────────────────────────────────────────────────
  log.write('')
  log.section('FASE 3 — PATCH')

  const headers = { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }
  let saved = 0, failed = 0

  for (let i = 0; i < toFix.length; i++) {
    const { revenueDate, journalId, transDate, rawDetail, fixes } = toFix[i]
    const prefix = `  [${String(i + 1).padStart(3)}/${toFix.length}]`

    const updatedLines = rawDetail.map(normaliseDetail)
    for (const fix of fixes) {
      updatedLines[fix.lineIdx].amount = fix.correctAmount
    }

    try {
      const res = await axios.post(
        `${conn.apiBaseUrl}/api/journal-voucher/save.do`,
        { id: journalId, transDate, detailJournalVoucher: updatedLines },
        { headers: { ...headers, 'Content-Type': 'application/json' } }
      )

      if (res.data.s !== false) {
        saved++
        const changes = fixes.map(f => `${f.label}: ${fmt(f.currentAmount)} → ${fmt(f.correctAmount)}`).join(' | ')
        log.write(`${prefix} ✅ PATCHED  | ${wibNow()} WIB | ${revenueDate} | ${changes}`)
      } else {
        failed++
        const errMsg = Array.isArray(res.data.d) ? res.data.d.join(', ') : String(res.data.d)
        log.write(`${prefix} ❌ REJECTED | ${wibNow()} WIB | ${revenueDate} | ${errMsg}`)
      }
    } catch (e: any) {
      failed++
      const errMsg = e.response?.data?.d ? JSON.stringify(e.response.data.d) : e.message
      log.write(`${prefix} ❌ ERROR    | ${wibNow()} WIB | ${revenueDate} | ${errMsg}`)
    }

    log.flush()
    await new Promise(r => setTimeout(r, 500))
  }

  // ── 7. Summary ───────────────────────────────────────────────────────────────
  log.write('')
  log.section('RINGKASAN AKHIR')
  log.write(`Selesai pada  : ${wibNow()} WIB`)
  log.write(`Total difix   : ${toFix.length}`)
  log.write(`Berhasil      : ${saved}`)
  log.write(`Gagal         : ${failed}`)
  log.write(`Log tersimpan : ${log.path}`)
  log.flush()
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message)
  if (e.response) {
    console.error('  Status:', e.response.status)
    console.error('  Body  :', JSON.stringify(e.response.data ?? null, null, 2))
  }
  process.exit(1)
})
