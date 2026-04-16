import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

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

  let accessToken = tokenData.access_token;
  // Note: we assume the token is fresh since it was just re-authenticated.

  const dbListRes = await axios.get('https://account.accurate.id/api/db-list.do', { headers: { 'Authorization': `Bearer ${accessToken}` } });
  const dbId = dbListRes.data.d[0].id;
  const sessionRes = await axios.get(`https://account.accurate.id/api/open-db.do?id=${dbId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
  
  return { accessToken, sessionId: sessionRes.data.session, host: sessionRes.data.host };
}

async function runAudit() {
  try {
    // 1. Load Excel data
    const excelDataFile = path.join(process.cwd(), 'audit_process_log.json');
    if (!fs.existsSync(excelDataFile)) {
      throw new Error('Please run the Excel extraction script first to generate audit_process_log.json');
    }
    const excelInvoices: { file: string; pi: string; amount: number; vendor: string }[] = JSON.parse(fs.readFileSync(excelDataFile, 'utf8'));
    console.log(`Loaded ${excelInvoices.length} PIs from Excel Otorisasi files.`);

    // 2. Connect to Accurate
    const { accessToken, sessionId, host } = await getAccurateConnection();
    const apiBaseUrl = `${host}/accurate`;

    // 3. Fetch Accurate PIs
    let accuratePIs: any[] = [];
    let page = 1;
    let totalPage = 1;
    
    console.log(`Fetching Purchase Invoices from Accurate (01 Jan 2025 - 31 Jan 2025)...`);
    
    do {
      const res = await axios.get(`${apiBaseUrl}/api/purchase-invoice/list.do`, {
        params: {
          'fields': 'id,number,transDate,totalAmount,vendor.name',
          'sp.page': page,
          'sp.pageSize': 100
        },
        paramsSerializer: params => {
           const searchParams = new URLSearchParams();
           for (const key in params) {
               searchParams.append(key, params[key]);
           }
           searchParams.append('filter.transDate.op', 'BETWEEN');
           searchParams.append('filter.transDate.val[0]', '01/01/2025');
           searchParams.append('filter.transDate.val[1]', '31/01/2025');
           return searchParams.toString();
        },
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Session-ID': sessionId }
      });

      if (!res.data.s) throw new Error(res.data.d);
      
      const pageData = res.data.d;
      accuratePIs = accuratePIs.concat(pageData);
      totalPage = res.data.sp?.pageCount || 1;
      page++;
    } while (page <= totalPage);

    console.log(`Found ${accuratePIs.length} Purchase Invoices in Accurate for Jan 2025.`);

    // 4. Do the Matching
    const logs: string[] = [];
    let matchCount = 0;
    let mismatchCount = 0;
    let notFoundInExcelCount = 0;

    console.log(`\n--- STARTING AUDIT ---`);
    for (const apiPi of accuratePIs) {
      const piNumber = apiPi.number;
      const apiAmount = apiPi.totalAmount;
      const apiVendor = apiPi.vendor?.name || 'Unknown';

      const excelMatch = excelInvoices.find(e => e.pi === piNumber);
      
      if (!excelMatch) {
        const msg = `[NOT FOUND IN EXCEL] PI: ${piNumber} | Accurate Nominal: Rp ${apiAmount.toLocaleString('id-ID')} | Vendor: ${apiVendor}`;
        console.log(msg);
        logs.push(msg);
        notFoundInExcelCount++;
      } else {
        const excelAmount = excelMatch.amount;
        if (apiAmount === excelAmount) {
          const msg = `[MATCH (GOOD)] PI: ${piNumber} | Accurate Nominal: Rp ${apiAmount.toLocaleString('id-ID')} == Excel Nominal: Rp ${excelAmount.toLocaleString('id-ID')} | File: ${excelMatch.file}`;
          console.log(msg);
          logs.push(msg);
          matchCount++;
        } else {
          const msg = `[MISMATCH (BAD)] PI: ${piNumber} | Accurate Nominal: Rp ${apiAmount.toLocaleString('id-ID')} != Excel Nominal: Rp ${excelAmount.toLocaleString('id-ID')} | File: ${excelMatch.file}`;
          console.log(msg);
          logs.push(msg);
          mismatchCount++;
        }
      }
    }
    
    // Check if there are any Excel PIs not in Accurate
    let notFoundInAccurateCount = 0;
    for (const excelPi of excelInvoices) {
      const accurateMatch = accuratePIs.find(a => a.number === excelPi.pi);
      if (!accurateMatch) {
        const msg = `[NOT FOUND IN ACCURATE] PI: ${excelPi.pi} | Excel Nominal: Rp ${excelPi.amount.toLocaleString('id-ID')} | File: ${excelPi.file}`;
        console.log(msg);
        logs.push(msg);
        notFoundInAccurateCount++;
      }
    }

    console.log(`\n--- AUDIT SUMMARY ---`);
    console.log(`Total Accurate PIs (Jan 2025): ${accuratePIs.length}`);
    console.log(`Total Excel PIs (Jan 2025): ${excelInvoices.length}`);
    console.log(`Matched (Good): ${matchCount}`);
    console.log(`Mismatched (Bad): ${mismatchCount}`);
    console.log(`Accurate PI not found in Excel: ${notFoundInExcelCount}`);
    console.log(`Excel PI not found in Accurate: ${notFoundInAccurateCount}`);

    fs.writeFileSync('audit_full_report.log', logs.join('\n'), 'utf8');
    console.log(`\nFull log saved to audit_full_report.log`);

  } catch (err: any) {
    console.error('Audit failed:', err.response?.data || err.message);
  }
}

runAudit();