import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fetchQuinosRevenue } from '../../src/lib/finance/quinos'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SERVICE_SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const STORES = ['BSD', 'LA.PIAZZA', 'MKG', 'SMB', 'SMB GOLD LOUNGE', 'SMS']

// Opening dates config
const OPENING_DATES: Record<string, string> = {
  'BSD': '2025-12-12',
  'SMS': '2025-07-28',
  'SMB': '2026-02-04',
  'SMB GOLD LOUNGE': '2026-02-04',
  'MKG': '2025-01-01',
  'LA.PIAZZA': '2025-01-01'
}

async function main() {
  console.log('Loading missing reports data...')
  const missingJson = JSON.parse(fs.readFileSync('missing_detailed.json', 'utf-8'))
  const missingMap = new Set()
  for (const m of missingJson) {
    // Format in JSON is DD/MM/YYYY, convert to YYYY-MM-DD for mapping
    const [d, m1, y] = m.date.split('/')
    const dateStr = `${y}-${m1}-${d}`
    // Normalize store name to match our STORES list
    let store = m.store.toUpperCase()
    if (store === 'LA PIAZZA') store = 'LA.PIAZZA'
    
    missingMap.add(`${dateStr}_${store}_${m.type}`)
  }

  console.log('Mengambil data dari database Supabase...')
  const { data: dbData, error } = await supabase
    .from('daily_revenue')
    .select('*')
    .gte('transaction_date', '2025-01-01')

  if (error) throw error

  const existingDbMap = new Map()
  for (const row of dbData) {
    existingDbMap.set(`${row.transaction_date}_${row.store_name}`, row)
  }

  const startDate = new Date('2025-01-01')
  const endDate = new Date('2025-01-07') // Temporary limit for testing
  
  const csvRows = []
  csvRows.push([
    'Status Audit', 'Tanggal', 'Toko', 'Penjualan Cafe (Missing?)', 'Uang Masuk (Missing?)', 
    'Submit Penjualan (Y/N)', 'Submit Uang Masuk (Y/N)', 'Setuju Auto-Balance 15k (Y/N)',
    'Mutasi Kredit BCA', 'Mutasi Debit BCA', 'Mutasi QRIS BCA', 'Mutasi Gobiz', 'Mutasi OVO', 'Mutasi Cash',
    'Info: Total Quinos Gross (BCA+Gobiz+OVO)', 'Info: Biaya Admin Bank', 'Info: Biaya Merchant'
  ].join(','))

  const allDays = []
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    allDays.push(d.toISOString().split('T')[0])
  }

  let count = 0
  const total = allDays.length * STORES.length

  for (const dateStr of allDays) {
    for (const store of STORES) {
      count++
      
      // Skip dates before opening
      if (dateStr < (OPENING_DATES[store] || '2025-01-01')) continue

      const key = `${dateStr}_${store}`
      let dataRow = existingDbMap.get(key)
      
      // If data is missing or empty, fetch from Quinos
      if (!dataRow || (
        (dataRow.payment_credit_bca === 0 || dataRow.payment_credit_bca === null) && 
        (dataRow.payment_debit_bca === 0 || dataRow.payment_debit_bca === null) && 
        (dataRow.payment_gobiz === 0 || dataRow.payment_gobiz === null) &&
        (dataRow.payment_qris === 0 || dataRow.payment_qris === null) &&
        (dataRow.payment_ovo === 0 || dataRow.payment_ovo === null) &&
        (dataRow.payment_cash === 0 || dataRow.payment_cash === null)
      )) {
        console.log(`[${count}/${total}] Fetching Quinos: ${store} @ ${dateStr}...`)
        try {
          const qData = await fetchQuinosRevenue(dateStr, store, () => {})
          dataRow = { ...dataRow, ...qData, store_name: store, transaction_date: dateStr }
          
          await supabase.from('daily_revenue').upsert({
            ...dataRow,
            updated_at: new Date().toISOString()
          }, { onConflict: 'store_name,transaction_date' })
          
          await new Promise(r => setTimeout(r, 800)) // Throttle
        } catch (e: any) {
          console.error(`Error ${store} ${dateStr}: ${e.message}`)
        }
      }

      const isPcMissing = missingMap.has(`${dateStr}_${store}_Penjualan cafe`)
      const isUmMissing = missingMap.has(`${dateStr}_${store}_Uang masuk`)

      const totalQuinos = (dataRow?.payment_credit_bca||0) + (dataRow?.payment_debit_bca||0) + (dataRow?.payment_qris||0) + (dataRow?.payment_gobiz||0) + (dataRow?.payment_ovo||0)

      // Audit Logic
      let auditStatus = 'OK'
      const bcaKredit = dataRow?.bca_kredit_income ?? 0
      const bcaDebit = dataRow?.bca_debit_income ?? 0
      const bcaQris = dataRow?.bca_qris_income ?? 0
      
      if (totalQuinos > 0 && bcaKredit === 0 && bcaDebit === 0 && bcaQris === 0) {
        auditStatus = 'NEEDS CHECKING - Mutasi Bank Belum Diisi'
      } else {
        const diffCredit = Math.abs((dataRow?.payment_credit_bca || 0) - bcaKredit)
        const pctCredit = (dataRow?.payment_credit_bca || 0) > 0 ? (diffCredit / dataRow.payment_credit_bca) : 0
        const diffDebit = Math.abs((dataRow?.payment_debit_bca || 0) - bcaDebit)
        const pctDebit = (dataRow?.payment_debit_bca || 0) > 0 ? (diffDebit / dataRow.payment_debit_bca) : 0
        const diffQris = Math.abs((dataRow?.payment_qris || 0) - bcaQris)
        const pctQris = (dataRow?.payment_qris || 0) > 0 ? (diffQris / dataRow.payment_qris) : 0

        if (pctCredit > 0.021 || pctDebit > 0.008 || pctQris > 0.0085) {
          auditStatus = 'NEEDS IMPROVEMENT - Terdeteksi Salah Kamar'
        }
      }

      csvRows.push([
        auditStatus,
        dateStr,
        store,
        isPcMissing ? 'MISSING' : 'ADA',
        isUmMissing ? 'MISSING' : 'ADA',
        isPcMissing ? 'Y' : 'N',
        isUmMissing ? 'Y' : 'N',
        'Y',
        dataRow?.bca_kredit_income ?? 0,
        dataRow?.bca_debit_income ?? 0,
        dataRow?.bca_qris_income ?? 0,
        dataRow?.gobiz_income ?? 0,
        dataRow?.ovo_income ?? 0,
        dataRow?.cash_income ?? 0,
        totalQuinos,
        dataRow?.biaya_admin_bank ?? 0,
        dataRow?.biaya_penjualan_merchant_online ?? 0
      ].join(','))
    }
  }

  const filePath = path.join(process.cwd(), 'batch_jurnal_template.csv')
  fs.writeFileSync(filePath, csvRows.join('\n'))
  console.log(`\nSELESAI! File siap di audit: ${filePath}`)
}

main()
