/**
 * mass_delete_jurnal.ts
 *
 * Hapus massal jurnal umum Accurate berdasarkan nomor jurnal.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx ts-node -r dotenv/config scripts/finance/mass_delete_jurnal.ts
 *   DOTENV_CONFIG_PATH=.env.local npx ts-node -r dotenv/config scripts/finance/mass_delete_jurnal.ts ./scripts/finance/mass_delete_input.csv
 *
 * Input CSV (default: ./scripts/finance/mass_delete_input.csv):
 *   nomor_jurnal
 *   JU-000001
 *   JU-000002
 *
 * Log file: scripts/finance/logs/mass_delete_YYYYMMDD_HHMMSS.log
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

const DELETE_NOTE = 'Di buatkan kembali oleh BREW'

// ─── WIB Timestamp ───────────────────────────────────────────────────────────

function wibNow(): string {
  return new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).replace(/\//g, '-')
}

function wibFileStamp(): string {
  const d = new Date(new Date().getTime() + 7 * 3600 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
}

// ─── Logger ───────────────────────────────────────────────────────────────────

class Logger {
  private logPath: string
  private lines: string[] = []

  constructor(logDir: string) {
    fs.mkdirSync(logDir, { recursive: true })
    this.logPath = path.join(logDir, `mass_delete_${wibFileStamp()}.log`)
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

async function getAccurateConnection() {
  const { data: tokenData, error } = await supabase.from('accurate_tokens').select('*').limit(1).maybeSingle()
  if (error || !tokenData) throw new Error(`No Accurate tokens found in database. Supabase error: ${error?.message ?? 'null row'}`)

  let accessToken = tokenData.access_token
  const expiresAt = new Date(tokenData.expires_at)
  const isExpired = expiresAt <= new Date()
  console.log(`Token expires_at: ${tokenData.expires_at} — ${isExpired ? 'EXPIRED, refreshing...' : 'still valid'}`)

  if (isExpired) {
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

  async function tryGetSession(token: string) {
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
    if (!envToken) throw new Error('DB token returned 401 and ACCURATE_ACCESS_TOKEN is not set in env.local.')

    console.log('⚠️  DB token invalid (401). Trying ACCURATE_ACCESS_TOKEN from env.local...')
    const conn = await tryGetSession(envToken)

    // Update DB with the working token
    await supabase.from('accurate_tokens').update({
      access_token: envToken,
      updated_at: new Date().toISOString()
    }).eq('id', tokenData.id)
    console.log('✅ DB updated with token from env.local.')

    return conn
  }
}

type Conn = { accessToken: string; sessionId: string; apiBaseUrl: string }

// ─── Lookup journal by nomor ──────────────────────────────────────────────────

async function lookupJournalId(
  nomor: string,
  conn: Conn
): Promise<{ id: number; description: string; transDate: string } | null> {
  const headers = { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }

  try {
    const res = await axios.get(`${conn.apiBaseUrl}/api/journal-voucher/detail.do`, {
      params: { number: nomor },
      headers
    })
    if (res.data.s && res.data.d?.id) {
      return {
        id: res.data.d.id,
        description: res.data.d.description || '',
        transDate: res.data.d.transDate || ''
      }
    }
  } catch (_) {}

  try {
    const res = await axios.get(`${conn.apiBaseUrl}/api/journal-voucher/list.do`, {
      params: {
        fields: 'id,no,description,transDate',
        'filter.no.op': 'EQUAL',
        'filter.no.val': nomor
      },
      headers
    })
    if (res.data.s && res.data.d?.length > 0) {
      const j = res.data.d[0]
      return { id: j.id, description: j.description || '', transDate: j.transDate || '' }
    }
  } catch (_) {}

  return null
}

// ─── Update description before delete (audit trail di Accurate) ──────────────
// Accurate delete.do tidak support field "reason". Workaround: update deskripsi
// jurnal terlebih dahulu supaya ada jejak jika delete gagal atau dicek di log Accurate.

async function prependDeleteNote(
  id: number,
  currentDesc: string,
  conn: Conn
): Promise<void> {
  const newDesc = `[${DELETE_NOTE}] ${currentDesc}`.slice(0, 255)
  const headers = { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }
  try {
    await axios.post(
      `${conn.apiBaseUrl}/api/journal-voucher/save.do`,
      { id, description: newDesc },
      { headers }
    )
  } catch (_) {
    // Non-fatal — lanjut delete walau update gagal
  }
}

// ─── Confirm prompt ───────────────────────────────────────────────────────────

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close()
      resolve(ans.trim().toLowerCase() === 'y')
    })
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2] || path.join(process.cwd(), 'scripts/finance/mass_delete_input.csv')
  const logDir  = path.join(process.cwd(), 'scripts/finance/logs')
  const log     = new Logger(logDir)

  log.write(`BREW — Mass Delete Jurnal Accurate`)
  log.write(`Dijalankan : ${wibNow()} WIB`)
  log.write(`Input CSV  : ${csvPath}`)
  log.write(`Log file   : ${log.path}`)
  log.write('')

  if (!fs.existsSync(csvPath)) {
    log.write(`❌ File tidak ditemukan: ${csvPath}`)
    log.write('Buat file dengan kolom "nomor_jurnal", satu nomor per baris.')
    log.flush()
    process.exit(1)
  }

  const lines = fs.readFileSync(csvPath, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.toLowerCase().startsWith('nomor_jurnal'))

  if (lines.length === 0) {
    log.write('❌ Tidak ada nomor jurnal di dalam file CSV.')
    log.flush()
    process.exit(1)
  }

  log.write(`Total nomor jurnal di CSV: ${lines.length}`)
  log.write('')

  log.write('Menghubungkan ke Accurate...')
  const conn = await getAccurateConnection()
  log.write(`✅ Terhubung. Session: ${conn.sessionId}`)
  log.write('')

  // ── Lookup phase ────────────────────────────────────────────────────────────
  log.section('FASE 1 — LOOKUP')

  type JournalEntry = { nomor: string; id: number; description: string; transDate: string }
  const found: JournalEntry[] = []
  const notFound: string[] = []

  for (const nomor of lines) {
    const result = await lookupJournalId(nomor, conn)
    if (result) {
      found.push({ nomor, ...result })
      log.write(`  ✅ FOUND      ${nomor.padEnd(22)} ID: ${String(result.id).padEnd(10)} | Tgl: ${result.transDate.padEnd(12)} | ${result.description}`)
    } else {
      notFound.push(nomor)
      log.write(`  ❌ NOT FOUND  ${nomor}`)
    }
    await new Promise(r => setTimeout(r, 300))
  }

  log.write('')
  log.write(`Ditemukan  : ${found.length}`)
  log.write(`Tidak ada  : ${notFound.length}`)
  if (notFound.length > 0) {
    log.write(`Tidak ditemukan: ${notFound.join(', ')}`)
  }
  log.flush() // simpan hasil lookup sebelum konfirmasi

  if (found.length === 0) {
    log.write('\nTidak ada jurnal yang bisa dihapus.')
    log.flush()
    process.exit(0)
  }

  // ── Confirmation ────────────────────────────────────────────────────────────
  const ok = await confirm(`\n⚠️  Hapus ${found.length} jurnal? Tindakan ini TIDAK BISA dibatalkan. (y/n): `)
  if (!ok) {
    log.write(`\n[${wibNow()} WIB] Proses dibatalkan oleh user.`)
    log.flush()
    process.exit(0)
  }

  // ── Delete phase ─────────────────────────────────────────────────────────────
  log.write('')
  log.section(`FASE 2 — DELETE  (Keterangan: "${DELETE_NOTE}")`)

  let deleted = 0
  let failed  = 0

  for (let i = 0; i < found.length; i++) {
    const { nomor, id, description, transDate } = found[i]
    const prefix = `  [${String(i + 1).padStart(3)}/${found.length}]`

    // Update deskripsi di Accurate sebelum hapus (audit trail)
    await prependDeleteNote(id, description, conn)

    try {
      const res = await axios.delete(`${conn.apiBaseUrl}/api/journal-voucher/delete.do`, {
        params: { id },
        headers: { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }
      })

      if (res.data.s !== false) {
        deleted++
        log.write(`${prefix} ✅ DELETED  | ${wibNow()} WIB | ${nomor.padEnd(22)} | Tgl jurnal: ${transDate.padEnd(12)} | ${description}`)
      } else {
        failed++
        const errMsg = Array.isArray(res.data.d) ? res.data.d.join(', ') : String(res.data.d)
        log.write(`${prefix} ❌ FAILED   | ${wibNow()} WIB | ${nomor.padEnd(22)} | Error: ${errMsg}`)
      }
    } catch (e: any) {
      failed++
      const errMsg = e.response?.data?.d ? JSON.stringify(e.response.data.d) : e.message
      log.write(`${prefix} ❌ ERROR    | ${wibNow()} WIB | ${nomor.padEnd(22)} | Error: ${errMsg}`)
    }

    log.flush() // simpan setiap entri langsung (bisa dilihat realtime)
    await new Promise(r => setTimeout(r, 500))
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  log.write('')
  log.section('RINGKASAN AKHIR')
  log.write(`Selesai pada : ${wibNow()} WIB`)
  log.write(`Total proses : ${found.length}`)
  log.write(`Berhasil     : ${deleted}`)
  log.write(`Gagal        : ${failed}`)
  log.write(`Tidak ada    : ${notFound.length}`)
  log.write(`Log tersimpan: ${log.path}`)
  log.flush()
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message)
  if (e.response) {
    console.error('  Status :', e.response.status)
    console.error('  URL    :', e.config?.url)
    console.error('  Body   :', JSON.stringify(e.response.data ?? null, null, 2))
  } else if (e.config) {
    console.error('  URL    :', e.config.url)
  }
  process.exit(1)
})
