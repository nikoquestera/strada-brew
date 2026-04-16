import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SERVICE_SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getAccurateConnection() {
  const { data: tokenData, error } = await supabase.from('accurate_tokens').select('*').limit(1).maybeSingle();
  let accessToken = tokenData.access_token;
  const dbListRes = await axios.get('https://account.accurate.id/api/db-list.do', { headers: { 'Authorization': `Bearer ${accessToken}` } });
  const dbId = dbListRes.data.d[0].id;
  const sessionRes = await axios.get(`https://account.accurate.id/api/open-db.do?id=${dbId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
  return { accessToken, sessionId: sessionRes.data.session, host: sessionRes.data.host };
}

async function testFetchJournals() {
  try {
    const { accessToken, sessionId, host } = await getAccurateConnection();
    const apiBaseUrl = `${host}/accurate`;

    const res = await axios.get(`${apiBaseUrl}/api/journal-voucher/list.do`, {
      params: {
        'fields': 'id,number,description,transDate,sourceType',
        'filter.transDate.op': 'BETWEEN',
        'filter.transDate.val1': '01/01/2025',
        'filter.transDate.val2': '31/01/2025',
        'filter.sourceType.op': 'EQUAL',
        'filter.sourceType.val': 'PURCHASE_INVOICE'
      },
      headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Session-ID': sessionId }
    });

    if (!res.data.s) throw new Error(res.data.d);
    
    console.log(`Found ${res.data.d.length} journals.`);
    console.log(res.data.d.slice(0, 5));

  } catch (err: any) {
    console.error(err.response?.data || err.message);
  }
}

testFetchJournals();