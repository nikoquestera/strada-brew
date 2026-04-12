import axios from 'axios'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { ACCURATE_MAPPING } from '../../src/lib/finance/accurate-mapping'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SERVICE_SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function getAccurateConnection() {
  const { data: tokenData, error } = await supabase.from('accurate_tokens').select('*').limit(1).maybeSingle()
  if (error || !tokenData) throw new Error('No Accurate tokens found in database.')

  let accessToken = tokenData.access_token
  if (new Date(tokenData.expires_at) <= new Date()) {
    console.log('Refreshing token...')
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

async function testPull() {
  const accurateConn = await getAccurateConnection()
  const apiBaseUrl = `${accurateConn.host}/accurate`

  // Read CSV
  const csvContent = fs.readFileSync('REVENUE FIX - Daftar Jurnal Umum-3.csv', 'utf-8')
  const lines = csvContent.split('\n').filter(l => l.trim())
  
  // Test first 5 lines (skip header)
  for (let i = 1; i <= 5; i++) {
    const cols = lines[i].split(',')
    const journalNo = cols[0].trim()
    const date = cols[1].trim()
    const rawStore = cols[2].trim()

    // Normalize store name
    let store = rawStore.toUpperCase()
    if (store === 'LA PIAZZA') store = 'LA.PIAZZA'
    if (!ACCURATE_MAPPING.STORES[store]) {
      console.log(`Unknown store: ${store}`)
      continue
    }

    console.log(`\n--- Fetching ${journalNo} (${store} @ ${date}) ---`)
    try {
      const res = await axios.get(`${apiBaseUrl}/api/journal-voucher/detail.do`, {
        params: { number: journalNo },
        headers: { 'Authorization': `Bearer ${accurateConn.accessToken}`, 'X-Session-ID': accurateConn.sessionId }
      })

      if (!res.data.s) {
        console.error(`Failed to fetch ${journalNo}: ${res.data.d}`)
        continue
      }

      const journal = res.data.d
      console.log(`Memo: ${journal.description}`)

      // Reverse Map
      const storeMap = ACCURATE_MAPPING.STORES[store]
      const revMap: Record<string, string[]> = {}
      
      const addToRevMap = (acc: string, key: string) => {
        if (!revMap[acc]) revMap[acc] = []
        revMap[acc].push(key)
      }

      for (const k in storeMap) addToRevMap(storeMap[k], k)
      for (const k in ACCURATE_MAPPING.GLOBAL) addToRevMap(ACCURATE_MAPPING.GLOBAL[k], k)

      const extractedData: Record<string, number> = {}

      for (const item of journal.detailJournalVoucher) {
        const no = item.glAccount?.no || item.accountNoRef
        const amount = item.amount
        const type = item.amountType
        
        const mappedKeys = revMap[no] || [`UNMAPPED_${no}`]
        
        // Just use the first mapped key for simplicity in viewing
        const primaryKey = mappedKeys[0]
        extractedData[`[${type}] ${primaryKey}`] = (extractedData[`[${type}] ${primaryKey}`] || 0) + amount
      }

      console.log('Mapped Data:')
      for (const key in extractedData) {
        console.log(`  ${key}: Rp ${extractedData[key].toLocaleString('id-ID')}`)
      }

    } catch (e: any) {
      console.error(`Error ${journalNo}:`, e.message)
    }
  }
}

testPull()
