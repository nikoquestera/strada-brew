/**
 * mass_delete_jurnal.ts
 *
 * Hapus massal jurnal umum Accurate berdasarkan nomor jurnal.
 *
 * Usage:
 *   npx ts-node -e "require('dotenv').config({path:'.env.local'})" scripts/finance/mass_delete_jurnal.ts
 *   npx ts-node -e "require('dotenv').config({path:'.env.local'})" scripts/finance/mass_delete_jurnal.ts ./scripts/finance/mass_delete_input.csv
 *
 * Input CSV (default: ./scripts/finance/mass_delete_input.csv):
 *   nomor_jurnal
 *   JU-000001
 *   JU-000002
 *
 * The script will:
 *   1. Look up each journal by number to get its internal Accurate ID
 *   2. Ask for confirmation before deleting
 *   3. Delete each journal and report results
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

// ─── Lookup journal internal ID by nomor jurnal ───────────────────────────────

async function lookupJournalId(
  nomor: string,
  conn: { accessToken: string; sessionId: string; apiBaseUrl: string }
): Promise<{ id: number; description: string } | null> {
  const headers = { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }

  // Try detail.do first (fastest path)
  try {
    const res = await axios.get(`${conn.apiBaseUrl}/api/journal-voucher/detail.do`, {
      params: { number: nomor },
      headers
    })
    if (res.data.s && res.data.d?.id) {
      return { id: res.data.d.id, description: res.data.d.description || '' }
    }
  } catch (_) {}

  // Fallback: search via list.do
  try {
    const res = await axios.get(`${conn.apiBaseUrl}/api/journal-voucher/list.do`, {
      params: {
        fields: 'id,no,description',
        'filter.no.op': 'EQUAL',
        'filter.no.val': nomor
      },
      headers
    })
    if (res.data.s && res.data.d?.length > 0) {
      const j = res.data.d[0]
      return { id: j.id, description: j.description || '' }
    }
  } catch (_) {}

  return null
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

  if (!fs.existsSync(csvPath)) {
    console.error(`\n❌ File tidak ditemukan: ${csvPath}`)
    console.error('Buat file dengan kolom "nomor_jurnal", satu nomor per baris.')
    process.exit(1)
  }

  const lines = fs.readFileSync(csvPath, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.toLowerCase().startsWith('nomor_jurnal'))

  if (lines.length === 0) {
    console.error('❌ Tidak ada nomor jurnal di dalam file CSV.')
    process.exit(1)
  }

  console.log(`\nMenghubungkan ke Accurate...`)
  const conn = await getAccurateConnection()
  console.log(`✅ Terhubung. Session: ${conn.sessionId}\n`)

  // Lookup phase
  console.log(`Mencari ${lines.length} jurnal di Accurate...`)
  console.log('─'.repeat(70))

  type JournalEntry = { nomor: string; id: number; description: string }
  type NotFound = { nomor: string }

  const found: JournalEntry[] = []
  const notFound: NotFound[] = []

  for (const nomor of lines) {
    const result = await lookupJournalId(nomor, conn)
    if (result) {
      found.push({ nomor, ...result })
      console.log(`  ✅ FOUND  ${nomor.padEnd(20)} ID: ${String(result.id).padEnd(10)} | ${result.description}`)
    } else {
      notFound.push({ nomor })
      console.log(`  ❌ NOT FOUND  ${nomor}`)
    }
    await new Promise(r => setTimeout(r, 300))
  }

  console.log('─'.repeat(70))
  console.log(`\nRingkasan:`)
  console.log(`  Ditemukan  : ${found.length}`)
  console.log(`  Tidak ada  : ${notFound.length}`)

  if (found.length === 0) {
    console.log('\nTidak ada jurnal yang bisa dihapus.')
    process.exit(0)
  }

  // Confirm
  const ok = await confirm(`\n⚠️  Hapus ${found.length} jurnal? Tindakan ini TIDAK BISA dibatalkan. (y/n): `)
  if (!ok) {
    console.log('Dibatalkan.')
    process.exit(0)
  }

  // Delete phase
  console.log('\nMenghapus jurnal...')
  console.log('─'.repeat(70))

  let deleted = 0
  let failed = 0

  for (let i = 0; i < found.length; i++) {
    const { nomor, id, description } = found[i]
    try {
      const res = await axios.delete(`${conn.apiBaseUrl}/api/journal-voucher/delete.do`, {
        params: { id },
        headers: { Authorization: `Bearer ${conn.accessToken}`, 'X-Session-ID': conn.sessionId }
      })

      if (res.data.s !== false) {
        deleted++
        console.log(`  [${i + 1}/${found.length}] ✅ Deleted  ${nomor} | ${description}`)
      } else {
        failed++
        const errMsg = Array.isArray(res.data.d) ? res.data.d.join(', ') : String(res.data.d)
        console.log(`  [${i + 1}/${found.length}] ❌ Failed   ${nomor} | ${errMsg}`)
      }
    } catch (e: any) {
      failed++
      console.log(`  [${i + 1}/${found.length}] ❌ Error    ${nomor} | ${e.response?.data?.d || e.message}`)
    }

    await new Promise(r => setTimeout(r, 500))
  }

  console.log('─'.repeat(70))
  console.log(`\n✅ Selesai! Berhasil dihapus: ${deleted} | Gagal: ${failed}`)
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message)
  process.exit(1)
})
