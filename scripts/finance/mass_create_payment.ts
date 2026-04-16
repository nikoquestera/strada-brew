import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

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

async function getPIDetails(piNumber: string, c: any) {
  try {
    const res = await axios.get(`${c.host}/accurate/api/purchase-invoice/list.do`, {
      params: { 
        'filter.number.op': 'EQUAL', 
        'filter.number.val': piNumber,
        'fields': 'id,number,vendor.number,totalAmount'
      },
      headers: { 'Authorization': `Bearer ${c.accessToken}`, 'X-Session-ID': c.sessionId }
    });
    
    if (res.data.s && res.data.d.length > 0) {
      return res.data.d[0];
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function createPayment(piNumber: string, vendorNo: string, bankNo: string, amount: number, date: string, notes: string, c: any) {
  try {
    const payload = {
      bankNo: bankNo,
      vendorNo: vendorNo,
      transDate: date,
      description: notes,
      chequeAmount: amount,
      paymentMethod: 'BANK_TRANSFER', // Default to Bank Transfer
      detailInvoice: [
        {
          invoiceNo: piNumber,
          paymentAmount: amount
        }
      ]
    };

    const res = await axios.post(`${c.host}/accurate/api/purchase-payment/save.do`, payload, {
      headers: {
        'Authorization': `Bearer ${c.accessToken}`,
        'X-Session-ID': c.sessionId
      }
    });

    if (res.data.s) {
      return { success: true, number: res.data.d.number };
    } else {
      return { success: false, error: res.data.d };
    }
  } catch (err: any) {
    return { success: false, error: err.response?.data?.d || err.message };
  }
}

async function runMassPayment() {
  const csvPath = path.join(process.cwd(), 'mass_payment_template.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('Please fill mass_payment_template.csv first.');
    return;
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  const rows = parsed.data as any[];

  console.log(`Starting mass payment for ${rows.length} records...\n`);
  
  try {
    const c = await getAccurateConnection();
    console.log('Connected to Accurate.\n');

    for (const row of rows) {
      const piNumber = row.pi_number?.trim();
      const date = row.payment_date?.trim();
      const bankNo = row.bank_account_no?.trim();
      const amount = parseFloat(String(row.payment_amount).replace(/\./g, ''));
      const notes = row.notes?.trim() || '';

      if (!piNumber || !date || !bankNo || isNaN(amount)) {
        console.log(`Skipping invalid row: ${JSON.stringify(row)}`);
        continue;
      }

      process.stdout.write(`Processing Payment for ${piNumber}... `);

      // 1. Get Vendor Number from PI
      const piDetails = await getPIDetails(piNumber, c);
      if (!piDetails) {
        console.log('PI NOT FOUND ❌');
        continue;
      }

      const vendorNo = piDetails.vendor?.number;
      if (!vendorNo) {
        console.log('VENDOR NOT FOUND ❌');
        continue;
      }

      // 2. Create Payment
      const result = await createPayment(piNumber, vendorNo, bankNo, amount, date, notes, c);
      
      if (result.success) {
        console.log(`SUCCESS ✅ (Payment No: ${result.number})`);
      } else {
        console.log(`FAILED ❌ (${result.error})`);
      }
    }

    console.log('\nBatch processing complete!');
  } catch (err: any) {
    console.error('Process failed:', err.message);
  }
}

runMassPayment();