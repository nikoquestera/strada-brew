import axios from 'axios'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

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

async function fetchAllExistingBrewJournals() {
  const { accessToken, sessionId, host } = await getAccurateConnection()
  const apiBaseUrl = `${host}/accurate`
  
  let allJournals: string[] = []
  let page = 1
  const pageSize = 100

  console.log('Fetching existing BREW journals from Accurate...')

  while (true) {
    const res = await axios.get(`${apiBaseUrl}/api/journal-voucher/list.do`, {
      params: {
        'fields': 'description',
        'filter.keywords.op': 'CONTAIN',
        'filter.keywords.val': 'BREW - ',
        'sp.page': page,
        'sp.pageSize': pageSize
      },
      headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Session-ID': sessionId }
    })

    if (!res.data.s) break
    const data = res.data.d
    if (data.length === 0) break

    allJournals = allJournals.concat(data.map((j: any) => j.description))
    console.log(`Page ${page} fetched (${allJournals.length} total)`)
    
    if (data.length < pageSize) break
    page++
  }

  return allJournals
}

async function main() {
  try {
    const journals = await fetchAllExistingBrewJournals()
    fs.writeFileSync('existing_accurate_brew_journals.json', JSON.stringify(journals, null, 2))
    console.log(`Saved ${journals.length} journal descriptions to existing_accurate_brew_journals.json`)
  } catch (e: any) {
    console.error('Error:', e.message)
  }
}

main()
