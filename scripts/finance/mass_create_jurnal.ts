/**
 * mass_create_jurnal.ts
 *
 * Runs the identical loop to REVENUE STORE UI for mass input CSV.
 * Fetches Quinos data, combines with Bank Income, saves to Supabase, 
 * and submits both Penjualan and Uang Masuk to Accurate.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as dotenv from 'dotenv'
import axios from 'axios'
import { fetchQuinosRevenue, createQuinosSession } from '../../src/lib/finance/quinos'
import { ACCURATE_MAPPING } from '../../src/lib/finance/accurate-mapping'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SERVICE_SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Setup Logging
const logFile = path.join(process.cwd(), 'mass_create_jurnal.log')
const logStream = fs.createWriteStream(logFile, { flags: 'a' })
logStream.write(`\n\n=== RUN STARTED AT ${new Date().toISOString()} ===\n`)

function writeLog(msg: string) {
  const timestamp = new Date().toISOString()
  logStream.write(`[${timestamp}] ${msg}\n`)
}

const originalLog = console.log
console.log = (...args: any[]) => {
  originalLog(...args)
  writeLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
}

const originalError = console.error
console.error = (...args: any[]) => {
  originalError(...args)
  writeLog('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
}

const originalWarn = console.warn
console.warn = (...args: any[]) => {
  originalWarn(...args)
  writeLog('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
}

// 1. Helpers
function parseDate(raw: string): string {
  const parts = raw.trim().split(/[\/-]/)
  if (parts.length !== 3) throw new Error(`Format tanggal tidak dikenali: "${raw}"`)
  let [d, m, y] = parts
  
  // Handle YYYY-MM-DD
  if (d.length === 4) {
    return `${d}-${m.padStart(2, '0')}-${y.padStart(2, '0')}`
  }

  // Handle D/M/YY or D/M/YYYY
  const year = y.length === 2 ? `20${y}` : y
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function parseNum(raw: string): number {
  if (!raw || !raw.trim()) return 0
  return parseFloat(raw.replace(/[^\d-]/g, '')) || 0
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, ans => { rl.close(); resolve(ans.trim().toLowerCase() === 'y') })
  })
}

const addDetail = (details: any[], account: string, type: 'DEBIT' | 'CREDIT', amount: number) => {
  if (!account || amount === 0) return
  const trimmedAccount = account.trim()
  
  let finalType = type
  let finalAmount = amount
  if (finalAmount < 0) {
    finalType = type === 'DEBIT' ? 'CREDIT' : 'DEBIT'
    finalAmount = Math.abs(finalAmount)
  }

  const roundedAmount = Math.round(finalAmount) // IDR has no sub-rupiah; integer avoids Accurate floating point rejection
  if (roundedAmount <= 0) return

  const detail: any = { accountNo: trimmedAccount, amountType: finalType, amount: roundedAmount }

  const customerNo = ACCURATE_MAPPING.CUSTOMER_MAPPING[trimmedAccount]
  if (customerNo) { detail.customerNo = customerNo; detail.subsidiaryType = 'CUSTOMER' }

  const vendorNo = ACCURATE_MAPPING.VENDOR_MAPPING[trimmedAccount]
  if (vendorNo) { detail.vendorNo = vendorNo; detail.subsidiaryType = 'VENDOR' }
  
  details.push(detail)
}

async function getAccurateConnection() {
  const { data: tokenData, error } = await supabase.from('accurate_tokens').select('*').limit(1).maybeSingle()
  if (error || !tokenData) throw new Error('No Accurate tokens found in database.')

  let accessToken = tokenData.access_token
  if (new Date(tokenData.expires_at) <= new Date()) {
    console.log('Token Accurate expired, refreshing...')
    const authHeader = Buffer.from(`${process.env.ACCURATE_OAUTH_CLIENT_ID}:${process.env.ACCURATE_OAUTH_CLIENT_SECRET}`).toString('base64')
    const refreshRes = await axios.post('https://account.accurate.id/oauth/token', 
      new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokenData.refresh_token }).toString(),
      { headers: { 'Authorization': `Basic ${authHeader}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
    accessToken = refreshRes.data.access_token
    await supabase.from('accurate_tokens').update({
      access_token: accessToken,
      refresh_token: refreshRes.data.refresh_token,
      expires_at: new Date(Date.now() + refreshRes.data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', tokenData.id)
  }

  const dbListRes = await axios.get('https://account.accurate.id/api/db-list.do', { headers: { 'Authorization': `Bearer ${accessToken}` } })
  const dbId = dbListRes.data.d[0].id
  const sessionRes = await axios.get(`https://account.accurate.id/api/open-db.do?id=${dbId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } })
  
  return {
    accessToken,
    sessionId: sessionRes.data.session,
    apiBaseUrl: `${sessionRes.data.host}/accurate`
  }
}

// 2. CSV Parser
function parseCSV(filePath: string) {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  if (lines.length < 2) throw new Error('CSV kosong atau hanya header.')

  const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim().toUpperCase())

  const rowsMap = new Map<string, any>() // Group by date + store

  let skippedEmpty = 0
  let skippedDateError = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim())
    const tanggal = cols[headers.indexOf('TANGGAL')] || cols[0]
    const storeName = cols[headers.indexOf('TOKO')] || cols[1]

    if (!tanggal || !storeName) {
      skippedEmpty++
      continue
    }

    let date: string
    try { 
      date = parseDate(tanggal) 
    } catch (e: any) { 
      skippedDateError++
      continue 
    }

    const get = (colName: string) => {
      const idx = headers.indexOf(colName)
      if (idx < 0 || !cols[idx]) return 0
      const raw = cols[idx].replace(/,/g, '')
      return parseFloat(raw) || 0
    }

    const key = `${date}_${storeName.toUpperCase()}`
    if (rowsMap.has(key)) {
      console.warn(`  ⚠️  Duplicate entry for ${date} - ${storeName.toUpperCase()} at line ${i + 1}. Overwriting previous row.`)
    }
    rowsMap.set(key, {
      date,
      store: storeName.toUpperCase(),
      submitPenjualan: true,
      submitUangMasuk: true,
      autoBalance: true,
      bankData: {
        cash_income:       get('MASUK CASH') + get('CASH'),
        bca_kredit_income: get('KREDIT BCA'),
        bca_debit_income:  get('DEBIT BCA') + get('DEBIT'),
        bca_qris_income:   get('QRIS BCA') + get('QRIS'),
        gobiz_income:      get('MASUK GO-BIZ') + get('GO-BIZ') + get('GOBIZ'),
        ovo_income:        get('MASUK OVO') + get('OVO'),
        transfer_income:   get('TRANSFER') + get('DEBIT BRI') + get('KREDIT BRI')
      }
    })
  }

  if (skippedEmpty > 0) console.warn(`  ⚠️  Skipped ${skippedEmpty} rows with missing date or store.`)
  if (skippedDateError > 0) console.warn(`  ⚠️  Skipped ${skippedDateError} rows with invalid date format.`)

  return Array.from(rowsMap.values())
}

// 3. Result Types
type RowResult =
  | { status: 'sukses' }
  | { status: 'dilewati' }
  | { status: 'error'; kategori: string; date: string; store: string; jurnal: string }

function kategorikanError(msg: string): string {
  if (msg.includes('SESSION_EXPIRED') || msg.includes('session expired')) return 'Quinos Session Expired'
  if (msg.includes('Data kosong') || msg.includes('toko mungkin tutup')) return 'Toko Tutup / Data Kosong'
  if (msg.includes('Jurnal tidak seimbang') || msg.includes('Selisih Rp') || msg.includes('tidak balance')) return 'Jurnal Tidak Seimbang'
  if (msg.includes('No mapping for store')) return 'Store Tidak Ada di Mapping'
  if (msg.includes('Accurate Reject')) return 'Ditolak Accurate'
  if (msg.includes('HTTP 401') || msg.includes('HTTP 403')) return 'Auth Error Accurate'
  if (msg.includes('HTTP 5') || msg.includes('no-response')) return 'Server/Network Error'
  return 'Error Lainnya'
}

// Process Row
async function processRow(row: any, accurateConn: any, quinosCookiesRef: { cookies: string[] }): Promise<RowResult> {
  const { accessToken, sessionId, apiBaseUrl } = accurateConn
  const { date, store, submitPenjualan, submitUangMasuk, autoBalance, bankData } = row
  const mapping = ACCURATE_MAPPING.STORES[store]

  if (!mapping) {
    console.error(`[${date} ${store}] Skipped: No mapping for store.`)
    return { status: 'error', kategori: 'Store Tidak Ada di Mapping', date, store, jurnal: '-' }
  }

  let activeJurnal = '-'

  try {
    const dateParts = date.split('-')
    const accurateDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
    const memoPenjualan = `BREW - PENJUALAN STRADA ${store} ${accurateDate}`
    const memoUangMasuk = `BREW - UANG MASUK STRADA ${store} ${accurateDate}`

    const checkExists = async (memo: string) => {
      try {
        const checkRes = await axios.get(`${apiBaseUrl}/api/journal-voucher/list.do`, {
          params: { fields: 'id,description', 'filter.keywords.op': 'EQUAL', 'filter.keywords.val': memo },
          headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Session-ID': sessionId }
        })
        return checkRes.data.s && checkRes.data.d?.length > 0
      } catch (e) {
        return false
      }
    }

    let skipPenjualan = false
    let skipUangMasuk = false

    if (submitPenjualan) {
      skipPenjualan = await checkExists(memoPenjualan)
      if (skipPenjualan) console.log(`     ⏭️  Jurnal Penjualan sudah ada di Accurate.`)
    } else {
      skipPenjualan = true
    }

    if (submitUangMasuk) {
      skipUangMasuk = await checkExists(memoUangMasuk)
      if (skipUangMasuk) console.log(`     ⏭️  Jurnal Uang Masuk sudah ada di Accurate.`)
    } else {
      skipUangMasuk = true
    }

    if (skipPenjualan && skipUangMasuk) {
      console.log(`     ⏭️  Semua jurnal untuk hari ini sudah selesai, dilewati tanpa memanggil API Quinos.`)
      return { status: 'dilewati' }
    }

    const runPenjualan = submitPenjualan && !skipPenjualan
    const runUangMasuk = submitUangMasuk && !skipUangMasuk

    console.log(`     📡 Mengambil data dari Quinos...`)
    let qData: any
    let rawQuinosPayments: Array<{code: string, amount: number}> = []
    try {
      qData = await fetchQuinosRevenue(date, store, () => {}, quinosCookiesRef.cookies, (p) => { rawQuinosPayments = p })
    } catch (e: any) {
      if (e.message?.startsWith('SESSION_EXPIRED')) {
        console.warn(`     🔄 Session Quinos expired, re-login...`)
        quinosCookiesRef.cookies = await createQuinosSession()
        console.log(`     ✅ Re-login berhasil! Mencoba ulang...`)
        qData = await fetchQuinosRevenue(date, store, () => {}, quinosCookiesRef.cookies, (p) => { rawQuinosPayments = p })
      } else {
        throw e
      }
    }

    // Upsert to Supabase
    await supabase.from('daily_revenue').upsert(
      { ...qData, updated_at: new Date().toISOString() },
      { onConflict: 'store_name,transaction_date' }
    )
    
    // Combine with Bank Data
    const resultData: any = {
      ...qData,
      store_name: store,
      transaction_date: date,
      bca_kredit_income: bankData.bca_kredit_income,
      bca_debit_income: bankData.bca_debit_income,
      bca_qris_income: bankData.bca_qris_income,
      gobiz_income: bankData.gobiz_income,
      ovo_income: bankData.ovo_income,
      cash_income: bankData.cash_income,
    }

    const bcaKreditIncome = bankData.bca_kredit_income || 0
    const bcaDebitIncome = bankData.bca_debit_income || 0
    const bcaQrisIncome = bankData.bca_qris_income || 0
    const gobizIncome = bankData.gobiz_income || 0
    const ovoIncome = bankData.ovo_income || 0

    const paymentCreditBca = resultData.payment_credit_bca || 0
    const paymentDebitBca = resultData.payment_debit_bca || 0
    const paymentQris = resultData.payment_qris || 0
    const paymentGobiz = resultData.payment_gobiz || 0
    const paymentOvo = resultData.payment_ovo || 0

    // Calculate fees (matching UI logic where negative means over-settlement)
    // Fee = POS - Bank. If Bank > POS, fee is negative (Credit entry).
    const creditFee = paymentCreditBca - bcaKreditIncome
    const debitFee = paymentDebitBca - bcaDebitIncome
    const qrisFee = paymentQris - bcaQrisIncome
    
    resultData.biaya_admin_bank = creditFee + debitFee + qrisFee
    resultData.biaya_penjualan_merchant_online = (paymentGobiz - gobizIncome) + (paymentOvo - ovoIncome)

    const posTotal = paymentCreditBca + paymentDebitBca + paymentQris + paymentGobiz + paymentOvo + (resultData.payment_cash || 0) + (resultData.payment_transfer || 0)
    const bankTotal = bcaKreditIncome + bcaDebitIncome + bcaQrisIncome + gobizIncome + ovoIncome + (resultData.cash_income || 0) + (bankData.transfer_income || 0)

    // Save Bank incomes back to DB
    const recordData = {
      ...resultData,
      updated_at: new Date().toISOString()
    }
    await supabase.from('daily_revenue').upsert(recordData, { onConflict: 'store_name,transaction_date' })

    // Validations & Balancing
    const allPaymentsGross = Object.entries(resultData).filter(([k]) => k.startsWith('payment_')).reduce((s, [_, v]) => s + (v as number || 0), 0)
    const totalDebit = allPaymentsGross + (resultData.revenue_discount || 0)
    const totalCredit = (resultData.penjualan_bar || 0) + (resultData.penjualan_coffee_beans || 0) + 
                        (resultData.penjualan_makanan || 0) + (resultData.penjualan_konsinyasi || 0) + 
                        (resultData.penjualan_bundling || 0) + (resultData.penjualan_inventory || 0) + 
                        (resultData.penjualan_modifier || 0) + (resultData.penjualan_konsinyasi_no_brand || 0) + 
                        (resultData.hutang_service || 0) + (resultData.hutang_pajak_pemkot || 0)
    
    const diffBalance = totalDebit - totalCredit
    const absDiff = Math.abs(diffBalance)
    const isUnbalanced = absDiff > 0.01

    let balancingData = null
    let isBalanceApproved = false

    if (isUnbalanced) {
      if (!autoBalance) {
        console.error(`     ❌ Skipped: Jurnal Penjualan tidak seimbang sebesar Rp ${absDiff.toLocaleString('id-ID')} (Debit: ${totalDebit}, Credit: ${totalCredit}). Auto-Balance mati.`)
        return { status: 'error', kategori: 'Jurnal Tidak Seimbang', date, store, jurnal: 'Penjualan' }
      }

      if (absDiff > 15000) {
        console.log(`\n     🛑 [INVESTIGASI] KETIDAKSEIMBANGAN TERDETEKSI (> 15.000)`)
        console.log(`     Tanggal: ${date} | Toko: ${store}`)
        console.log(`     Total Penjualan (POS Quinos): Rp ${totalCredit.toLocaleString('id-ID')}`)
        console.log(`     Total Pembayaran (POS Quinos): Rp ${allPaymentsGross.toLocaleString('id-ID')}`)
        console.log(`     Selisih Jurnal: Rp ${absDiff.toLocaleString('id-ID')}`)
        console.log(`     --------------------------------------------------`)
        console.log(`     [ANALISA PEMBAYARAN VS BANK]`)
        console.log(`     - KREDIT BCA: POS (Rp ${paymentCreditBca.toLocaleString('id-ID')}) vs Bank (Rp ${bcaKreditIncome.toLocaleString('id-ID')}) | Selisih: Rp ${(paymentCreditBca - bcaKreditIncome).toLocaleString('id-ID')}`)
        console.log(`     - DEBIT BCA : POS (Rp ${paymentDebitBca.toLocaleString('id-ID')}) vs Bank (Rp ${bcaDebitIncome.toLocaleString('id-ID')}) | Selisih: Rp ${(paymentDebitBca - bcaDebitIncome).toLocaleString('id-ID')}`)
        console.log(`     - QRIS BCA  : POS (Rp ${paymentQris.toLocaleString('id-ID')}) vs Bank (Rp ${bcaQrisIncome.toLocaleString('id-ID')}) | Selisih: Rp ${(paymentQris - bcaQrisIncome).toLocaleString('id-ID')}`)
        console.log(`     --------------------------------------------------`)
        console.log(`     [SEMUA KODE PEMBAYARAN RAW DARI QUINOS]`)
        const knownCodes = rawQuinosPayments.map(p => p.code)
        for (const p of rawQuinosPayments.sort((a, b) => b.amount - a.amount)) {
          // Check if this code was picked up by any payment_ field in resultData
          const matchedField = Object.entries(resultData).find(
            ([k, v]) => k.startsWith('payment_') && (v as number) === p.amount
          )
          const tag = matchedField ? `✓ → ${matchedField[0]}` : `❌ TIDAK TERTANGKAP — cek findPayment di quinos.ts!`
          console.log(`     - "${p.code.padEnd(28)}" Rp ${p.amount.toLocaleString('id-ID').padStart(12)}  ${tag}`)
        }
        console.log(`     --------------------------------------------------`)
        console.log(`     KESIMPULAN: Selisih Rp ${absDiff.toLocaleString('id-ID')} ini terlalu besar untuk auto-balance.`)
        console.log(`     KEMUNGKINAN: Kasir salah input tipe pembayaran di Quinos, atau ada transaksi Quinos yang belum di-input (Under-reporting).\n`)

        console.error(`     ❌ Skipped: Jurnal Penjualan tidak seimbang (Selisih Rp ${absDiff.toLocaleString('id-ID')}). Harap cek rincian investigasi di atas.`)

        // Auto-report to Abnormal Transactions
        await supabase.from('abnormal_transactions').upsert({
          transaction_date: date,
          report_type: 'Revenue Report',
          store_name: store,
          issue_description: `Batch Script: Jurnal tidak seimbang (Selisih Rp ${absDiff.toLocaleString('id-ID')}). Total POS Rp ${totalCredit.toLocaleString('id-ID')} vs Bank Rp ${bankTotal.toLocaleString('id-ID')}.`,
          status: 'PENDING'
        }, { onConflict: 'store_name,transaction_date,report_type' })
        return { status: 'error', kategori: 'Jurnal Tidak Seimbang', date, store, jurnal: 'Penjualan' }
      }

      const isRounding = absDiff <= 5
      balancingData = {
        amount: Math.round(absDiff * 100) / 100,
        type: diffBalance > 0 ? 'CREDIT' : 'DEBIT',
        code: isRounding ? '7200.02' : '4000.90',
        label: isRounding ? 'Pembulatan' : 'Pendapatan Lain-lain'
      }
      isBalanceApproved = true
    }

    // Submit Accurate Flow
    const postToAccurate = async (memo: string, details: any[], tDate: string): Promise<boolean> => {
      if (details.length === 0) {
        throw new Error('Data kosong (0) untuk tanggal ini. Tidak ada detail transaksi yang dapat dikirim (toko mungkin tutup).')
      }

      let d = Math.round(details.filter(x => x.amountType === 'DEBIT').reduce((s, x) => s + x.amount, 0))
      let c = Math.round(details.filter(x => x.amountType === 'CREDIT').reduce((s, x) => s + x.amount, 0))

      const diff = d - c
      if (Math.abs(diff) > 0 && Math.abs(diff) <= 20) {
        // Auto-balance rounding discrepancy into 7200.02 (Pembulatan)
        const balanceType = diff > 0 ? 'CREDIT' : 'DEBIT'
        details.push({ accountNo: '7200.02', amountType: balanceType, amount: Math.abs(diff) })
        if (diff > 0) c += Math.abs(diff); else d += Math.abs(diff)
      }

      if (Math.abs(d - c) > 20) {
        console.log(`\n     🛑 [DEBUG] RINCIAN JURNAL YANG TIDAK SEIMBANG (${memo})`)
        console.log(`     Total Debit: ${d}`)
        console.log(`     Total Credit: ${c}`)
        console.log(`     Selisih: ${Math.abs(d-c)}`)
        console.log(`     Baris Jurnal:`)
        details.forEach(item => {
          console.log(`       - [${item.amountType.padEnd(6)}] ${item.accountNo}: ${item.amount}`)
        })
        console.log('')
        throw new Error(`Jurnal tidak balance secara internal! D: ${d}, C: ${c} (Selisih: ${Math.abs(d-c)}, melebihi threshold 20)`)
      }

      // Check existing journal and skip if exists
      try {
        const checkRes = await axios.get(`${apiBaseUrl}/api/journal-voucher/list.do`, {
          params: { fields: 'id,description', 'filter.keywords.op': 'EQUAL', 'filter.keywords.val': memo },
          headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Session-ID': sessionId }
        })
        if (checkRes.data.s && checkRes.data.d?.length > 0) {
          console.log(`     ⏭️  Jurnal sudah ada di Accurate, dilewati.`)
          return false
        }
      } catch (e) {}

      const res = await axios.post(`${apiBaseUrl}/api/journal-voucher/save.do`, {
        transDate: tDate,
        description: memo,
        detailJournalVoucher: details
      }, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Session-ID': sessionId, 'Content-Type': 'application/json' }
      })

      if (!res.data.s) {
        const err = Array.isArray(res.data.d) ? res.data.d.join(', ') : JSON.stringify(res.data.d)
        const dExact = details.filter(x => x.amountType === 'DEBIT').reduce((s, x) => s + x.amount, 0)
        const cExact = details.filter(x => x.amountType === 'CREDIT').reduce((s, x) => s + x.amount, 0)

        console.log(`\n     🛑 [DEBUG] ACCURATE REJECTED PAYLOAD (${memo})`)
        console.log(`     Total Debit Internal: ${d} (exact: ${dExact})`)
        console.log(`     Total Credit Internal: ${c} (exact: ${cExact})`)
        console.log(`     Selisih Exact: ${Math.abs(dExact - cExact)}`)
        console.log(`     Baris Jurnal:`)
        details.forEach(item => {
          console.log(`       - [${item.amountType.padEnd(6)}] ${item.accountNo}: ${item.amount}`)
        })
        console.log('')

        throw new Error(`Accurate Reject: ${err}`)
      }
      return true
    }

    // JOURNAL 1: PENJUALAN
    if (runPenjualan) {
      activeJurnal = 'Penjualan'
      const dp: any[] = []

      // DEBIT: all payment fields (core + every voucher type)
      // Account lookup: store mapping first, then GLOBAL fallback
      for (const key of Object.keys(resultData)) {
        if (!key.startsWith('payment_')) continue
        const amount = resultData[key] || 0
        if (amount === 0) continue
        const account = mapping[key] || ACCURATE_MAPPING.GLOBAL[key]
        if (account) {
          addDetail(dp, account, 'DEBIT', amount)
        } else {
          console.warn(`     ⚠️  [TIDAK ADA AKUN] ${key} = Rp ${amount.toLocaleString('id-ID')} tidak memiliki mapping akun untuk store ${store}. Diabaikan dari jurnal!`)
        }
      }

      addDetail(dp, mapping.discount, 'DEBIT', resultData.revenue_discount || 0)

      addDetail(dp, mapping.sales_bar, 'CREDIT', resultData.penjualan_bar || 0)
      addDetail(dp, mapping.sales_beans, 'CREDIT', resultData.penjualan_coffee_beans || 0)
      addDetail(dp, mapping.sales_kitchen, 'CREDIT', resultData.penjualan_makanan || 0)
      addDetail(dp, mapping.sales_konsinyasi, 'CREDIT', resultData.penjualan_konsinyasi || 0)
      addDetail(dp, mapping.sales_bundling, 'CREDIT', resultData.penjualan_bundling || 0)
      addDetail(dp, mapping.sales_inventory, 'CREDIT', resultData.penjualan_inventory || 0)
      addDetail(dp, mapping.sales_modifier, 'CREDIT', resultData.penjualan_modifier || 0)
      addDetail(dp, mapping.sales_konsinyasi_no_brand, 'CREDIT', resultData.penjualan_konsinyasi_no_brand || 0)
      addDetail(dp, mapping.service_charge, 'CREDIT', resultData.hutang_service || 0)
      addDetail(dp, mapping.tax, 'CREDIT', resultData.hutang_pajak_pemkot || 0)

      if (isBalanceApproved && balancingData) {
        const balancingAccount = balancingData.code === '7200.02' ? ACCURATE_MAPPING.GLOBAL.balancing_rounding : ACCURATE_MAPPING.GLOBAL.balancing_misc
        addDetail(dp, balancingAccount, balancingData.type as 'DEBIT'|'CREDIT', balancingData.amount)
        console.log(`     ⚖️ Auto-balancing applied: ${balancingData.label} Rp ${balancingData.amount}`)
      }

      const created = await postToAccurate(memoPenjualan, dp, accurateDate)
      if (created) console.log(`     ✅ Jurnal Penjualan OK`)
    }

    // JOURNAL 2: UANG MASUK
    if (runUangMasuk) {
      activeJurnal = 'Uang Masuk'
      const txDate = new Date(date)
      txDate.setDate(txDate.getDate() + 1) // H+1 Uang Masuk
      const accurateDateH1 = `${txDate.getDate().toString().padStart(2, '0')}/${(txDate.getMonth() + 1).toString().padStart(2, '0')}/${txDate.getFullYear()}`

      const du: any[] = []
      // Cash and Transfer use Quinos amounts directly (not from bank CSV)
      const totalNetReceipt =
        (resultData.bca_kredit_income || 0) +
        (resultData.bca_debit_income || 0) +
        (resultData.bca_qris_income || 0) +
        (resultData.gobiz_income || 0) +
        (resultData.ovo_income || 0)

      addDetail(du, mapping.settlement_bca, 'DEBIT', totalNetReceipt)
      addDetail(du, mapping.payment_cash, 'DEBIT', resultData.payment_cash || 0)
      addDetail(du, mapping.payment_transfer, 'DEBIT', resultData.payment_transfer || 0)
      addDetail(du, ACCURATE_MAPPING.GLOBAL.admin_bank, 'DEBIT', resultData.biaya_admin_bank || 0)
      addDetail(du, ACCURATE_MAPPING.GLOBAL.admin_merchant, 'DEBIT', resultData.biaya_penjualan_merchant_online || 0)

      const corePaymentKeys = ['payment_cash','payment_transfer','payment_credit_bca','payment_debit_bca','payment_qris','payment_gobiz','payment_ovo']
      for (const key of corePaymentKeys) {
        const amount = resultData[key] || 0
        if (amount > 0) {
          const account = mapping[key] || ACCURATE_MAPPING.GLOBAL[key]
          if (account) addDetail(du, account, 'CREDIT', amount)
        }
      }

      const created = await postToAccurate(memoUangMasuk, du, accurateDateH1)
      if (created) console.log(`     ✅ Jurnal Uang Masuk OK (tanggal ${accurateDateH1})`)
    }

    return { status: 'sukses' }

  } catch (e: any) {
    let errMsg = e?.message || String(e)
    if (axios.isAxiosError(e)) {
      const status = e.response?.status ?? 'no-response'
      const body = e.response?.data ? JSON.stringify(e.response.data).slice(0, 300) : ''
      errMsg = `HTTP ${status}: ${e.message}${body ? ' | ' + body : ''}`
      console.error(`     ❌ ERROR (${errMsg})`)
    } else {
      console.error(`     ❌ ERROR: ${errMsg}`)
    }
    return { status: 'error', kategori: kategorikanError(errMsg), date, store, jurnal: activeJurnal }
  }
}

// 4. Main
async function runBatch() {
  const filePath = process.argv[2] || path.join(process.cwd(), 'scripts/finance/MASS_INPUT_MKG_TEST.csv')
  if (!fs.existsSync(filePath)) {
    console.error(`File ${filePath} tidak ditemukan.`)
    return
  }

  let rowsToProcess: any[]
  try {
    rowsToProcess = parseCSV(filePath)
  } catch (e: any) {
    console.error(`\n❌ Error membaca CSV: ${e.message}`)
    process.exit(1)
  }

  if (rowsToProcess.length === 0) {
    console.error('❌ Tidak ada baris REK KORAN valid di CSV.')
    process.exit(1)
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Ditemukan ${rowsToProcess.length} baris REK KORAN dari CSV:`)
  rowsToProcess.forEach((r, i) => console.log(
    `  ${i + 1}. ${r.date}  ${r.store.padEnd(16)}`
  ))
  console.log('─'.repeat(60))

  const ok = await confirm(`\nProses (Fetch Quinos + Accurate Jurnals) untuk ${rowsToProcess.length} tanggal? (y/n): `)
  if (!ok) { console.log('Dibatalkan.'); process.exit(0) }

  console.log('\nMenghubungkan ke Accurate...')
  const accurateConn = await getAccurateConnection()
  console.log('✅ Terhubung! Sesi:', accurateConn.sessionId)

  console.log('Menghubungkan ke Quinos Cloud...')
  const quinosCookiesRef = { cookies: await createQuinosSession() }
  console.log('✅ Login Quinos berhasil! Session siap digunakan.')

  type ErrorDetail = { date: string; store: string; jurnal: string; kategori: string }
  const stats = {
    sukses: 0,
    dilewati: 0,
    errorList: [] as ErrorDetail[]
  }

  const printSummary = (processed: number, total: number, final = false) => {
    const totalError = stats.errorList.length
    const pct = Math.round((processed / total) * 100)
    const label = final ? '=== LAPORAN AKHIR ===' : `=== LAPORAN PROGRES [${processed}/${total} — ${pct}%] ===`
    console.log(`\n${'═'.repeat(72)}`)
    console.log(label)
    console.log(`${'─'.repeat(72)}`)
    console.log(`  Diproses  : ${processed} dari ${total} (${pct}%)`)
    console.log(`  ✅ Sukses  : ${stats.sukses}`)
    console.log(`  ⏭️  Dilewati: ${stats.dilewati}`)
    console.log(`  ❌ Error   : ${totalError}`)
    if (totalError > 0) {
      // Count by kategori
      const byKategori: Record<string, number> = {}
      for (const e of stats.errorList) byKategori[e.kategori] = (byKategori[e.kategori] || 0) + 1
      for (const [kategori, count] of Object.entries(byKategori).sort((a, b) => b[1] - a[1])) {
        console.log(`       • ${kategori}: ${count}x`)
      }
      console.log(`${'─'.repeat(72)}`)
      console.log(`  Detail Error:`)
      for (const e of stats.errorList) {
        console.log(`    [${e.date}] ${e.store.padEnd(16)} | ${e.jurnal.padEnd(12)} | ${e.kategori}`)
      }
    }
    console.log(`${'═'.repeat(72)}\n`)
  }

  for (let i = 0; i < rowsToProcess.length; i++) {
    const row = rowsToProcess[i]
    console.log(`\n[${i+1}/${rowsToProcess.length}] Memproses ${row.date} - ${row.store}...`)
    const result = await processRow(row, accurateConn, quinosCookiesRef)

    if (result.status === 'sukses') {
      stats.sukses++
    } else if (result.status === 'dilewati') {
      stats.dilewati++
    } else {
      stats.errorList.push({ date: result.date, store: result.store, jurnal: result.jurnal, kategori: result.kategori })
    }

    // Print summary every 10 records
    if ((i + 1) % 10 === 0 && i + 1 < rowsToProcess.length) {
      printSummary(i + 1, rowsToProcess.length)
    }

    await new Promise(r => setTimeout(r, 3000))
  }

  printSummary(rowsToProcess.length, rowsToProcess.length, true)
  console.log('✅ Batch proses selesai seluruhnya!')
}

runBatch()
