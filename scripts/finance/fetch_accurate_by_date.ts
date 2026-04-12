import axios from 'axios'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

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

async function fetchAccurateJournals(dateStr: string) {
  const { accessToken, sessionId, host } = await getAccurateConnection()
  const apiBaseUrl = `${host}/accurate`
  
  console.log(`Fetching journals from Accurate for date: ${dateStr}`)

  const res = await axios.get(`${apiBaseUrl}/api/journal-voucher/list.do`, {
    params: {
      'fields': 'id,number,description,transDate',
      'filter.transDate.op': 'EQUAL',
      'filter.transDate.val': dateStr
    },
    headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Session-ID': sessionId }
  })

  if (!res.data.s) throw new Error(res.data.d)
  
  const journals = res.data.d
  console.log(`Found ${journals.length} journals for ${dateStr}.`)

  const detailedJournals = []

  for (const j of journals) {
    if (!j.description.toLowerCase().includes('penjualan cafe') && !j.description.toLowerCase().includes('uang masuk')) continue;

    console.log(`Fetching detail for Journal: ${j.description}`)
    const detailRes = await axios.get(`${apiBaseUrl}/api/journal-voucher/detail.do`, {
      params: { id: j.id },
      headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Session-ID': sessionId }
    })
    
    if (detailRes.data.s) {
      detailedJournals.push(detailRes.data.d)
    }
  }

  return detailedJournals
}

async function main() {
  const dateToFetch = '04/01/2025' // 4 Januari 2025
  try {
    const data = await fetchAccurateJournals(dateToFetch)
    fs.writeFileSync(`accurate_journals_04_01_2025.json`, JSON.stringify(data, null, 2))
    
    console.log(`\nBerhasil menarik ${data.length} jurnal spesifik Penjualan Cafe/Uang Masuk.`)
    console.log('Lihat accurate_journals_04_01_2025.json untuk isi detail.')
    
    // Log a summary
    for (const j of data) {
      console.log(`\n=================================`)
      console.log(`Memo: ${j.description}`)
      console.log(`Tanggal: ${j.transDate}`)
      console.log(`Items:`)
      for (const item of j.detailJournalVoucher) {
        const no = item.glAccount?.no || item.accountNoRef || 'UNKNOWN'
        const name = item.glAccount?.name || item.accountNameRef || 'UNKNOWN'
        console.log(` - [${item.amountType}] ${no} (${name}): Rp ${item.amount.toLocaleString('id-ID')}`)
      }
    }

  } catch (e: any) {
    console.error('Failed:', e.response?.data || e.message)
  }
}

main()
