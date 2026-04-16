import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
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

function parseAmount(amtStr: string): number {
  if (!amtStr) return 0;
  const cleaned = String(amtStr).replace(/Rp|\s|\./g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function extractPettyCash() {
  const csvPath = path.join(process.cwd(), 'audit/Pemakaian Petty cash.csv');
  if (!fs.existsSync(csvPath)) return [];
  
  const content = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  
  const records = parsed.data.map((row: any) => {
    return {
      tanggalInvoice: row['Tanggal invoice:']?.trim(),
      tanggalDana: row['Tanggal dana diperlukan:']?.trim(),
      jumlah: parseAmount(row['Jumlah petty cash yang diperlukan (IDR)']),
      tujuan: row['Tujuan pemakaian dana:']?.trim() || ''
    };
  });
  
  return records;
}

function extractOtorKTN() {
  const csvPath = path.join(process.cwd(), 'audit/Otor KTN 25-26.csv');
  if (!fs.existsSync(csvPath)) return new Map<string, number>();

  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n');
  const headerIdx = lines.findIndex(l => l.startsWith('No.,Date,tgl otorisasi'));
  
  if (headerIdx === -1) return new Map<string, number>();

  const dataRows = lines.slice(headerIdx).join('\n');
  const parsed = Papa.parse(dataRows, { header: true, skipEmptyLines: true });

  const ktnMap = new Map<string, number>();

  parsed.data.forEach((row: any) => {
    const piNumber = row['COA / PI NO.']?.trim();
    if (piNumber && piNumber.includes('PI.')) {
      const amountStr = row[' Amount'] || row['Amount'];
      const amount = parseAmount(amountStr);
      if (amount > 0) {
        ktnMap.set(piNumber, amount);
      }
    }
  });

  return ktnMap;
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
              for (let c = amountIdx + 1; c < row.length; c++) {
                 if (typeof row[c] === 'string' && (row[c].includes('PT ') || row[c].includes(' PT') || row[c].includes('CV '))) {
                    vendor = row[c];
                 }
              }
              if (vendor === 'Unknown' && row.length > 16) {
                 vendor = String(row[16]);
              }
              excelInvoices.set(piNumber, { amount, vendor, file });
          }
      }
    } catch (err: any) {
      console.error(`Error processing file ${file}:`, err.message);
    }
  });

  return excelInvoices;
}

async function fetchInvoiceDetail(id: number, c: any) {
  try {
    const res = await axios.get(`${c.host}/accurate/api/purchase-invoice/detail.do`, {
      params: { id },
      headers: { 'Authorization': `Bearer ${c.accessToken}`, 'X-Session-ID': c.sessionId }
    });
    return res.data.d;
  } catch (err) {
    return null;
  }
}

