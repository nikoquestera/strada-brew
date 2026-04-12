import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import axios from 'axios'
import { fetchQuinosRevenue } from '../../src/lib/finance/quinos'
import { ACCURATE_MAPPING } from '../../src/lib/finance/accurate-mapping'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SERVICE_SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// 1. Helper to add detail rows for Accurate
const addDetail = (details: any[], account: string, type: 'DEBIT' | 'CREDIT', amount: number) => {
  if (!account) return
  const trimmedAccount = account.trim()
  const roundedAmount = Math.round(amount * 100) / 100
  if (roundedAmount <= 0) return
  
  const detail: any = {
    accountNo: trimmedAccount,
    amountType: type,
    amount: roundedAmount
  }

  const customerNo = ACCURATE_MAPPING.CUSTOMER_MAPPING[trimmedAccount]
  if (customerNo) {
    detail.customerNo = customerNo
    detail.subsidiaryType = 'CUSTOMER'
  }

  const vendorNo = ACCURATE_MAPPING.VENDOR_MAPPING[trimmedAccount]
  if (vendorNo) {
    detail.vendorNo = vendorNo
    detail.subsidiaryType = 'VENDOR'
  }
  
  details.push(detail)
}

// 2. Fetch Accurate Access Token
async function getAccurateConnection() {
  const { data: tokenData, error } = await supabase.from('accurate_tokens').select('*').limit(1).maybeSingle()
  if (error || !tokenData) throw new Error('No Accurate tokens found in database.')

  let accessToken = tokenData.access_token
  if (new Date(tokenData.expires_at) <= new Date()) {
    console.log('Token Accurate expired, refreshing...')
    const authHeader = Buffer.from(`${process.env.ACCURATE_OAUTH_CLIENT_ID}:${process.env.ACCURATE_OAUTH_CLIENT_SECRET}`).toString('base64')
    const refreshRes = await axios.post('https://account.accurate.id/oauth/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )
    accessToken = refreshRes.data.access_token
    const expiresAt = new Date(Date.now() + refreshRes.data.expires_in * 1000).toISOString()
    
    await supabase.from('accurate_tokens').update({
      access_token: accessToken,
      refresh_token: refreshRes.data.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    }).eq('id', tokenData.id)
  }

  const dbListRes = await axios.get('https://account.accurate.id/api/db-list.do', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  const dbId = dbListRes.data.d[0].id
  
  const sessionRes = await axios.get(`https://account.accurate.id/api/open-db.do?id=${dbId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  
  return {
    accessToken,
    sessionId: sessionRes.data.session,
    apiBaseUrl: `${sessionRes.data.host}/accurate`
  }
}

// 3. Process Row
async function processRow(row: any, accurateConn: any) {
  const { accessToken, sessionId, apiBaseUrl } = accurateConn
  const { date, store, submitPenjualan, submitUangMasuk, autoBalance, bankData } = row
  const mapping = ACCURATE_MAPPING.STORES[store]

  if (!mapping) {
    console.error(`[${date} ${store}] Skipped: No mapping for store.`)
    return
  }

  try {
    // 3.1 Fetch Quinos
    const qData = await fetchQuinosRevenue(date, store, () => {})
    
    // Combine with Bank Data
    const resultData = {
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

    // Calculate fees
    resultData.biaya_admin_bank = (paymentCreditBca - bcaKreditIncome) + (paymentDebitBca - bcaDebitIncome) + (paymentQris - bcaQrisIncome)
    resultData.biaya_penjualan_merchant_online = (paymentGobiz + paymentOvo) - (gobizIncome + ovoIncome)

    // Save to DB
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
    const isUnbalanced = absDiff > 1

    let balancingData = null
    let isBalanceApproved = false

    if (isUnbalanced) {
      if (!autoBalance) {
        console.error(`[${date} ${store}] Skipped: Unbalanced by Rp ${absDiff} but Auto-Balance is disabled (N).`)
        return
      }

      if (absDiff > 15000) {
        console.error(`[${date} ${store}] Skipped: Unbalanced by Rp ${absDiff} (> 15000 limit). Cannot auto-balance.`)
        // Auto-report to Abnormal Transactions
        await supabase.from('abnormal_transactions').upsert({
          transaction_date: date,
          report_type: 'Revenue Report',
          store_name: store,
          issue_description: `Batch Script: Jurnal tidak seimbang (Selisih Rp ${absDiff.toLocaleString('id-ID')}). Melebihi batas auto-balance.`,
          status: 'PENDING'
        }, { onConflict: 'store_name,transaction_date,report_type' })
        return
      }

      const isRounding = absDiff <= 5
      balancingData = {
        amount: absDiff,
        type: diffBalance > 0 ? 'CREDIT' : 'DEBIT',
        code: isRounding ? '7200.02' : '4000.90',
        label: isRounding ? 'Pembulatan' : 'Pendapatan Lain-lain'
      }
      isBalanceApproved = true
    }

    // Submit Accurate Flow
    const dateParts = date.split('-')
    const accurateDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
    const memoPenjualan = `BREW - Penjualan cafe ${store} tanggal ${accurateDate}`
    const memoUangMasuk = `BREW - Uang masuk penjualan cafe ${store} tanggal ${accurateDate}`

    const postToAccurate = async (memo: string, details: any[]) => {
      const d = details.filter(x => x.amountType === 'DEBIT').reduce((s, x) => s + x.amount, 0)
      const c = details.filter(x => x.amountType === 'CREDIT').reduce((s, x) => s + x.amount, 0)
      if (Math.abs(d - c) > 1) {
        throw new Error(`[${date} ${store}] Jurnal tidak balance! D: ${d}, C: ${c}`)
      }

      const res = await axios.post(`${apiBaseUrl}/api/journal-voucher/save.do`, {
        transDate: accurateDate,
        description: memo,
        detailJournalVoucher: details
      }, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Session-ID': sessionId, 'Content-Type': 'application/json' }
      })

      if (!res.data.s) {
        const err = Array.isArray(res.data.d) ? res.data.d.join(', ') : JSON.stringify(res.data.d)
        throw new Error(`Accurate Reject: ${err}`)
      }
    }

    // JOURNAL 1: PENJUALAN
    if (submitPenjualan) {
      const dp: any[] = []
      addDetail(dp, mapping.payment_credit_bca, 'DEBIT', resultData.payment_credit_bca || 0)
      addDetail(dp, mapping.payment_debit_bca, 'DEBIT', resultData.payment_debit_bca || 0)
      addDetail(dp, mapping.payment_qris, 'DEBIT', resultData.payment_qris || 0)
      addDetail(dp, mapping.payment_gobiz, 'DEBIT', resultData.payment_gobiz || 0)
      addDetail(dp, mapping.payment_ovo, 'DEBIT', resultData.payment_ovo || 0)
      addDetail(dp, mapping.payment_cash, 'DEBIT', resultData.payment_cash || 0)
      addDetail(dp, mapping.payment_transfer, 'DEBIT', resultData.payment_transfer || 0)
      
      for (const key in ACCURATE_MAPPING.GLOBAL) {
        if (key.startsWith('payment_')) addDetail(dp, ACCURATE_MAPPING.GLOBAL[key], 'DEBIT', resultData[key] || 0)
      }
      if (mapping.payment_bsd_workshop_vou) addDetail(dp, mapping.payment_bsd_workshop_vou, 'DEBIT', resultData.payment_bsd_workshop_vou || 0)
      if (mapping.payment_voucher_smkg) addDetail(dp, mapping.payment_voucher_smkg, 'DEBIT', resultData.payment_voucher_smkg || 0)
      if (mapping.payment_workshop_sms_voucher) addDetail(dp, mapping.payment_workshop_sms_voucher, 'DEBIT', resultData.payment_workshop_sms_voucher || 0)
      if (mapping.payment_cl_upperwest) addDetail(dp, mapping.payment_cl_upperwest, 'DEBIT', resultData.payment_cl_upperwest || 0)

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
        console.log(`   ⚖️ Auto-balancing applied: ${balancingData.label} Rp ${balancingData.amount}`)
      }

      await postToAccurate(memoPenjualan, dp)
      console.log(`   ✅ Jurnal Penjualan Sukses.`)
    }

    // JOURNAL 2: UANG MASUK
    if (submitUangMasuk) {
      const du: any[] = []
      const totalNetReceipt = 
        (resultData.bca_kredit_income || 0) + 
        (resultData.bca_debit_income || 0) + 
        (resultData.bca_qris_income || 0) + 
        (resultData.gobiz_income || 0) + 
        (resultData.ovo_income || 0) + 
        (resultData.cash_income || 0) + 
        (resultData.payment_transfer || 0)

      addDetail(du, mapping.settlement_bca, 'DEBIT', totalNetReceipt)
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

      await postToAccurate(memoUangMasuk, du)
      console.log(`   ✅ Jurnal Uang Masuk Sukses.`)
    }

  } catch (e: any) {
    console.error(`[${date} ${store}] ERROR: ${e.message}`)
  }
}

// 4. Main Loop
async function runBatch() {
  const filePath = path.join(process.cwd(), 'batch_jurnal_template.csv')
  if (!fs.existsSync(filePath)) {
    console.error('File batch_jurnal_template.csv tidak ditemukan. Jalankan export_revenue_template.ts dulu.')
    return
  }

  const csvText = fs.readFileSync(filePath, 'utf-8')
  const lines = csvText.split('\n').filter(l => l.trim() !== '')
  
  console.log('Menghubungkan ke Accurate...')
  const accurateConn = await getAccurateConnection()
  console.log('Terhubung! Sesi:', accurateConn.sessionId)

  const rowsToProcess = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const [date, store, submitPenjualan, submitUangMasuk, autoBalance, bKredit, bDebit, bQris, mGobiz, mOvo, mCash] = cols
    
    if (submitPenjualan?.trim().toUpperCase() === 'Y' || submitUangMasuk?.trim().toUpperCase() === 'Y') {
      rowsToProcess.push({
        date: date.trim(),
        store: store.trim(),
        submitPenjualan: submitPenjualan?.trim().toUpperCase() === 'Y',
        submitUangMasuk: submitUangMasuk?.trim().toUpperCase() === 'Y',
        autoBalance: autoBalance?.trim().toUpperCase() === 'Y',
        bankData: {
          bca_kredit_income: parseFloat(bKredit) || 0,
          bca_debit_income: parseFloat(bDebit) || 0,
          bca_qris_income: parseFloat(bQris) || 0,
          gobiz_income: parseFloat(mGobiz) || 0,
          ovo_income: parseFloat(mOvo) || 0,
          cash_income: parseFloat(mCash) || 0
        }
      })
    }
  }

  console.log(`Menemukan ${rowsToProcess.length} baris yang ditandai 'Y'. Memulai proses...\n`)

  for (let i = 0; i < rowsToProcess.length; i++) {
    const row = rowsToProcess[i]
    console.log(`[${i+1}/${rowsToProcess.length}] Memproses ${row.date} - ${row.store}...`)
    await processRow(row, accurateConn)
    
    // Slight delay to avoid hitting Accurate rate limits
    await new Promise(r => setTimeout(r, 1500))
  }

  console.log('\n✅ Batch proses selesai seluruhnya!')
}

runBatch()
