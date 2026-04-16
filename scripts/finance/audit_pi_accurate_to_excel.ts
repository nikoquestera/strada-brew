import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';

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

function extractExcelInvoices() {
  const auditDir = path.join(process.cwd(), 'audit/OTORISASI 2025');
  const files = fs.readdirSync(auditDir).filter(f => f.endsWith('.xlsx'));

  console.log(`\nParsing ${files.length} Excel files in ${auditDir}...`);
  const excelInvoices = new Map<string, { amount: number, vendor: string, file: string }>();

  files.forEach(file => {
    try {
      const workbook = xlsx.readFile(path.join(auditDir, file));
      const sheetName = workbook.SheetNames.find(s => s === 'Data' || s.toLowerCase().includes('data')) || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      let amountIdx = 6;
      
      for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          
          if (row.includes('Amount') && row.includes('Remark 1')) {
              amountIdx = row.indexOf('Amount');
              continue;
          }

          // Search for PI string in the row
          let piNumber = '';
          for (const cell of row) {
             if (typeof cell === 'string' && cell.startsWith('PI.')) {
                 piNumber = cell.trim();
                 break;
             }
          }

          if (piNumber && piNumber.includes('.2025.')) {
              const amount = parseFloat(row[amountIdx] || 0);
              let vendor = 'Unknown';
              // Vendor is usually towards the end, after remark
              for (let c = amountIdx + 1; c < row.length; c++) {
                 if (typeof row[c] === 'string' && (row[c].includes('PT ') || row[c].includes(' PT') || row[c].includes('CV '))) {
                    vendor = row[c];
                 }
              }
              if (vendor === 'Unknown' && row.length > 16) {
                 vendor = String(row[16]);
              }

              // In case of duplicates in Excel, maybe log it, but let's just keep the first or latest
              excelInvoices.set(piNumber, { amount, vendor, file });
          }
      }
    } catch (err: any) {
      console.error(`Error processing file ${file}:`, err.message);
    }
  });

  console.log(`Found ${excelInvoices.size} unique 2025 Purchase Invoices in Excel.\n`);
  return excelInvoices;
}

async function runFullAudit() {
  try {
    const excelInvoicesMap = extractExcelInvoices();

    console.log(`Connecting to Accurate...`);
    const { accessToken, sessionId, host } = await getAccurateConnection();
    const apiBaseUrl = `${host}/accurate`;

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

    console.log(`Found ${accuratePIs.length} Purchase Invoices in Accurate for Jan 2025.\n`);

    const logs: string[] = [];
    let matchCount = 0;
    let mismatchCount = 0;
    let notFoundCount = 0;

    console.log(`--- STARTING COMPARISON ---`);
    for (const apiPi of accuratePIs) {
      const piNumber = apiPi.number;
      const apiAmount = apiPi.totalAmount;
      const apiVendor = apiPi.vendor?.name || 'Unknown';

      const excelData = excelInvoicesMap.get(piNumber);
      
      if (!excelData) {
        const msg = `[NOT FOUND IN EXCEL] Faktur: ${piNumber} | Accurate: Rp ${apiAmount.toLocaleString('id-ID')} (${apiVendor})`;
        console.log(msg);
        logs.push(msg);
        notFoundCount++;
      } else {
        const excelAmount = excelData.amount;
        if (apiAmount === excelAmount) {
          const msg = `[MATCH - GOOD] Faktur: ${piNumber} | Accurate: Rp ${apiAmount.toLocaleString('id-ID')} == Excel: Rp ${excelAmount.toLocaleString('id-ID')} | File: ${excelData.file}`;
          console.log(msg);
          logs.push(msg);
          matchCount++;
        } else {
          const msg = `[MISMATCH - BAD] Faktur: ${piNumber} | Accurate: Rp ${apiAmount.toLocaleString('id-ID')} != Excel: Rp ${excelAmount.toLocaleString('id-ID')} | File: ${excelData.file}`;
          console.log(msg);
          logs.push(msg);
          mismatchCount++;
        }
      }
    }

    const summary = `\n--- AUDIT SUMMARY ---\n` +
      `Total Faktur Pembelian in Accurate (Jan 2025): ${accuratePIs.length}\n` +
      `Matched Nominal: ${matchCount}\n` +
      `Mismatched Nominal: ${mismatchCount}\n` +
      `Faktur in Accurate but NOT found in any Otorisasi Excel: ${notFoundCount}\n`;
      
    console.log(summary);
    logs.push(summary);

    fs.writeFileSync('audit_accurate_vs_excel_jan_2025.log', logs.join('\n'), 'utf8');
    console.log(`Audit log successfully saved to audit_accurate_vs_excel_jan_2025.log\n`);

  } catch (err: any) {
    console.error('Audit failed:', err.response?.data || err.message);
  }
}

runFullAudit();