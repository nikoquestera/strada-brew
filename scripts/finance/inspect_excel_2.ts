import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const auditDir = path.join(process.cwd(), 'audit/OTORISASI 2025');
const files = fs.readdirSync(auditDir).filter(f => f.endsWith('.xlsx'));

console.log(`Checking file: ${files[0]}`);
const workbook = xlsx.readFile(path.join(auditDir, files[0]));
console.log(`Sheet names: ${workbook.SheetNames}`);

const sheetName = workbook.SheetNames.find(s => !s.toLowerCase().includes('instruction')) || workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log(`Rows 1 to 30 of sheet ${sheetName}:`);
data.slice(0, 30).forEach((row: any, i) => {
    console.log(`Row ${i + 1}: ${JSON.stringify(row)}`);
});