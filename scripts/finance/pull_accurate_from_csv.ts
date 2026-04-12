import axios from 'axios'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { ACCURATE_MAPPING } from '../../src/lib/finance/accurate-mapping'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SERVICE_SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function getAccurateConnection() {
  const { data: tokenData, error } = await supabase.from('accurate_tokens').select('*').limit(1).maybeSingle()
  if (error || !tokenData) throw new Error('No Accurate tokens found in database.')

  let accessToken = tokenData.access_token
  if (new Date(tokenData.expires_at) <= new Date()) {
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
  
  return { accessToken, sessionId: sessionRes.data.session, host: sessionRes.data.host }
}

async function run() {
  const accurateConn = await getAccurateConnection()
  const apiBaseUrl = `${accurateConn.host}/accurate`

  const csvContent = fs.readFileSync('REVENUE FIX - Daftar Jurnal Umum-3.csv', 'utf-8')
  const lines = csvContent.split('\n').filter(l => l.trim())
  
  const resultsByDateStore: Record<string, any> = {}

  // Global reverse map
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

  const allFoundComponents = new Set<string>()

  console.log(`Processing ${lines.length - 1} journals...`)

  // Process in batches of 10
  for (let i = 1; i < lines.length; i += 10) {
    const batch = lines.slice(i, i + 10)
    
    await Promise.all(batch.map(async (line) => {
      const cols = line.split(',')
      const journalNo = cols[0].trim()
      const dateRaw = cols[1].trim() // DD/MM/YYYY
      const rawStore = cols[2].trim()

      const [d, m, y] = dateRaw.split('/')
      const dateStr = `${y}-${m}-${d}`

      let store = rawStore.toUpperCase()
      if (store === 'LA PIAZZA') store = 'LA.PIAZZA'

      const key = `${dateStr}_${store}`
      if (!resultsByDateStore[key]) {
        resultsByDateStore[key] = {
          date: dateStr,
          store: store,
          has_penjualan: false,
          has_uang_masuk: false,
          components: {}
        }
      }

      try {
        const res = await axios.get(`${apiBaseUrl}/api/journal-voucher/detail.do`, {
          params: { number: journalNo },
          headers: { 'Authorization': `Bearer ${accurateConn.accessToken}`, 'X-Session-ID': accurateConn.sessionId }
        })

        if (!res.data.s) return

        const journal = res.data.d
        const desc = journal.description.toLowerCase()
        const isPenjualan = desc.includes('penjualan cafe') && !desc.includes('uang masuk')
        const isUangMasuk = desc.includes('uang masuk')

        if (isPenjualan) resultsByDateStore[key].has_penjualan = true
        if (isUangMasuk) resultsByDateStore[key].has_uang_masuk = true

        for (const item of journal.detailJournalVoucher) {
          const accNo = item.glAccount?.no || item.accountNoRef
          const amount = item.amount
          const type = item.amountType

          const mappedKeys = globalRevMap[accNo] || []
          const primaryKey = mappedKeys.length > 0 ? mappedKeys[0] : `UNMAPPED_${accNo}`
          
          const componentName = `[${type}] ${primaryKey}`
          allFoundComponents.add(componentName)

          if (!resultsByDateStore[key].components[componentName]) {
            resultsByDateStore[key].components[componentName] = 0
          }
          resultsByDateStore[key].components[componentName] += amount
        }
      } catch (e: any) {
        // Silently fail for fetch issues to continue loop
      }
    }))
    
    console.log(`Processed ${Math.min(i + 10, lines.length)} / ${lines.length - 1} journals...`)
    await new Promise(r => setTimeout(r, 1000)) // Throttle
  }

  // Generate Output CSV
  const componentsList = Array.from(allFoundComponents).sort()
  
  const outCsv = []
  const headers = ['Tanggal', 'Toko', 'Penjualan Ada', 'Uang Masuk Ada', ...componentsList]
  outCsv.push(headers.join(','))
  
  const sortedKeys = Object.keys(resultsByDateStore).sort()
  for (const k of sortedKeys) {
    const row = resultsByDateStore[k]
    
    const rowValues = [
      row.date,
      row.store,
      row.has_penjualan ? 'Y' : 'N',
      row.has_uang_masuk ? 'Y' : 'N'
    ]

    for (const comp of componentsList) {
      rowValues.push(row.components[comp] || 0)
    }

    outCsv.push(rowValues.join(','))
  }

  fs.writeFileSync('Extracted_Accurate_Granular_Data.csv', outCsv.join('\n'))
  console.log('✅ Ekstraksi selesai! Hasil disimpan ke Extracted_Accurate_Granular_Data.csv')
}

run()
