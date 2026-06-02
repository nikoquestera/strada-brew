require('dotenv').config();
const { google } = require('googleapis');

async function run() {
    const auth = new google.auth.GoogleAuth({
        keyFile: './service-account.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const monthlyId = "1ly7LV1d1K2F46TmH03XMzX7PgS48Kf88jm1G27lLQY4";

    try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: monthlyId });
        const tabs = meta.data.sheets;
        const tab = tabs[tabs.length - 1].properties.title;
        console.log(`LATEST TAB: '${tab}'`);
        
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: monthlyId,
            range: `'${tab}'!A1:H150`
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
run().catch(console.error);