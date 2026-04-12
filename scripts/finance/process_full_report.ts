import * as fs from 'fs'
import { ACCURATE_MAPPING } from '../../src/lib/finance/accurate-mapping'

function parseIndonesianNumber(val: string): number {
  if (!val || val === '0' || val === '"0"') return 0
  let cleaned = val.replace(/"/g, '')
  cleaned = cleaned.replace(/,/g, '.')
  return parseFloat(cleaned) || 0
}

async function run() {
  console.log('Reading keseluruhan_jurnal_report.csv...')
  const content = fs.readFileSync('keseluruhan_jurnal_report.csv', 'utf-8')
  const lines = content.split('\n').filter(l => l.trim())
  
  const journals: Record<string, any[]> = {}
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const cols = line.match(/(".*?"|[^,]+)/g) || []
    if (cols.length < 8) continue
    const journalNo = cols[2].replace(/"/g, '')
    if (!journals[journalNo]) journals[journalNo] = []
    journals[journalNo].push(cols)
  }

  const resultsByDateStore: Record<string, any> = {}
  const allFoundComponents = new Set<string>()

  // Reverse Map
  const globalRevMap: Record<string, string[]> = {}
  for (const store in ACCURATE_MAPPING.STORES) {
    const storeMap = ACCURATE_MAPPING.STORES[store]
    for (const key in storeMap) {
      const acc = storeMap[key]
      if (!globalRevMap[acc]) globalRevMap[acc] = []
      globalRevMap[acc].push(key)
    }
  }
  for (const key in ACCURATE_MAPPING.GLOBAL) {
    const acc = ACCURATE_MAPPING.GLOBAL[key]
    if (!globalRevMap[acc]) globalRevMap[acc] = []
    globalRevMap[acc].push(key)
  }

  console.log(`Processing ${Object.keys(journals).length} unique journals...`)

  for (const journalNo in journals) {
    const rows = journals[journalNo]
    const firstRow = rows[0]
    const desc = firstRow[5].replace(/"/g, '').toLowerCase()
    const transDateRaw = firstRow[3].replace(/"/g, '') 

    let store = ''
    if (desc.includes('lpz') || desc.includes('la piazza') || desc.includes('la.piazza')) store = 'LA.PIAZZA'
    else if (desc.includes('mkg')) store = 'MKG'
    else if (desc.includes('smb gold')) store = 'SMB GOLD LOUNGE'
    else if (desc.includes('smb')) store = 'SMB'
    else if (desc.includes('sms')) store = 'SMS'
    else if (desc.includes('bsd')) store = 'BSD'

    if (!store) {
      for (const row of rows) {
        const accName = row[1].toLowerCase()
        if (accName.includes('lpz')) { store = 'LA.PIAZZA'; break; }
        if (accName.includes('mkg')) { store = 'MKG'; break; }
        if (accName.includes('smb gold')) { store = 'SMB GOLD LOUNGE'; break; }
        if (accName.includes('smb')) { store = 'SMB'; break; }
        if (accName.includes('sms')) { store = 'SMS'; break; }
        if (accName.includes('bsd')) { store = 'BSD'; break; }
      }
    }
    if (!store) continue

    const isPenjualan = desc.includes('penjualan cafe') && !desc.includes('uang masuk')
    const isUangMasuk = desc.includes('uang masuk')

    const key = `${transDateRaw}_${store}`
    if (!resultsByDateStore[key]) {
      resultsByDateStore[key] = {
        date: transDateRaw,
        store: store,
        penjualanDebit: 0,
        penjualanKredit: 0,
        uangMasukDebit: 0,
        uangMasukKredit: 0,
        components: {}
      }
    }

    for (const row of rows) {
      const accNo = row[0].replace(/"/g, '')
      const debit = parseIndonesianNumber(row[6])
      const kredit = parseIndonesianNumber(row[7])

      const mappedKeys = globalRevMap[accNo] || []
      const primaryKey = mappedKeys.length > 0 ? mappedKeys[0] : `UNMAPPED_${accNo}`

      if (debit > 0) {
        const comp = `[DEBIT] ${primaryKey}`
        allFoundComponents.add(comp)
        resultsByDateStore[key].components[comp] = (resultsByDateStore[key].components[comp] || 0) + debit
        if (isPenjualan) resultsByDateStore[key].penjualanDebit += debit
        if (isUangMasuk) resultsByDateStore[key].uangMasukDebit += debit
      }
      if (kredit > 0) {
        const comp = `[CREDIT] ${primaryKey}`
        allFoundComponents.add(comp)
        resultsByDateStore[key].components[comp] = (resultsByDateStore[key].components[comp] || 0) + kredit
        if (isPenjualan) resultsByDateStore[key].penjualanKredit += kredit
        if (isUangMasuk) resultsByDateStore[key].uangMasukKredit += kredit
      }
    }
  }

  // Generate CSV
  const componentsList = Array.from(allFoundComponents).sort()
  const outCsv = []
  outCsv.push(['Tanggal', 'Toko', 'penjualanDebit', 'penjualanKredit', 'uangMasukDebit', 'uangMasukKredit', ...componentsList].join(','))
  
  const sortedKeys = Object.keys(resultsByDateStore).sort().reverse() // Newest first
  for (const k of sortedKeys) {
    const row = resultsByDateStore[k]
    const rowValues = [
      row.date, 
      row.store, 
      row.penjualanDebit, 
      row.penjualanKredit, 
      row.uangMasukDebit, 
      row.uangMasukKredit
    ]
    for (const comp of componentsList) {
      rowValues.push(row.components[comp] || 0)
    }
    outCsv.push(rowValues.join(','))
  }

  fs.writeFileSync('Extracted_Accurate_Granular_Data.csv', outCsv.join('\n'))
  console.log('✅ process_full_report.ts: Updated with precise journal totals.')
}

run()