async function runFullAudit() {
  try {
    const excelInvoicesMap = extractExcelInvoices();
    const pettyCashData = extractPettyCash();
    const ktnMap = extractOtorKTN();
    console.log(`Found ${pettyCashData.length} Petty Cash records.`);
    console.log(`Found ${ktnMap.size} records in Otor KTN 25-26.csv.\n`);

    console.log(`Connecting to Accurate...`);
    const c = await getAccurateConnection();
    const apiBaseUrl = `${c.host}/accurate`;

    let accuratePIs: any[] = [];
    let page = 1;
    let totalPage = 1;
    
    console.log(`Fetching Purchase Invoices from Accurate (01 Jan 2025 - 31 Dec 2025)...`);
    
    do {
      const res = await axios.get(`${apiBaseUrl}/api/purchase-invoice/list.do`, {
        params: {
          'fields': 'id,number,transDate,totalAmount,vendor.name,description',
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
           searchParams.append('filter.transDate.val[1]', '31/12/2025');
           return searchParams.toString();
        },
        headers: { 'Authorization': `Bearer ${c.accessToken}`, 'X-Session-ID': c.sessionId }
      });

      if (!res.data.s) throw new Error(res.data.d);
      
      const pageData = res.data.d;
      accuratePIs = accuratePIs.concat(pageData);
      totalPage = res.data.sp?.pageCount || 1;
      page++;
    } while (page <= totalPage);

    console.log(`Found ${accuratePIs.length} Purchase Invoices in Accurate for 2025.\n`);

    const logs: string[] = [];
    let matchCount = 0;
    let dpAdjustedMatchCount = 0;
    let mismatchCount = 0;
    let notFoundCount = 0;
    let pettyCashMatchCount = 0;
    let ecommerceMatchCount = 0;
    let ktnMatchCount = 0;

    // Track for fuzzy matching
    const mismatchedExcelEntries: any[] = [];
    const notFoundAccuratePIs: any[] = [];

    console.log(`--- STARTING COMPARISON ---`);
    for (const apiPi of accuratePIs) {
      const piNumber = apiPi.number;
      const apiAmount = apiPi.totalAmount;
      const apiVendor = apiPi.vendor?.name || 'Unknown';
      const apiDescription = apiPi.description || '';
      const isEcommerce = apiDescription.toLowerCase().includes('shopee') || apiDescription.toLowerCase().includes('tokopedia');

      const excelData = excelInvoicesMap.get(piNumber);
      
      if (excelData) {
        const excelAmount = excelData.amount;
        const diff = Math.abs(apiAmount - excelAmount);
        
        if (diff <= 1) { // Pembulatan <= Rp 1
          const msg = `[MATCH - GOOD] Faktur: ${piNumber} | Accurate: Rp ${apiAmount.toLocaleString('id-ID')} == Excel: Rp ${excelAmount.toLocaleString('id-ID')} | File: ${excelData.file}`;
          logs.push(msg);
          matchCount++;
        } else {
          // Dig deeper with API detail to find DP
          const detail = await fetchInvoiceDetail(apiPi.id, c);
          let dpFound = false;
          
          if (detail && detail.totalDownPayment && detail.totalDownPayment > 0) {
            const adjustedApiAmount = apiAmount - detail.totalDownPayment;
            const diffAdjusted = Math.abs(adjustedApiAmount - excelAmount);
            
            if (diffAdjusted <= 1) { // Pembulatan <= Rp 1 after DP
              const dpDetails = detail.detailDownPayment?.map((dp:any) => `DP Rp ${dp.paymentAmount.toLocaleString('id-ID')} (PI: ${dp.invoice?.number}, Paid: ${dp.invoice?.lastPaymentDateView})`).join(', ');
              const msg = `[MATCH - DP ADJUSTED] Faktur: ${piNumber} | Accurate Total: Rp ${apiAmount.toLocaleString('id-ID')} | Excel: Rp ${excelAmount.toLocaleString('id-ID')} | Faktur Uang Muka Info: ${dpDetails} | File: ${excelData.file}`;
              logs.push(msg);
              dpAdjustedMatchCount++;
              dpFound = true;
            }
          }
          
          if (!dpFound) {
            const msg = `[MISMATCH - BAD] Faktur: ${piNumber} | Accurate: Rp ${apiAmount.toLocaleString('id-ID')} != Excel: Rp ${excelAmount.toLocaleString('id-ID')} | File: ${excelData.file}`;
            logs.push(msg);
            mismatchCount++;
            
            mismatchedExcelEntries.push({
                piNumberInExcel: piNumber,
                excelAmount: excelAmount,
                file: excelData.file,
                accurateAmountForThisPi: apiAmount
            });
          }
        }
      } else {
        // Not found in Excel Otorisasi
        if (isEcommerce) {
           const msg = `[MATCH - ECOMMERCE] Faktur: ${piNumber} | Accurate: Rp ${apiAmount.toLocaleString('id-ID')} (${apiVendor}) | Keterangan: ${apiDescription}`;
           logs.push(msg);
           ecommerceMatchCount++;
        } else {
           // Try to find in Petty Cash
           const pettyCashBroadMatch = pettyCashData.find(pc => pc.jumlah === apiAmount);

           if (pettyCashBroadMatch) {
             const msg = `[MATCH - PETTY CASH] Faktur: ${piNumber} | Accurate: Rp ${apiAmount.toLocaleString('id-ID')} (${apiVendor}) == Petty Cash: Rp ${pettyCashBroadMatch.jumlah.toLocaleString('id-ID')} (${pettyCashBroadMatch.tujuan})`;
             logs.push(msg);
             pettyCashMatchCount++;
           } else {
             // Try to find in Otor KTN
             const ktnAmount = ktnMap.get(piNumber);
             
             if (ktnAmount) {
               const diffKtn = Math.abs(apiAmount - ktnAmount);
               
               if (diffKtn <= 1) {
                 const msg = `[MATCH - OTOR KTN] Faktur: ${piNumber} | Accurate: Rp ${apiAmount.toLocaleString('id-ID')} (${apiVendor}) == Otor KTN CSV: Rp ${ktnAmount.toLocaleString('id-ID')}`;
                 logs.push(msg);
                 ktnMatchCount++;
               } else {
                 const msg = `[MISMATCH - OTOR KTN] Faktur: ${piNumber} | Accurate: Rp ${apiAmount.toLocaleString('id-ID')} != Otor KTN CSV: Rp ${ktnAmount.toLocaleString('id-ID')}`;
                 logs.push(msg);
                 mismatchCount++;
                 
                 // We can also track KTN mismatches for fuzzy matching if needed, but let's focus on Excel for now.
               }
             } else {
               const msg = `[NOT FOUND ANYWHERE] Faktur: ${piNumber} | Accurate: Rp ${apiAmount.toLocaleString('id-ID')} (${apiVendor})`;
               logs.push(msg);
               notFoundCount++;
               
               notFoundAccuratePIs.push({
                   piNumber: piNumber,
                   apiAmount: apiAmount,
                   apiVendor: apiVendor
               });
             }
           }
        }
      }
    }

    // --- FUZZY MATCHING (TYPO / COPY-PASTE CHECK) ---
    const actionItems: string[] = [];
    if (mismatchedExcelEntries.length > 0 && notFoundAccuratePIs.length > 0) {
        actionItems.push(`\n======================================================`);
        actionItems.push(`🔍 TYPO & COPY-PASTE INVESTIGATION (ACTION REQUIRED) 🔍`);
        actionItems.push(`======================================================\n`);
        actionItems.push(`Kami menemukan beberapa transaksi Excel yang nominalnya BERBEDA dengan Accurate, namun nominal Excel tersebut SAMA PERSIS dengan Faktur Accurate lain yang statusnya "NOT FOUND ANYWHERE".\n`);
        actionItems.push(`Ini sangat mengindikasikan adanya salah ketik nomor PI (copy-paste error) di dalam file Excel Anda:\n`);

        mismatchedExcelEntries.forEach(mismatch => {
            const possibleMatches = notFoundAccuratePIs.filter(nf => Math.abs(nf.apiAmount - mismatch.excelAmount) <= 1);
            
            if (possibleMatches.length > 0) {
                possibleMatches.forEach(pm => {
                    actionItems.push(`⚠️  CEK FILE: ${mismatch.file}`);
                    actionItems.push(`   - Di Excel terketik PI: ${mismatch.piNumberInExcel} (dengan nominal Rp ${mismatch.excelAmount.toLocaleString('id-ID')})`);
                    actionItems.push(`   - Padahal di Accurate, ${mismatch.piNumberInExcel} nominal aslinya adalah Rp ${mismatch.accurateAmountForThisPi.toLocaleString('id-ID')}`);
                    actionItems.push(`   - 👉 SARAN PERBAIKAN: Apakah maksud Anda adalah ${pm.piNumber} (${pm.apiVendor})? Karena nominal ${pm.piNumber} persis Rp ${pm.apiAmount.toLocaleString('id-ID')}!\n`);
                });
            } else {
                actionItems.push(`📌 CEK FILE: ${mismatch.file}`);
                actionItems.push(`   - Mismatch murni pada PI: ${mismatch.piNumberInExcel}. Accurate: Rp ${mismatch.accurateAmountForThisPi.toLocaleString('id-ID')} vs Excel: Rp ${mismatch.excelAmount.toLocaleString('id-ID')} (Tidak ditemukan kemiripan typo dengan PI lain).\n`);
            }
        });
    }

    const summary = `\n--- AUDIT SUMMARY ---\n` +
      `Total Faktur Pembelian in Accurate (2025): ${accuratePIs.length}\n` +
      `Matched Nominal (Otorisasi Excel BCA): ${matchCount}\n` +
      `Matched Nominal (Otorisasi KTN CSV): ${ktnMatchCount}\n` +
      `Matched Nominal (with Uang Muka / DP Adjustment): ${dpAdjustedMatchCount}\n` +
      `Matched Nominal (E-commerce Tokopedia/Shopee): ${ecommerceMatchCount}\n` +
      `Matched Nominal (in Petty Cash CSV): ${pettyCashMatchCount}\n` +
      `Mismatched Nominal: ${mismatchCount}\n` +
      `Faktur in Accurate but NOT found anywhere: ${notFoundCount}\n`;
      
    console.log(summary);
    logs.push(summary);
    
    // Print Action Items to console and log
    if (actionItems.length > 0) {
        actionItems.forEach(item => {
            console.log(item);
            logs.push(item);
        });
    }

    fs.writeFileSync('audit_accurate_vs_excel_full_2025.log', logs.join('\n'), 'utf8');
    console.log(`Audit log successfully saved to audit_accurate_vs_excel_full_2025.log\n`);

  } catch (err: any) {
    console.error('Audit failed:', err.response?.data || err.message);
  }
}

runFullAudit();