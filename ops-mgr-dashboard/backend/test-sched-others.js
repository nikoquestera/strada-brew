require('dotenv').config();
const { google } = require('googleapis');

async function run() {
    const auth = new google.auth.GoogleAuth({
        keyFile: './service-account.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const tests = [
        { name: 'MKG-GL', id: '1lR2juRWd-0YoKhSDSksLAftm767nrACWdNc0HE70oY0' },
        { name: 'BSD', id: '1OZDFvTl6FQNN75R56yggD8PJaRVApRb2f8ClVZZ1TAw' },
        { name: 'LA-PIAZZA', id: '1DtonAOtzkaPFWV-cCr-giQjJ9ZrqosZN4_X0nr-Hr-k'}
    ];

    for (let test of tests) {
        try {
            console.log(`\n=== ${test.name} ===`);
            const meta = await sheets.spreadsheets.get({ spreadsheetId: test.id });
            const tabs = meta.data.sheets;
            const tab = tabs[tabs.length - 1].properties.title;
            const res = await sheets.spreadsheets.values.get({ spreadsheetId: test.id, range: `'${tab}'!A1:Z50` });
            const rows = res.data.values || [];
            
            let targetObj = { headers: [], list: [] };
            
            let headerRowIdx = -1;
            let dayCols = []; 
            let nameColIdx = -1;
            
            for (let i = 0; i < Math.min(rows.length, 20); i++) {
                if (!rows[i]) continue;
                const rowStr = rows[i].join('').toUpperCase();
                if ((rowStr.includes('NAMA') || rowStr.includes('NAME')) && rowStr.includes('SEN')) {
                    headerRowIdx = i;
                    break;
                }
            }
            
            if (headerRowIdx >= 0) {
                const headerRow = rows[headerRowIdx];
                const dateRowUp = headerRowIdx > 0 ? rows[headerRowIdx - 1] : [];
                const dateRowDown = headerRowIdx + 1 < rows.length ? rows[headerRowIdx + 1] : [];

                for (let c = 0; c < headerRow.length; c++) {
                    const cell = String(headerRow[c] || '').trim().toUpperCase();
                    if (cell === 'NAMA' || cell === 'NAME') {
                        nameColIdx = c;
                    } else if (['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MGG', 'MIN'].includes(cell.substring(0,3))) {
                        let dateStr = String(dateRowUp[c] || '').trim();
                        if (!dateStr || dateStr.length > 15 || dateStr.toUpperCase() === 'OFF' || dateStr.includes(':')) {
                             dateStr = String(dateRowDown[c] || '').trim();
                        }
                        if (!dateStr || dateStr.length > 15 || dateStr.toUpperCase() === 'OFF' || dateStr.includes(':')) {
                             dateStr = '';
                        }
                        let label = dateStr ? `${dateStr} ${cell.substring(0,3)}` : cell.substring(0,3);
                        dayCols.push({ colIdx: c, label: label });
                    }
                }

                if (nameColIdx < 0) nameColIdx = 0;
                dayCols = dayCols.slice(0, 31); 
                targetObj.headers = dayCols.map(d => d.label);

                let currentRole = 'Staff';
                
                for (let i = headerRowIdx + 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length === 0) continue;
                    
                    const nameCell = String(row[nameColIdx] || '').trim();
                    const col0 = String(row[0] || '').trim();
                    const col1 = String(row[1] || '').trim();
                    
                    if (nameCell.toUpperCase().includes('BERUBAH') || col0.toUpperCase().includes('SEWAKTU') || nameCell.toUpperCase().includes('TOTAL')) break;
                    
                    // Identify roles (rows with text in nameCol but no shift data)
                    let hasShiftData = false;
                    for(let d=0; d<dayCols.length; d++) {
                        let shiftVal = String(row[dayCols[d].colIdx] || '').trim();
                        if (shiftVal && shiftVal.toUpperCase() !== 'OFF') hasShiftData = true;
                    }

                    if (nameCell && !hasShiftData && nameCell.toUpperCase() !== 'NAMA' && nameCell.toUpperCase() !== 'NAME') {
                        currentRole = nameCell;
                        continue;
                    } else if (!nameCell && col0 && col0.toUpperCase() !== 'PIC' && !['1','2','3','4','5','6','7','8','9','0'].includes(col0[0])) {
                        currentRole = col0; continue;
                    } else if (!nameCell && col1 && col1.toUpperCase() !== 'PIC' && !['1','2','3','4','5','6','7','8','9','0'].includes(col1[0])) {
                        currentRole = col1; continue;
                    }
                    
                    if (nameCell && nameCell.toUpperCase() !== 'NAMA' && nameCell.toUpperCase() !== 'NAME') {
                        const shifts = [];
                        for(let d=0; d<dayCols.length; d++) {
                            let shiftVal = String(row[dayCols[d].colIdx] || '').trim();
                            if (!shiftVal && row.length > dayCols[d].colIdx + 1) {
                                const nextIsDay = dayCols.some(dc => dc.colIdx === dayCols[d].colIdx + 1);
                                if (!nextIsDay) shiftVal = String(row[dayCols[d].colIdx + 1] || '').trim();
                            }
                            shifts.push(shiftVal || 'OFF');
                        }
                        targetObj.list.push({ name: nameCell, role: currentRole, shifts: shifts });
                    }
                }
            }
            console.log("HEADERS:", targetObj.headers);
            console.log("LIST (first 2):", targetObj.list.slice(0, 2));
        } catch (e) {
            console.error(`Error:`, e.message);
        }
    }
}
run().catch(console.error);