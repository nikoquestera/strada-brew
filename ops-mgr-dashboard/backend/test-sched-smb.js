require('dotenv').config();
const { google } = require('googleapis');

async function run() {
    const auth = new google.auth.GoogleAuth({
        keyFile: './service-account.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const tests = [
        { name: 'SMB', id: '1AvQ6fF4wt839ejmHv1qJsdXCzWc4Q30GrA8C8vCiEnc' },
        { name: 'SMB-GL', id: '1Qvy7xgNP-dz_5o8Y9XfuRlIgiy-BDVgf5jkKvVnL0n0' }
    ];

    for (let test of tests) {
        try {
            console.log(`\n=== ${test.name} ===`);
            const meta = await sheets.spreadsheets.get({ spreadsheetId: test.id });
            const tabs = meta.data.sheets;
            const tab = tabs[tabs.length - 1].properties.title;
            console.log(`LATEST TAB: '${tab}'`);
            
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: test.id,
                range: `'${tab}'!A1:Z30`
            });
            
            const rows = res.data.values || [];
            rows.forEach((row, i) => {
                if (row.length > 0 && row.some(cell => cell && String(cell).trim() !== '')) {
                    console.log(`[Row ${i}]`, JSON.stringify(row));
                }
            });
        } catch (e) {
            console.error(`Error:`, e.message);
        }
    }
}
run().catch(console.error);