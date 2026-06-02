require('dotenv').config();
const { google } = require('googleapis');

async function run() {
    const auth = new google.auth.GoogleAuth({
        keyFile: './service-account.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const scheduleId = "1DtonAOtzkaPFWV-cCr-giQjJ9ZrqosZN4_X0nr-Hr-k";

    try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: scheduleId });
        const tabs = meta.data.sheets;
        const tab = tabs[tabs.length - 1].properties.title;
        
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: scheduleId,
            range: `'${tab}'!A1:Z10`
        });
        
        const rows = res.data.values || [];
        for (let i = 2; i <= 8; i++) {
            console.log(`ROW ${i + 1}`, JSON.stringify(rows[i]));
        }
    } catch (e) {
        console.error(`Error:`, e.message);
    }
}
run().catch(console.error);