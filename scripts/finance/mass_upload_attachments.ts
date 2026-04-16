import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import FormData from 'form-data';

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SERVICE_SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getAccurateConnection() {
  const { data: tokenData, error } = await supabase
    .from('accurate_tokens')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
    
  if (error || !tokenData) throw new Error('No Accurate tokens found in database.');

  const accessToken = tokenData.access_token;
  const dbListRes = await axios.get('https://account.accurate.id/api/db-list.do', { headers: { 'Authorization': `Bearer ${accessToken}` } });
  const dbId = dbListRes.data.d[0].id;
  const sessionRes = await axios.get(`https://account.accurate.id/api/open-db.do?id=${dbId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
  
  return { accessToken, sessionId: sessionRes.data.session, host: sessionRes.data.host };
}

async function getPurchaseInvoiceId(piNumber: string, c: any) {
  try {
    const res = await axios.get(`${c.host}/accurate/api/purchase-invoice/list.do`, {
      params: { 
        'filter.number.op': 'EQUAL', 
        'filter.number.val': piNumber,
        'fields': 'id,number'
      },
      headers: { 'Authorization': `Bearer ${c.accessToken}`, 'X-Session-ID': c.sessionId }
    });
    
    if (res.data.s && res.data.d.length > 0) {
      return res.data.d[0].id;
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function uploadAttachment(transId: number, filePath: string, notes: string, c: any) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return false;
    }

    const form = new FormData();
    form.append('transType', 'PURCHASE_INVOICE');
    form.append('transId', transId.toString());
    form.append('notes', notes);
    form.append('file', fs.createReadStream(filePath));

    const res = await axios.post(`${c.host}/accurate/api/attachment/save.do`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${c.accessToken}`,
        'X-Session-ID': c.sessionId
      }
    });

    if (res.data.s) {
      return true;
    } else {
      console.error(`Accurate Error: ${res.data.d}`);
      return false;
    }
  } catch (err: any) {
    console.error(`Upload failed: ${err.response?.data?.d || err.message}`);
    return false;
  }
}

async function runMassUpload() {
  const csvPath = path.join(process.cwd(), 'mass_upload_template.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('Please fill mass_upload_template.csv first.');
    return;
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  const rows = parsed.data as any[];

  console.log(`Starting mass upload for ${rows.length} records...`);
  
  try {
    const c = await getAccurateConnection();
    console.log('Connected to Accurate.\n');

    for (const row of rows) {
      const piNumber = row.pi_number?.trim();
      const filePath = row.file_path?.trim();
      const notes = row.notes?.trim() || '';

      if (!piNumber || !filePath) continue;

      process.stdout.write(`Processing ${piNumber}... `);

      const transId = await getPurchaseInvoiceId(piNumber, c);
      if (!transId) {
        console.log('NOT FOUND in Accurate.');
        continue;
      }

      const success = await uploadAttachment(transId, filePath, notes, c);
      if (success) {
        console.log('SUCCESS ✅');
      } else {
        console.log('FAILED ❌');
      }
    }

    console.log('\nAll done!');
  } catch (err: any) {
    console.error('Connection failed:', err.message);
  }
}

runMassUpload();