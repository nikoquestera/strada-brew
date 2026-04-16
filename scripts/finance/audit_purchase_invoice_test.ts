import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as fs from 'fs';
import * as xlsx from 'xlsx';
import path from 'path';

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SERVICE_SUPABASE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getAccurateConnection() {
  const { data: tokenData, error } = await supabase.from('accurate_tokens').select('*').limit(1).maybeSingle();
  if (error || !tokenData) throw new Error('No Accurate tokens found in database.');

  let accessToken = tokenData.access_token;
  if (new Date(tokenData.expires_at) <= new Date()) {
    console.log('Refreshing token...');
    const authHeader = Buffer.from(`${process.env.ACCURATE_OAUTH_CLIENT_ID}:${process.env.ACCURATE_OAUTH_CLIENT_SECRET}`).toString('base64');
    const refreshRes = await axios.post('https://account.accurate.id/oauth/token', 
      new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokenData.refresh_token }).toString(),
      { headers: { 'Authorization': `Basic ${authHeader}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    accessToken = refreshRes.data.access_token;
    await supabase.from('accurate_tokens').update({
      access_token: accessToken,
      refresh_token: refreshRes.data.refresh_token,
      expires_at: new Date(Date.now() + refreshRes.data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', tokenData.id);
  }

  const dbListRes = await axios.get('https://account.accurate.id/api/db-list.do', { headers: { 'Authorization': `Bearer ${accessToken}` } });
  const dbId = dbListRes.data.d[0].id;
  const sessionRes = await axios.get(`https://account.accurate.id/api/open-db.do?id=${dbId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
  
  return { accessToken, sessionId: sessionRes.data.session, host: sessionRes.data.host };
}

async function testFetch() {
  try {
    const { accessToken, sessionId, host } = await getAccurateConnection();
    const apiBaseUrl = `${host}/accurate`;

    const res = await axios.get(`${apiBaseUrl}/api/purchase-invoice/list.do`, {
      params: {
        'fields': 'id,number,transDate,totalAmount',
        'filter.transDate.op': 'BETWEEN',
        'filter.transDate.val1': '01/01/2025',
        'filter.transDate.val2': '31/01/2025'
      },
      headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Session-ID': sessionId }
    });

    if (!res.data.s) throw new Error(res.data.d);
    
    console.log("Accurate API sample:");
    console.log(res.data.d.slice(0, 3));

    const auditDir = path.join(process.cwd(), 'audit/OTORISASI 2025');
    const files = fs.readdirSync(auditDir).filter(f => f.endsWith('.xlsx'));
    console.log(`\nFound ${files.length} xlsx files. Loading first file: ${files[0]}`);

    const workbook = xlsx.readFile(path.join(auditDir, files[0]));
    const firstSheet = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1 });
    console.log("Excel sample (first 10 rows):");
    console.log(data.slice(0, 10));

  } catch (err: any) {
    console.error(err.response?.data || err.message);
  }
}

testFetch();