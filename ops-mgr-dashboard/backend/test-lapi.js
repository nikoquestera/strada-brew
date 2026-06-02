require('dotenv').config();
const { google } = require('googleapis');

async function run() {
    const auth = new google.auth.GoogleAuth({
        keyFile: './service-account.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const dailyId = "13C86lmlfwmvsWvgIAAHVPzrp0a4BcTnI79hzXtMQgWA";
    const weeklyId = "11ZLrkIlXPpre1C-2k0qXacw2MRiVnbWWpNTSUL2hl-0";

    async function fetchSheet(id, name) {
        console.log(`\n===========================================`);
        console.log(`   ${name}   `);
        console.log(`===========================================`);
        try {
            const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
            const tabs = meta.data.sheets;
            const tab = tabs[tabs.length - 1].properties.title; // get latest tab
            console.log(`LATEST TAB: '${tab}'`);
            
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: id,
                range: `'${tab}'!A1:H100` // Read Col A to H, first 100 rows
            });
            
            const rows = res.data.values || [];
            rows.forEach((row, i) => {
                if (row.length > 0 && row.some(cell => cell && String(cell).trim() !== '')) {
                    console.log(`[Row ${i}]`, JSON.stringify(row));
                }
            });
        } catch (e) {
            console.error(`Error fetching ${name}:`, e.message);
        }
    }

    await fetchSheet(dailyId, "LA-PIAZZA DAILY");
    await fetchSheet(weeklyId, "LA-PIAZZA WEEKLY");
}

run().catch(console.error);
