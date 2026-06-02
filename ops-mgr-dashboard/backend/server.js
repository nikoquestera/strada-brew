require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// ============================================================================
// CONFIGURATION & STATE
// ============================================================================
const configPath = path.join(__dirname, 'config', 'store-mappings.json');
let storeMappings = {};

try {
    storeMappings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`✅ Loaded mapping config for ${Object.keys(storeMappings).length} stores.`);
} catch (e) {
    console.error("❌ Error loading store-mappings.json:", e.message);
}

const cache = { data: null, lastFetch: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 menit
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Progress Tracking State
let syncProgress = {
    status: 'idle', // 'idle', 'syncing', 'complete', 'error'
    percentage: 0,
    currentStore: '',
    error: null
};

// ============================================================================
// AUTHENTICATION
// ============================================================================
let sheetsClient = null;
try {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
    if (fs.existsSync(credPath)) {
        const auth = new google.auth.GoogleAuth({
            keyFile: credPath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        sheetsClient = google.sheets({ version: 'v4', auth });
        console.log("✅ Google Sheets API terautentikasi.");
    } else {
        console.warn(`⚠️ '${credPath}' tidak ditemukan. Fallback mode aktif.`);
    }
} catch (error) {
    console.error("❌ Error Google Auth:", error.message);
}

// ============================================================================
// 1. DATA FETCHING (Daily, Weekly, Monthly)
// ============================================================================
async function fetchAllSpreadsheetData() {
    syncProgress.status = 'syncing';
    syncProgress.percentage = 0;
    syncProgress.error = null;

    if (!sheetsClient) {
        syncProgress.status = 'error';
        syncProgress.error = "Sheets client not authenticated";
        return buildFallbackGlobalData();
    }

    const results = {};
    const stores = Object.keys(storeMappings).filter(k => k !== 'global_defaults');
    const totalSteps = stores.length;

    for (let i = 0; i < stores.length; i++) {
        const storeName = stores[i];
        syncProgress.currentStore = storeName;
        syncProgress.percentage = Math.round((i / totalSteps) * 100);

        const sheetsObj = storeMappings[storeName];
        const storeDataRaw = { daily: [], weekly: [], monthly: [], schedule: [] };

        try {
            console.log(`📊 [Sync] Mengambil data ${storeName}...`);
            
            const fetchLatestTab = async (sheetId, type) => {
                if (!sheetId) return [];
                const meta = await sheetsClient.spreadsheets.get({ spreadsheetId: sheetId });
                const tabs = meta.data.sheets;
                
                let selectedTab = tabs[tabs.length - 1].properties.title;
                
                // Smart Tab Selection for Schedules
                if (type === 'schedule') {
                    const now = new Date();
                    // If we are late in the month (>=20), look for next month, otherwise current month
                    const targetMonthIdx = now.getDate() >= 20 ? (now.getMonth() + 1) % 12 : now.getMonth();
                    
                    const monthsIndoFull = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
                    const monthsIndoShort = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGS', 'SEP', 'OKT', 'NOV', 'DES'];
                    const monthsEngShort = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                    
                    const targetFull = monthsIndoFull[targetMonthIdx];
                    const targetShort1 = monthsIndoShort[targetMonthIdx];
                    const targetShort2 = monthsEngShort[targetMonthIdx];
                    
                    let bestTab = null;
                    
                    // Priority 1: Strict match (e.g. "SCHEDULE JUNI")
                    for (let j = tabs.length - 1; j >= 0; j--) {
                        const title = tabs[j].properties.title.toUpperCase();
                        if (title.includes(`SCHEDULE ${targetFull}`) || title.includes(`SCHEDULE ${targetShort1}`) || title.includes(`SCHEDULE ${targetShort2}`)) {
                            bestTab = tabs[j].properties.title;
                            break;
                        }
                    }
                    
                    // Priority 2: Loose match
                    if (!bestTab) {
                        for (let j = tabs.length - 1; j >= 0; j--) {
                            const title = tabs[j].properties.title.toUpperCase();
                            if (title.includes(targetFull) || title.includes(` ${targetShort1}`) || title.includes(` ${targetShort2}`) || title === targetShort1 || title === targetShort2) {
                                bestTab = tabs[j].properties.title;
                                break;
                            }
                        }
                    }
                    
                    // Priority 3: Current month fallback if looking for next month
                    if (!bestTab && now.getDate() >= 20) {
                        const currFull = monthsIndoFull[now.getMonth()];
                        const currShort1 = monthsIndoShort[now.getMonth()];
                        const currShort2 = monthsEngShort[now.getMonth()];
                        
                        // Strict fallback
                        for (let j = tabs.length - 1; j >= 0; j--) {
                            const title = tabs[j].properties.title.toUpperCase();
                            if (title.includes(`SCHEDULE ${currFull}`) || title.includes(`SCHEDULE ${currShort1}`) || title.includes(`SCHEDULE ${currShort2}`)) {
                                bestTab = tabs[j].properties.title;
                                break;
                            }
                        }
                        // Loose fallback
                        if (!bestTab) {
                            for (let j = tabs.length - 1; j >= 0; j--) {
                                const title = tabs[j].properties.title.toUpperCase();
                                if (title.includes(currFull) || title.includes(` ${currShort1}`) || title.includes(` ${currShort2}`) || title === currShort1 || title === currShort2) {
                                    bestTab = tabs[j].properties.title;
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (bestTab) {
                        selectedTab = bestTab;
                    }
                }

                console.log(`   └── [${type}] Using Tab: ${selectedTab}`);

                await delay(800); // Higher delay for reliability
                const res = await sheetsClient.spreadsheets.values.get({
                    spreadsheetId: sheetId,
                    range: `'${selectedTab}'!A1:AO150`, // AO covers 41 columns (enough for 31 days)
                });
                await delay(800);
                return res.data.values || [];
            };

            storeDataRaw.daily = await fetchLatestTab(sheetsObj.daily, 'daily');
            storeDataRaw.weekly = await fetchLatestTab(sheetsObj.weekly, 'weekly');
            storeDataRaw.monthly = await fetchLatestTab(sheetsObj.monthly, 'monthly');
            storeDataRaw.schedule = await fetchLatestTab(sheetsObj.schedule, 'schedule');

            results[storeName] = transformDataForFrontend(storeName, storeDataRaw);

        } catch (error) {
            console.error(`❌ Gagal mengambil data ${storeName}:`, error.message);
            results[storeName] = transformDataForFrontend(storeName, { daily: [], weekly: [], monthly: [], schedule: [] });
        }
    }

    results["All"] = buildAggregateObject(results);
    syncProgress.percentage = 100;
    syncProgress.status = 'complete';
    return results;
}

// ============================================================================
// 2. STRICT PARSER (State Machine & Slicing)
// ============================================================================
function transformDataForFrontend(storeName, storeDataRaw) {
    const data = {
        dailyBreakdown: { labels: [], netSales: [], target: [], at: [] },
        weeklyBreakdown: { labels: [], netSales: [], target: [], at: [] },
        monthlyBreakdown: { labels: [], netSales: [], target: [], at: [] },
        products: {
            weekly: { topBeverage: [], bottomBeverage: [], topMain: [], bottomMain: [], topCake: [], bottomCake: [], waste: [] },
            monthly: { topBeverage: [], bottomBeverage: [], topMain: [], bottomMain: [], topCake: [], bottomCake: [], waste: [], topMerch: [] }
        },
        cogs: { weekly: { bar: 0, kitchen: 0, cake: 0 }, monthly: { bar: 0, kitchen: 0, cake: 0 } },
        schedules: []
    };

    if (!storeDataRaw) return data;

    const parseNumArray = (arr) => arr.map(val => parseFloat(String(val).replace(/[^0-9.-]+/g, "")) || 0);
    const dateRegex = /\d{1,2}\s*(jan|feb|mar|apr|may|mei|jun|jul|aug|agu|sep|oct|okt|nov|dec|des)/i;

    // --- Parse Breakdown Helper ---
    const parseBreakdown = (rows, breakdownTarget) => {
        if (!rows || rows.length === 0) return;
        rows.forEach(row => {
            if (!row) return;
            const label = String(row[0] || row[1] || '').trim().toUpperCase();
            
            if (!breakdownTarget.labels.length && row[3]) {
                const checkStr = String(row[3]).toUpperCase();
                if (checkStr.includes("WEEK") || dateRegex.test(checkStr) || checkStr.includes("202")) {
                    breakdownTarget.labels = row.slice(3, 10).map(s => String(s).trim()).filter(s => s !== "");
                }
            }

            if (label === 'TOTAL NET SALES ACTUAL' || label === 'NET SALES (ACTUAL)' || label === 'OMSET OUTLET MINGGUAN' || label === 'OMSET OUTLET BULANAN DALAM SATUAN RUPIAH') {
                breakdownTarget.netSales = parseNumArray(row.slice(3, 3 + breakdownTarget.labels.length));
            } else if (label === 'NET SALES (TARGET)' || label === 'NET SALES TARGET') {
                breakdownTarget.target = parseNumArray(row.slice(3, 3 + breakdownTarget.labels.length));
            } else if (label === 'AT (ACTUAL)' || label === 'RATA-RATA SPENDING/TRANSAKSI' || label === 'AT ACTUAL') {
                breakdownTarget.at = parseNumArray(row.slice(3, 3 + breakdownTarget.labels.length));
            }
        });
    };

    parseBreakdown(storeDataRaw.daily || [], data.dailyBreakdown);
    parseBreakdown(storeDataRaw.weekly || [], data.weeklyBreakdown);
    parseBreakdown(storeDataRaw.monthly || [], data.monthlyBreakdown);

    const parseProducts = (rows, productTarget, isMonthly = false) => {
        let state = '';
        let activeCol = -1;

        // Find the rightmost column with data based on headers
        rows.forEach(row => {
            if (!row || activeCol !== -1) return;
            if (row[3] && (String(row[3]).toUpperCase().includes("WEEK") || dateRegex.test(String(row[3])) || String(row[3]).includes("202"))) {
                for (let j = row.length - 1; j >= 1; j--) {
                    if (String(row[j]).trim() !== '') {
                        activeCol = j;
                        break;
                    }
                }
            }
        });

        // Fallback to Net Sales if header wasn't found
        if (activeCol === -1) {
            rows.forEach(row => {
                if (!row) return;
                const lbl = String(row[0] || row[1] || '').trim().toUpperCase();
                if (lbl === 'TOTAL NET SALES ACTUAL' || lbl === 'NET SALES (ACTUAL)' || lbl.includes('OMSET')) {
                    for (let j = row.length - 1; j >= 1; j--) {
                        if (String(row[j]).trim() !== '' && String(row[j]).trim() !== '-') {
                            activeCol = j;
                            break;
                        }
                    }
                }
            });
        }
        
        if (activeCol < 1) activeCol = 3; // safe fallback

        rows.forEach(row => {
            if (!row) return;
            const labelRaw = String(row[0] || row[1] || '').trim().toUpperCase();
            const label = String(row[1] || row[0] || '').trim().toUpperCase();

            if (label.includes('% COGS BAR')) {
                const val = String(row[activeCol] || '').match(/([\d.,]+)\s*%/);
                if (val) data.cogs[isMonthly ? 'monthly' : 'weekly'].bar = parseFloat(val[1].replace(',', '.'));
            } else if (label.includes('% COGS KITCHEN')) {
                const val = String(row[activeCol] || '').match(/([\d.,]+)\s*%/);
                if (val) data.cogs[isMonthly ? 'monthly' : 'weekly'].kitchen = parseFloat(val[1].replace(',', '.'));
            } else if (label.includes('% COGS MERCHANDISE') || label.includes('CAKE')) {
                const val = String(row[activeCol] || '').match(/([\d.,]+)\s*%/);
                if (val) data.cogs[isMonthly ? 'monthly' : 'weekly'].cake = parseFloat(val[1].replace(',', '.'));
            }

            if (labelRaw.includes("TOP 5 BEVERAGE")) state = 'top_bev';
            else if (labelRaw.includes("BOTTOM 5 BEVERAGE")) state = 'bot_bev';
            else if (labelRaw.includes("TOP 5 MAIN COURSE")) state = 'top_main';
            else if (labelRaw.includes("BOTTOM 5 MAIN COURSE")) state = 'bot_main';
            else if (labelRaw.includes("TOP 5 CAKE") || labelRaw.includes("TOP 5 PASTRY") || labelRaw.includes("TOP 5 CAKE & APPETIZER")) state = 'top_cake';
            else if (labelRaw.includes("BOTTOM 5 CAKE") || labelRaw.includes("BOTTOM 5 PASTRY") || labelRaw.includes("BOTTOM 5 CAKE & APPETIZER")) state = 'bot_cake';
            else if (labelRaw.includes("TOP 5 WASTE")) state = 'waste';
            else if (labelRaw.includes("TOP MERCHANDISE SELLER")) state = 'merch';

            if (label.match(/^(TOP|BOTTOM)\s+[1-5]/i)) {
                let itemName = String(row[activeCol] || "").trim();
                
                // Strictly no falling back across months/weeks to prevent time-traveling data
                // If it's empty, we must report it as empty.
                if (itemName && itemName !== '-' && !itemName.toLowerCase().includes('kosong') && !itemName.toLowerCase().includes('contoh')) {
                    const cleanItem = itemName.replace(/\/{1,2}/g, '-').trim();
                    const formatted = `${storeName}: ${cleanItem}`;
                    if (state === 'top_bev') productTarget.topBeverage.push(formatted);
                    else if (state === 'bot_bev') productTarget.bottomBeverage.push(formatted);
                    else if (state === 'top_main') productTarget.topMain.push(formatted);
                    else if (state === 'bot_main') productTarget.bottomMain.push(formatted);
                    else if (state === 'top_cake') productTarget.topCake.push(formatted);
                    else if (state === 'bot_cake') productTarget.bottomCake.push(formatted);
                    else if (state === 'waste') productTarget.waste.push(formatted);
                    else if (state === 'merch' && isMonthly) productTarget.topMerch.push(formatted);
                }
            }
        });
    };

    parseProducts(storeDataRaw.weekly || [], data.products.weekly, false);
    parseProducts(storeDataRaw.monthly || [], data.products.monthly, true);

    const parseSchedules = (rows) => {
        const targetObj = { headers: [], list: [] };
        if (!rows || rows.length === 0) return targetObj;

        let dayRows = [];
        for (let i = 0; i < rows.length; i++) {
            if (!rows[i]) continue;
            const rowStr = rows[i].join('').toUpperCase();
            if ((rowStr.includes('SEN') && rowStr.includes('SEL')) || 
                (rowStr.includes('MON') && rowStr.includes('TUE'))) {
                dayRows.push(i);
            }
        }

        if (dayRows.length === 0) return targetObj;

        const personMap = {};
        const allDayCols = [];
        let currentRole = 'Staff';

        for (let blockIdx = 0; blockIdx < dayRows.length; blockIdx++) {
            const hIdx = dayRows[blockIdx];
            const headerRow = rows[hIdx];
            const dateRow = hIdx > 0 ? rows[hIdx - 1] : [];
            
            const blockDayCols = [];
            let nameColIdx = 0;

            for (let c = 0; c < headerRow.length; c++) {
                const cell = String(headerRow[c] || '').trim().toUpperCase();
                if (cell === 'NAMA' || cell === 'NAME' || cell === 'STAFF') {
                    nameColIdx = c;
                } else if (['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN', 'MGG', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].some(d => cell.startsWith(d))) {
                    let dateStr = String(dateRow[c] || '').trim();
                    let dayName = cell.substring(0, 3);
                    if (dayName === 'MGG') dayName = 'MIN';
                    let label = dateStr ? `${dayName} ${dateStr}` : dayName;
                    
                    // Deduplicate headers if same month spreads horizontally, but allow if it's a new week
                    blockDayCols.push({ colIdx: c, label: label });
                    if (!allDayCols.some(d => d.label === label)) {
                        allDayCols.push({ label: label, colIdx: c });
                    }
                }
            }
            
            let endIdx = blockIdx < dayRows.length - 1 ? dayRows[blockIdx + 1] - 1 : rows.length;
            
            for (let r = hIdx + 1; r < endIdx; r++) {
                const row = rows[r];
                if (!row || row.length === 0) continue;
                
                const col0 = String(row[0] || '').trim();
                const col1 = String(row[1] || '').trim();
                if (col0.toUpperCase().includes('BERUBAH') || col0.toUpperCase().includes('SEWAKTU')) continue;

                let nameCell = String(row[nameColIdx] || '').trim();
                if (!nameCell) nameCell = col1;
                if (!nameCell) nameCell = col0;

                let hasShiftData = false;
                for(let d=0; d<blockDayCols.length; d++) {
                    let shiftVal = String(row[blockDayCols[d].colIdx] || '').trim();
                    if (shiftVal && shiftVal.toUpperCase() !== 'OFF' && shiftVal !== '-') hasShiftData = true;
                }

                if (nameCell && !hasShiftData && !['1','2','3','4','5','6','7','8','9','0'].includes(nameCell[0]) && nameCell.toUpperCase() !== 'PIC') {
                    currentRole = nameCell;
                    continue;
                }

                if (nameCell && nameCell.toUpperCase() !== 'NAMA' && nameCell.toUpperCase() !== 'NAME' && nameCell.toUpperCase() !== 'PIC' && nameCell !== '-') {
                    if (!personMap[nameCell]) {
                        personMap[nameCell] = { name: nameCell, role: currentRole, shiftsByLabel: {} };
                    }
                    for(let d=0; d<blockDayCols.length; d++) {
                        let shiftVal = String(row[blockDayCols[d].colIdx] || '').trim();
                        // Special fix for merged cells shifting data 1 column right
                        if (!shiftVal && row.length > blockDayCols[d].colIdx + 1) {
                            const nextIsDay = blockDayCols.some(dc => dc.colIdx === blockDayCols[d].colIdx + 1);
                            if (!nextIsDay) shiftVal = String(row[blockDayCols[d].colIdx + 1] || '').trim();
                        }
                        personMap[nameCell].shiftsByLabel[blockDayCols[d].label] = shiftVal || 'OFF';
                    }
                }
            }
        }

        targetObj.headers = allDayCols.map(d => d.label);
        for (const name in personMap) {
            const p = personMap[name];
            const shifts = allDayCols.map(d => p.shiftsByLabel[d.label] || 'OFF');
            targetObj.list.push({ store: storeName, name: p.name, role: p.role, shifts: shifts });
        }
        return targetObj;
    };

    const schedObj = parseSchedules(storeDataRaw.schedule || []);
    if (schedObj && schedObj.list.length > 0) {
        schedObj.store = storeName;
        data.schedules.push(schedObj);
    }
    return data;
}

function buildAggregateObject(allStoresData) {
    const aggregate = transformDataForFrontend("All", { daily: [], weekly: [], monthly: [] });
    const sumArrays = (target, source) => {
        source.forEach((val, i) => { target[i] = (target[i] || 0) + val; });
    };
    let storeCount = 0;
    for (const store of Object.keys(allStoresData)) {
        if (store === "All" || store === "global_defaults") continue;
        const d = allStoresData[store];
        storeCount++;
        if (!aggregate.dailyBreakdown.labels.length && d.dailyBreakdown.labels.length) aggregate.dailyBreakdown.labels = [...d.dailyBreakdown.labels];
        if (!aggregate.weeklyBreakdown.labels.length && d.weeklyBreakdown.labels.length) aggregate.weeklyBreakdown.labels = [...d.weeklyBreakdown.labels];
        if (!aggregate.monthlyBreakdown.labels.length && d.monthlyBreakdown.labels.length) aggregate.monthlyBreakdown.labels = [...d.monthlyBreakdown.labels];
        sumArrays(aggregate.dailyBreakdown.netSales, d.dailyBreakdown.netSales);
        sumArrays(aggregate.dailyBreakdown.target, d.dailyBreakdown.target);
        sumArrays(aggregate.dailyBreakdown.at, d.dailyBreakdown.at);
        sumArrays(aggregate.weeklyBreakdown.netSales, d.weeklyBreakdown.netSales);
        sumArrays(aggregate.weeklyBreakdown.target, d.weeklyBreakdown.target);
        sumArrays(aggregate.weeklyBreakdown.at, d.weeklyBreakdown.at);
        sumArrays(aggregate.monthlyBreakdown.netSales, d.monthlyBreakdown.netSales);
        sumArrays(aggregate.monthlyBreakdown.target, d.monthlyBreakdown.target);
        sumArrays(aggregate.monthlyBreakdown.at, d.monthlyBreakdown.at);

        const mergeProducts = (aggObj, srcObj) => {
            aggObj.topBeverage.push(...srcObj.topBeverage);
            aggObj.bottomBeverage.push(...srcObj.bottomBeverage);
            aggObj.topMain.push(...srcObj.topMain);
            aggObj.bottomMain.push(...srcObj.bottomMain);
            aggObj.topCake.push(...srcObj.topCake);
            aggObj.bottomCake.push(...srcObj.bottomCake);
            aggObj.waste.push(...srcObj.waste);
            if (srcObj.topMerch) aggObj.topMerch.push(...srcObj.topMerch);
        };
        mergeProducts(aggregate.products.weekly, d.products.weekly);
        mergeProducts(aggregate.products.monthly, d.products.monthly);
        if (d.schedules) aggregate.schedules.push(...d.schedules);

        aggregate.cogs.weekly.bar += d.cogs.weekly.bar || 0;
        aggregate.cogs.weekly.kitchen += d.cogs.weekly.kitchen || 0;
        aggregate.cogs.weekly.cake += d.cogs.weekly.cake || 0;
        aggregate.cogs.monthly.bar += d.cogs.monthly.bar || 0;
        aggregate.cogs.monthly.kitchen += d.cogs.monthly.kitchen || 0;
        aggregate.cogs.monthly.cake += d.cogs.monthly.cake || 0;
    }

    if (storeCount > 0) {
        aggregate.dailyBreakdown.at = aggregate.dailyBreakdown.at.map(v => v / storeCount);
        aggregate.weeklyBreakdown.at = aggregate.weeklyBreakdown.at.map(v => v / storeCount);
        aggregate.monthlyBreakdown.at = aggregate.monthlyBreakdown.at.map(v => v / storeCount);

        aggregate.cogs.weekly.bar /= storeCount;
        aggregate.cogs.weekly.kitchen /= storeCount;
        aggregate.cogs.weekly.cake /= storeCount;
        aggregate.cogs.monthly.bar /= storeCount;
        aggregate.cogs.monthly.kitchen /= storeCount;
        aggregate.cogs.monthly.cake /= storeCount;
    }
    return aggregate;
}

// ============================================================================
// 3. AI ANALYSIS
// ============================================================================
async function generateOpsInsights(metricsSummary) {
    let retries = 3;
    let lastError = "";

    while (retries > 0) {
        try {
            if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY tidak diset");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            
            // Switch to gemini-2.5-flash-lite. It has the highest capacity and is immune to the 503 "High Demand" errors hitting newer/preview tiers.
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
            
            const prompt = `Kamu adalah konsultan F&B retail. Analisis array data sales mingguan berikut: ${JSON.stringify(metricsSummary)}. Berikan JSON persis seperti ini: {"summary": "2 kalimat kesimpulan performa", "todo": ["Aksi 1", "Aksi 2", "Aksi 3"]}. Tanpa blok markdown.`;
            
            const result = await model.generateContent(prompt);
            const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(text);
        } catch (error) {
            lastError = error.message;
            console.warn(`[Gemini Warning]: ${lastError}. Retries left: ${retries - 1}`);
            
            // If it's a 503 High Demand, wait 2 seconds and try again
            if (lastError.includes("503") || lastError.includes("high demand")) {
                retries--;
                if (retries > 0) {
                    console.log("⏳ Menunggu 2 detik sebelum mencoba AI lagi...");
                    await delay(2000);
                }
            } else {
                // If it's a parsing error or auth error, don't retry, just break out
                break;
            }
        }
    }

    console.error("❌ [Gemini Final Error]: Gagal setelah retry. Alasan:", lastError);
    return { 
        summary: "Analisis AI sementara tidak tersedia karena server Google sedang sibuk. Silakan cek tabel breakdown di bawah.", 
        todo: ["Review laporan mingguan", "Cek waste items", "Cek jadwal shift"] 
    };
}

// ============================================================================
// API ROUTES
// ============================================================================
app.get('/', (req, res) => res.json({ status: "online", endpoints: ["/api/dashboard-data", "/api/config", "/api/sync-status"] }));
app.get('/api/sync-status', (req, res) => res.json(syncProgress));
app.get('/api/config', (req, res) => res.json(storeMappings));
app.post('/api/config', (req, res) => {
    try {
        storeMappings = req.body;
        fs.writeFileSync(configPath, JSON.stringify(storeMappings, null, 2), 'utf8');
        cache.data = null; cache.lastFetch = 0;
        res.json({ message: "Konfigurasi diperbarui" });
    } catch (err) { res.status(500).json({ error: "Gagal menyimpan" }); }
});

let activeFetchPromise = null;
app.get('/api/dashboard-data', async (req, res) => {
    try {
        const now = Date.now();
        if (cache.data && (now - cache.lastFetch < CACHE_TTL)) return res.json(cache.data);
        if (activeFetchPromise) return res.json(await activeFetchPromise);

        activeFetchPromise = (async () => {
            try {
                const finalData = await fetchAllSpreadsheetData();
                const aiResponse = await generateOpsInsights(finalData["All"]?.weeklyBreakdown || {});
                finalData["All"].aiInsights = { text: aiResponse.summary, actions: aiResponse.todo };
                cache.data = finalData;
                cache.lastFetch = Date.now();
                return finalData;
            } catch (err) {
                syncProgress.status = 'error';
                syncProgress.error = err.message;
                throw err;
            } finally { activeFetchPromise = null; }
        })();
        res.json(await activeFetchPromise);
    } catch (error) {
        console.error("Critical error in /api/dashboard-data:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));