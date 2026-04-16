import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const auditDir = path.join(process.cwd(), 'audit/OTORISASI 2025');
const files = fs.readdirSync(auditDir).filter(f => f.endsWith('.xlsx'));

console.log(`Starting audit of ${files.length} Otorisasi Excel files...\n`);

const allInvoices: { file: string; pi: string; amount: number; vendor: string }[] = [];

files.forEach(file => {
  try {
    const workbook = xlsx.readFile(path.join(auditDir, file));
    const sheetName = workbook.SheetNames.find(s => s === 'Data' || s.toLowerCase().includes('data')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Find the header row to determine column indices dynamically if possible
    // Default indices based on inspection: 
    // "Amount" is at index 6, "Remark 1" (PI Number) at index 12, "Receiver Name" at index 16
    let amountIdx = 6;
    let remark1Idx = 12;
    let receiverNameIdx = 16;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        // Header detection logic
        if (row.includes('Amount') && row.includes('Remark 1')) {
            amountIdx = row.indexOf('Amount');
            remark1Idx = row.indexOf('Remark 1');
            receiverNameIdx = row.indexOf('Receiver Name') !== -1 ? row.indexOf('Receiver Name') : 16;
            continue;
        }

        const piNumber = row[remark1Idx]?.toString() || '';
        const amount = parseFloat(row[amountIdx]);
        const receiverName = row[receiverNameIdx]?.toString() || 'Unknown';

        // Check if it's a 2025 January PI
        if (piNumber.startsWith('PI.2025.01.') || piNumber.startsWith('PI.2025.')) {
            allInvoices.push({ file, pi: piNumber, amount, vendor: receiverName });
        }
    }
  } catch (err: any) {
    console.error(`Error processing file ${file}:`, err.message);
  }
});

console.log(`Extracted ${allInvoices.length} PI records for 2025 from Excel files.`);

// Log all 2025 January invoices
const janInvoices = allInvoices.filter(inv => inv.pi.includes('.2025.01.'));
console.log(`\n--- FAKTUR PEMBELIAN (PI) JANUARI 2025 IN EXCEL ---`);
console.log(`Found ${janInvoices.length} Faktur Pembelian for January 2025 in the Otorisasi files.`);

janInvoices.forEach(inv => {
    console.log(`[${inv.file}] ${inv.pi} - Rp ${inv.amount.toLocaleString('id-ID')} (${inv.vendor})`);
});

fs.writeFileSync('audit_process_log.json', JSON.stringify(janInvoices, null, 2));
console.log(`\nLog saved to audit_process_log.json`);
