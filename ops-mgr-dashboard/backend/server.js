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
const CACHE_TTL = 10 * 60 * 1000;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let syncProgress = { status: 'idle', percentage: 0, currentStore: '', error: null };

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
        console.warn(`⚠️ '${credPath}' tidak ditemukan.`);
    }
} catch (error) {
    console.error("❌ Error Google Auth:", error.message);
}

// ============================================================================
// HELPERS
// ============================================================================
const parseNum = (val) => {
    let s = String(val || '').trim();
    // Remove currency symbols and other non-numeric noise
    s = s.replace(/Rp\.?\s*/gi, '').replace(/[^0-9.,%-]/g, '').replace(/%.*/, '');
    if (!s) return 0;
    // Detect Indonesian dots-as-thousands separator: "15.722.100" vs decimal "22.97"
    // Indonesian format: multiple dot-separated groups where ALL groups after the first have exactly 3 digits
    if (s.includes('.') && !s.includes(',')) {
        const parts = s.split('.');
        if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) {
            s = parts.join(''); // dots are thousands separators → remove them
        }
    } else {
        s = s.replace(/,/g, ''); // commas are thousands separators (standard format)
    }
    return parseFloat(s) || 0;
};
const parseNumArray = (arr) => arr.map(parseNum);

const MONTH_ALIASES = [
    ['jan','januar','januari'], ['feb','februari'], ['mar','maret'],
    ['apr','april'], ['may','mei'], ['jun','juni','june'],
    ['jul','juli'], ['aug','agu','agustus'], ['sep','sept'],
    ['oct','okt','okto'], ['nov'], ['dec','des','desember']
];

// Extract { monthIdx (0-11), year } from a label like "January 2026" or "MEI 2026" or "27 Apr - 3 May 26"
function extractMonthYear(label) {
    const l = String(label || '').toLowerCase();
    let monthIdx = -1;
    for (let i = 0; i < MONTH_ALIASES.length; i++) {
        if (MONTH_ALIASES[i].some(a => l.includes(a))) { monthIdx = i; break; }
    }
    const yr = l.match(/\b(20\d\d|\b\d{2}\b)/);
    let year = yr ? parseInt(yr[1]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    return { monthIdx, year };
}

// Detect if dates in a cell string represent a given month index (0-based)
function cellIsInMonth(cell, monthIdx) {
    const s = String(cell || '').trim().toLowerCase();
    // "DD.MM.YY" format e.g. "01.06.26"
    const dotMatch = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (dotMatch) return parseInt(dotMatch[2]) === monthIdx + 1;
    // Month name formats e.g. "1 Juni 2026", "04 MEI - 10 MEI"
    const monthAliases = [
        ['jan'], ['feb'], ['mar', 'maret'], ['apr', 'april'],
        ['may', 'mei'], ['jun', 'juni', 'june'], ['jul', 'juli'],
        ['aug', 'agu', 'agust'], ['sep', 'sept'], ['oct', 'okt', 'okto'],
        ['nov'], ['dec', 'des']
    ];
    return monthAliases[monthIdx]?.some(a => s.includes(a)) ?? false;
}

// Detect column layout by scanning which column holds the Net Sales label.
// Returns { labelCol, dataStart } where data starts at labelCol + 2.
//   Compact  (Summitmas, SMB-GL): label at col 0, data at col 2
//   Standard (most stores):       label at col 1, data at col 3
//   Wide     (MKG-GL):            label at col 2, data at col 4
function detectColLayout(rows) {
    const LABEL_KEYWORDS = ['net sales', 'total net sales', 'at (', 'adt '];
    for (const row of rows) {
        if (!row || row.length < 3) continue;
        for (let c = 0; c <= 2; c++) {
            const val = String(row[c] || '').trim().toLowerCase();
            if (LABEL_KEYWORDS.some(kw => val.startsWith(kw) || val === kw.trim())) {
                return { labelCol: c, dataStart: c + 2 };
            }
        }
    }
    return { labelCol: 1, dataStart: 3 };
}

// Find the date row (first row where cells in the data range look like dates)
function findDateRow(rows, dataStart) {
    const dateRegex = /\d{1,2}\s*(jan|feb|mar|apr|may|mei|jun|jul|aug|agu|sep|oct|okt|nov|dec|des)/i;
    const dotDateRegex = /^\d{2}\.\d{2}\.\d{2}$/;
    for (const row of rows) {
        if (!row) continue;
        for (let j = dataStart; j < Math.min(row.length, dataStart + 40); j++) {
            const cell = String(row[j] || '').trim();
            if (dateRegex.test(cell) || dotDateRegex.test(cell) || cell.includes('202')) {
                return row;
            }
        }
    }
    return null;
}

const NETSALES_LABELS = new Set([
    'NET SALES (ACTUAL)', 'TOTAL NET SALES ACTUAL', 'NET SALES TOTAL',
    'NET SALES QUINOS (ACTUAL)', 'OMSET OUTLET MINGGUAN',
    'OMSET OUTLET BULANAN DALAM SATUAN RUPIAH'
]);

// Find the last column with non-zero Net Sales, restricted to columns that have
// a date label (avoids formula-summary columns and pasted future placeholders).
function findActiveCol(rows, labelCol, dataStart) {
    // First build the set of date-labeled columns (stop at first empty)
    const dateRow = findDateRow(rows, dataStart);
    const dateCols = new Set();
    if (dateRow) {
        for (let j = dataStart; j < Math.min(dateRow.length, dataStart + 40); j++) {
            if (!String(dateRow[j] || '').trim()) break; // stop at first empty
            dateCols.add(j);
        }
    }

    // Find last date-labeled column with non-zero Net Sales
    for (const row of rows) {
        if (!row) continue;
        for (let lc = 0; lc <= Math.max(labelCol, 2); lc++) {
            const lbl = String(row[lc] || '').trim().toUpperCase();
            if (NETSALES_LABELS.has(lbl)) {
                let lastValid = -1;
                // Prefer date-labeled columns; fall back to all if none found
                const candidates = dateCols.size > 0 ? dateCols : new Set(
                    Array.from({ length: Math.min(row.length - dataStart, 40) }, (_, i) => dataStart + i)
                );
                candidates.forEach(j => {
                    if (parseNum(row[j]) > 0) lastValid = Math.max(lastValid, j);
                });
                if (lastValid >= 0) return lastValid;
                break;
            }
        }
    }
    // Fallback: last non-empty date-labeled column
    return dateCols.size > 0 ? Math.max(...dateCols) : dataStart;
}

// Extract Jun MTD or WTD data from the daily rows
function computeCurrentPeriodFromDaily(dailyRows) {
    if (!dailyRows || dailyRows.length === 0) return null;

    const { labelCol, dataStart } = detectColLayout(dailyRows);
    const today = new Date();
    const todayDay = today.getDate(); // e.g. 3
    const currentMonthIdx = today.getMonth(); // 5 for June

    // Find the date row to know which columns belong to June
    const dateRow = findDateRow(dailyRows, dataStart);
    let targetCols = [];

    if (dateRow) {
        // Check if this tab spans multiple months (like Summitmas)
        const months = new Set();
        for (let j = dataStart; j < dateRow.length; j++) {
            const cell = String(dateRow[j] || '').trim();
            const dotMatch = cell.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
            if (dotMatch) months.add(parseInt(dotMatch[2]));
        }

        if (months.size > 1) {
            // Multi-month tab: only pick current month columns
            for (let j = dataStart; j < dateRow.length; j++) {
                if (cellIsInMonth(dateRow[j], currentMonthIdx)) {
                    targetCols.push(j);
                }
            }
        } else {
            // Single-week tab: use all columns that have date content
            for (let j = dataStart; j < dateRow.length + 5; j++) {
                const cell = String(dateRow[j] || '').trim();
                if (cell || j < dataStart + 7) targetCols.push(j);
            }
            // Limit to 7 days
            if (targetCols.length > 7) targetCols = targetCols.slice(0, 7);
        }
    }

    if (targetCols.length === 0) {
        // Last resort: use fixed columns dataStart through dataStart+6
        for (let j = dataStart; j < dataStart + 7; j++) targetCols.push(j);
    }

    let totalSales = 0, totalTarget = 0, atSum = 0, atCount = 0;

    for (const row of dailyRows) {
        if (!row) continue;
        // Scan cols 0-2 for label (same tolerance as parseBreakdown)
        let lbl = '';
        for (let lc = 0; lc <= Math.max(labelCol, 2); lc++) {
            const v = String(row[lc] || '').trim().toUpperCase();
            if (v) { lbl = v; break; }
        }
        if (!lbl) continue;

        if (NETSALES_LABELS.has(lbl)) {
            targetCols.forEach(j => { const v = parseNum(row[j]); if (v > 0) totalSales += v; });
        } else if (lbl === 'NET SALES (TARGET)' || lbl === 'NET SALES TARGET') {
            targetCols.forEach(j => { totalTarget += parseNum(row[j]); });
        } else if (lbl === 'AT (ACTUAL)' || lbl === 'AT ACTUAL' || lbl === 'RATA-RATA SPENDING/TRANSAKSI') {
            targetCols.forEach(j => { const v = parseNum(row[j]); if (v > 0) { atSum += v; atCount++; } });
        }
    }

    if (totalSales === 0) return null;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const mName = monthNames[currentMonthIdx];

    return {
        wLabel: `${mName} WTD (1-${todayDay})`,
        mLabel: `${mName} MTD (1-${todayDay})`,
        netSales: totalSales,
        target: totalTarget,
        at: atCount > 0 ? atSum / atCount : 0,
    };
}

// ============================================================================
// 1. DATA FETCHING
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
        const storeDataRaw = { daily: null, weekly: null, monthly: null, schedule: null };

        try {
            console.log(`📊 [Sync] Mengambil data ${storeName}...`);

            const fetchLatestTab = async (sheetId, type) => {
                if (!sheetId) return { rows: [], tabTitle: '' };
                const meta = await sheetsClient.spreadsheets.get({ spreadsheetId: sheetId });
                const tabs = meta.data.sheets;
                let selectedTab = tabs[tabs.length - 1].properties.title;

                if (type === 'schedule') {
                    const now = new Date();
                    const targetMonthIdx = now.getDate() >= 20 ? (now.getMonth() + 1) % 12 : now.getMonth();
                    const monthAliases = [
                        ['jan', 'januar', 'januari'], ['feb', 'februari'], ['mar', 'maret'],
                        ['apr', 'april'], ['may', 'mei'], ['jun', 'juni', 'june'],
                        ['jul', 'juli'], ['aug', 'agu', 'agus', 'agustus'],
                        ['sep', 'sept'], ['oct', 'okt', 'okto'],
                        ['nov'], ['dec', 'des', 'desember']
                    ];
                    const targetAliases = monthAliases[targetMonthIdx] || [];
                    let bestTab = null;
                    for (let j = tabs.length - 1; j >= 0; j--) {
                        const title = tabs[j].properties.title.toLowerCase();
                        if (targetAliases.some(a => title.includes(a))) { bestTab = tabs[j].properties.title; break; }
                    }
                    if (bestTab) selectedTab = bestTab;
                }

                console.log(`   └── [${type}] Using Tab: ${selectedTab}`);
                await delay(800);
                const res = await sheetsClient.spreadsheets.values.get({
                    spreadsheetId: sheetId,
                    range: `'${selectedTab}'!A1:AO200`,
                });
                await delay(800);
                return { rows: res.data.values || [], tabTitle: selectedTab };
            };

            storeDataRaw.daily   = await fetchLatestTab(sheetsObj.daily,    'daily');
            storeDataRaw.weekly  = await fetchLatestTab(sheetsObj.weekly,   'weekly');
            storeDataRaw.monthly = await fetchLatestTab(sheetsObj.monthly,  'monthly');
            storeDataRaw.schedule = await fetchLatestTab(sheetsObj.schedule, 'schedule');

            results[storeName] = transformDataForFrontend(storeName, storeDataRaw);
        } catch (error) {
            console.error(`❌ Gagal mengambil data ${storeName}:`, error.message);
            results[storeName] = transformDataForFrontend(storeName, {
                daily: { rows: [], tabTitle: '' }, weekly: { rows: [], tabTitle: '' },
                monthly: { rows: [], tabTitle: '' }, schedule: { rows: [], tabTitle: '' }
            });
        }
    }

    results["All"] = buildAggregateObject(results);
    syncProgress.percentage = 100;
    syncProgress.status = 'complete';
    return results;
}

function buildFallbackGlobalData() {
    const d = transformDataForFrontend("All", {
        daily: { rows: [], tabTitle: '' }, weekly: { rows: [], tabTitle: '' },
        monthly: { rows: [], tabTitle: '' }, schedule: { rows: [], tabTitle: '' }
    });
    d.aiInsights = { text: "Backend tidak terautentikasi.", actions: [] };
    return { "All": d };
}

// ============================================================================
// 2. PARSER
// ============================================================================
function transformDataForFrontend(storeName, storeDataRaw) {
    const data = {
        dailyBreakdown:   { labels: [], netSales: [], target: [], at: [] },
        weeklyBreakdown:  { labels: [], netSales: [], target: [], at: [] },
        monthlyBreakdown: { labels: [], netSales: [], target: [], at: [] },
        products: {
            weekly:  { topBeverage: [], bottomBeverage: [], topMain: [], bottomMain: [], topCake: [], bottomCake: [], waste: [] },
            monthly: { topBeverage: [], bottomBeverage: [], topMain: [], bottomMain: [], topCake: [], bottomCake: [], waste: [], topMerch: [] }
        },
        cogs: { weekly: { bar: 0, kitchen: 0, cake: 0 }, monthly: { bar: 0, kitchen: 0, cake: 0 } },
        schedules: []
    };

    if (!storeDataRaw) return data;

    const dailyRows   = storeDataRaw.daily?.rows   || storeDataRaw.daily   || [];
    const weeklyRows  = storeDataRaw.weekly?.rows  || storeDataRaw.weekly  || [];
    const monthlyRows = storeDataRaw.monthly?.rows || storeDataRaw.monthly || [];
    const scheduleRows = storeDataRaw.schedule?.rows || storeDataRaw.schedule || [];
    const weeklyTabTitle  = storeDataRaw.weekly?.tabTitle  || '';
    const monthlyTabTitle = storeDataRaw.monthly?.tabTitle || '';

    // ── Parse Breakdowns ──────────────────────────────────────────────────────

    // type = 'weekly' → truncate at activeCol (removes pasted-in future empty columns)
    //        'monthly' → gap-tolerant scanning (handles BSD's spacer columns between months)
    //        'daily'   → stop at first empty (daily tab always contiguous)
    const parseBreakdown = (rows, target, type = 'daily') => {
        if (!rows || rows.length === 0) return;
        const { labelCol, dataStart } = detectColLayout(rows);
        const dateRow = findDateRow(rows, dataStart);
        if (!dateRow) return;

        let rawLabels = [];

        if (type === 'weekly') {
            // Truncate at the last column with actual data (avoids empty future-week columns
            // and pasted-in old data beyond the last real week).
            const activeCol = findActiveCol(rows, labelCol, dataStart);
            const maxCols = Math.min(activeCol - dataStart + 1, 12);
            for (let i = dataStart; i < dataStart + maxCols; i++) {
                const s = String(dateRow[i] || '').trim();
                if (s) rawLabels.push(s);
            }
        } else if (type === 'monthly') {
            // Gap-tolerant: allow up to 4 consecutive empty spacer cells between months.
            // BSD monthly "2026" tab has 3 empty spacer columns between April and May.
            let gapCount = 0;
            for (let i = dataStart; i < Math.min(dateRow.length, dataStart + 40); i++) {
                const s = String(dateRow[i] || '').trim();
                if (!s) {
                    gapCount++;
                    if (gapCount > 4) break;
                } else {
                    rawLabels.push(s);
                    gapCount = 0;
                    if (rawLabels.length >= 12) break;
                }
            }
        } else {
            // Daily: stop at first empty (daily tabs are always contiguous)
            for (let i = dataStart; i < Math.min(dateRow.length, dataStart + 40); i++) {
                const s = String(dateRow[i] || '').trim();
                if (!s) break;
                rawLabels.push(s);
                if (rawLabels.length >= 12) break;
            }
        }

        target.labels = rawLabels;
        const colCount = target.labels.length;
        if (colCount === 0) return;

        rows.forEach(row => {
            if (!row) return;
            // Check cols 0-2 for the label (tolerates stores with extra leading empty columns)
            let lbl = '';
            for (let lc = 0; lc <= Math.max(labelCol, 2); lc++) {
                const v = String(row[lc] || '').trim().toUpperCase();
                if (v) { lbl = v; break; }
            }
            if (!lbl) return;
            const vals = parseNumArray(row.slice(dataStart, dataStart + colCount));

            // Net Sales Actual — many label variants across stores
            if (NETSALES_LABELS.has(lbl)) {
                target.netSales = vals;
            } else if (lbl === 'NET SALES (TARGET)' || lbl === 'NET SALES TARGET') {
                target.target = vals;
            } else if (lbl === 'AT (ACTUAL)' || lbl === 'RATA-RATA SPENDING/TRANSAKSI' || lbl === 'AT ACTUAL') {
                target.at = vals;
            } else if (lbl === 'NET SALES MONTH TO DATE') {
                const lastMTD = vals.filter(v => v > 0).pop() || 0;
                if (lastMTD) target.monthToDateFinal = lastMTD;
            }
        });
    };

    parseBreakdown(dailyRows,   data.dailyBreakdown,   'daily');
    parseBreakdown(weeklyRows,  data.weeklyBreakdown,  'weekly');
    parseBreakdown(monthlyRows, data.monthlyBreakdown, 'monthly');

    // ── Monthly post-processing: deduplicate duplicate months + drop future months ─
    // Some stores (e.g. MKG-GL) have duplicate month headers from bad copy-paste.
    // Strategy: for each calendar month, keep the entry with the highest net sales.
    // Also drop any month that is strictly after the current calendar month.
    {
        const todayForFilter = new Date();
        const currentMonthStart = new Date(todayForFilter.getFullYear(), todayForFilter.getMonth(), 1);

        const entries = data.monthlyBreakdown.labels.map((label, i) => {
            const { monthIdx, year } = extractMonthYear(label);
            return { label, monthIdx, year, i,
                netSales: data.monthlyBreakdown.netSales[i] || 0,
                target:   data.monthlyBreakdown.target[i]   || 0,
                at:       data.monthlyBreakdown.at[i]       || 0,
            };
        }).filter(e => {
            if (e.monthIdx < 0) return false; // unparseable label
            const d = new Date(e.year, e.monthIdx, 1);
            return d <= currentMonthStart; // drop future months
        });

        // Deduplicate: for same year+month, keep entry with highest netSales
        const monthMap = new Map();
        for (const e of entries) {
            const key = `${e.year}-${String(e.monthIdx).padStart(2,'0')}`;
            if (!monthMap.has(key) || e.netSales > (monthMap.get(key).netSales || 0)) {
                monthMap.set(key, e);
            }
        }

        // Sort chronologically and rebuild arrays
        const sorted = Array.from(monthMap.values())
            .sort((a, b) => a.year !== b.year ? a.year - b.year : a.monthIdx - b.monthIdx);

        data.monthlyBreakdown.labels   = sorted.map(e => e.label);
        data.monthlyBreakdown.netSales = sorted.map(e => e.netSales);
        data.monthlyBreakdown.target   = sorted.map(e => e.target);
        data.monthlyBreakdown.at       = sorted.map(e => e.at);
    }

    // ── Supplement: WTD from daily → append to weekly breakdown ──────────────
    const today = new Date();
    const currentMonthIdx = today.getMonth(); // 5 = June

    const currentMonthAliases = MONTH_ALIASES[currentMonthIdx] || [];
    const weeklyTabLower = weeklyTabTitle.toLowerCase();
    const weeklyHasCurrentMonth = currentMonthAliases.some(a => weeklyTabLower.includes(a));

    // Detect stale weekly: the tab says it's for the current month (e.g. "JUNI")
    // but the last non-zero entry is from a previous month — clear stale data
    const lastFilledWeekLabel = (data.weeklyBreakdown.labels || [])
        .filter((_, i) => (data.weeklyBreakdown.netSales[i] || 0) > 0).pop() || '';
    const lastWeekIsCurrentMonth = currentMonthAliases.some(a => lastFilledWeekLabel.toLowerCase().includes(a));
    if (weeklyHasCurrentMonth && !lastWeekIsCurrentMonth && data.weeklyBreakdown.labels.length > 0) {
        // Current-month tab exists but only has previous-month data → clear it
        data.weeklyBreakdown.labels = [];
        data.weeklyBreakdown.netSales = [];
        data.weeklyBreakdown.target = [];
        data.weeklyBreakdown.at = [];
    }

    // Append WTD from daily if available
    const currentPeriod = computeCurrentPeriodFromDaily(dailyRows);
    if (currentPeriod) {
        const lastWeeklyActual = data.weeklyBreakdown.netSales.filter(v => v > 0).pop() || 0;
        if (currentPeriod.netSales !== lastWeeklyActual) {
            data.weeklyBreakdown.labels.push(currentPeriod.wLabel);
            data.weeklyBreakdown.netSales.push(currentPeriod.netSales);
            data.weeklyBreakdown.target.push(currentPeriod.target);
            data.weeklyBreakdown.at.push(currentPeriod.at);
        }
    }

    // ── Supplement: MTD from daily → fix/append to monthly breakdown ─────────
    const monthlyLabelsLower = data.monthlyBreakdown.labels.map(l => l.toLowerCase());

    // 1. Fix prior month (e.g., May) if it's 0 in monthly but we have the weekly MTD final
    const prevMonthIdx = (currentMonthIdx + 11) % 12; // month before current
    const prevMonthAliases = [
        ['jan', 'januar', 'januari'], ['feb', 'februari'], ['mar', 'maret'],
        ['apr', 'april'], ['may', 'mei'], ['jun', 'juni', 'june'],
        ['jul', 'juli'], ['aug', 'agu', 'agustus'],
        ['sep', 'sept'], ['oct', 'okt'], ['nov'], ['dec', 'des']
    ][prevMonthIdx] || [];
    const prevMonthIdxInLabels = monthlyLabelsLower.findIndex(l =>
        prevMonthAliases.some(a => l.includes(a))
    );
    const weeklyMTDFinal = data.weeklyBreakdown.monthToDateFinal || 0;
    if (prevMonthIdxInLabels >= 0 &&
        (data.monthlyBreakdown.netSales[prevMonthIdxInLabels] || 0) === 0 &&
        weeklyMTDFinal > 0) {
        data.monthlyBreakdown.netSales[prevMonthIdxInLabels] = weeklyMTDFinal;
        console.log(`  ↳ Filled ${data.monthlyBreakdown.labels[prevMonthIdxInLabels]} from weekly MTD: ${weeklyMTDFinal}`);
    }

    // 2. Fix current month if label exists but value is 0 → replace with daily MTD
    const currentMonthIdxInLabels = monthlyLabelsLower.findIndex(l =>
        currentMonthAliases.some(a => l.includes(a))
    );
    const lastMonthlyTarget = data.monthlyBreakdown.target.filter(v => v > 0).pop() || 0;

    if (currentMonthIdxInLabels >= 0 && currentPeriod &&
        (data.monthlyBreakdown.netSales[currentMonthIdxInLabels] || 0) === 0) {
        // Label exists but empty — replace with WTD
        data.monthlyBreakdown.labels[currentMonthIdxInLabels] = currentPeriod.mLabel;
        data.monthlyBreakdown.netSales[currentMonthIdxInLabels] = currentPeriod.netSales;
        if (!data.monthlyBreakdown.target[currentMonthIdxInLabels]) {
            data.monthlyBreakdown.target[currentMonthIdxInLabels] = lastMonthlyTarget;
        }
        data.monthlyBreakdown.at[currentMonthIdxInLabels] = currentPeriod.at;
    } else if (currentMonthIdxInLabels < 0 && currentPeriod) {
        // Label doesn't exist — append new MTD column
        data.monthlyBreakdown.labels.push(currentPeriod.mLabel);
        data.monthlyBreakdown.netSales.push(currentPeriod.netSales);
        data.monthlyBreakdown.target.push(lastMonthlyTarget);
        data.monthlyBreakdown.at.push(currentPeriod.at);
    }

    // ── Parse Products ────────────────────────────────────────────────────────
    const parseProducts = (rows, productTarget, isMonthly) => {
        if (!rows || rows.length === 0) return;
        const { labelCol, dataStart } = detectColLayout(rows);

        // Find the last column with non-zero Net Sales Actual
        const activeCol = findActiveCol(rows, labelCol, dataStart);

        let state = '';
        rows.forEach(row => {
            if (!row) return;
            const labelRaw = String(row[labelCol] || '').trim().toUpperCase();
            // Also check col 0 if labelCol is 1 (sometimes section headers in col A)
            const altLabel = labelCol > 0 ? String(row[0] || '').trim().toUpperCase() : '';
            const effectiveLabel = labelRaw || altLabel;

            // COGS
            if (labelRaw.includes('% COGS BAR')) {
                const m = String(row[activeCol] || '').match(/([\d.,]+)\s*%/);
                if (m) data.cogs[isMonthly ? 'monthly' : 'weekly'].bar = parseFloat(m[1].replace(',', '.'));
            } else if (labelRaw.includes('% COGS KITCHEN')) {
                const m = String(row[activeCol] || '').match(/([\d.,]+)\s*%/);
                if (m) data.cogs[isMonthly ? 'monthly' : 'weekly'].kitchen = parseFloat(m[1].replace(',', '.'));
            } else if (labelRaw.includes('% COGS MERCHANDISE') || labelRaw.includes('% COGS MERCH') || labelRaw.includes('CAKE')) {
                const m = String(row[activeCol] || '').match(/([\d.,]+)\s*%/);
                if (m) data.cogs[isMonthly ? 'monthly' : 'weekly'].cake = parseFloat(m[1].replace(',', '.'));
            }

            // State machine for product sections
            if (effectiveLabel.includes("TOP 5 BEVERAGE")) state = 'top_bev';
            else if (effectiveLabel.includes("BOTTOM 5 BEVERAGE")) state = 'bot_bev';
            else if (effectiveLabel.includes("TOP 5 MAIN COURSE")) state = 'top_main';
            else if (effectiveLabel.includes("BOTTOM 5 MAIN COURSE")) state = 'bot_main';
            else if (effectiveLabel.includes("TOP 5 CAKE") || effectiveLabel.includes("TOP 5 PASTRY") || effectiveLabel.includes("CAKE & APPETIZER")) {
                if (effectiveLabel.startsWith("TOP")) state = effectiveLabel.startsWith("BOTTOM") ? 'bot_cake' : 'top_cake';
            }
            else if (effectiveLabel.includes("BOTTOM 5 CAKE") || effectiveLabel.includes("BOTTOM 5 PASTRY")) state = 'bot_cake';
            else if (effectiveLabel.includes("TOP 5 WASTE")) state = 'waste';
            else if (effectiveLabel.includes("TOP MERCHANDISE SELLER")) state = 'merch';

            // Handle TOP/BOTTOM section headers separately (e.g. "TOP 5 CAKE & APPETIZER")
            if (effectiveLabel.match(/^TOP 5 CAKE/)) state = 'top_cake';
            if (effectiveLabel.match(/^BOTTOM 5 CAKE/)) state = 'bot_cake';

            // Capture item rows: "TOP 1" through "TOP 5", "BOTTOM 1" through "BOTTOM 5"
            if (labelRaw.match(/^(TOP|BOTTOM)\s+[1-5]$/)) {
                const itemName = String(row[activeCol] || '').trim();
                if (itemName && itemName !== '-' &&
                    !itemName.toLowerCase().includes('kosong') &&
                    !itemName.toLowerCase().includes('contoh')) {
                    const clean = itemName.replace(/\/{1,2}/g, '-').trim();
                    const fmt = `${storeName}: ${clean}`;
                    if (state === 'top_bev')  productTarget.topBeverage.push(fmt);
                    else if (state === 'bot_bev') productTarget.bottomBeverage.push(fmt);
                    else if (state === 'top_main') productTarget.topMain.push(fmt);
                    else if (state === 'bot_main') productTarget.bottomMain.push(fmt);
                    else if (state === 'top_cake') productTarget.topCake.push(fmt);
                    else if (state === 'bot_cake') productTarget.bottomCake.push(fmt);
                    else if (state === 'waste')   productTarget.waste.push(fmt);
                    else if (state === 'merch' && isMonthly) productTarget.topMerch.push(fmt);
                }
            }
        });
    };

    parseProducts(weeklyRows,  data.products.weekly,  false);
    parseProducts(monthlyRows, data.products.monthly, true);

    // ── Parse Schedules ───────────────────────────────────────────────────────
    const parseSchedules = (rows) => {
        const result = { headers: [], list: [] };
        if (!rows || rows.length === 0) return result;

        let dayRowIndices = [];
        for (let i = 0; i < rows.length; i++) {
            if (!rows[i]) continue;
            const s = rows[i].join('').toUpperCase();
            if ((s.includes('SEN') && s.includes('SEL')) || (s.includes('MON') && s.includes('TUE'))) {
                dayRowIndices.push(i);
            }
        }
        if (dayRowIndices.length === 0) return result;

        const personMap = {};
        const allDayCols = [];
        let currentRole = 'Staff';

        for (let blockIdx = 0; blockIdx < dayRowIndices.length; blockIdx++) {
            const hIdx = dayRowIndices[blockIdx];
            const headerRow = rows[hIdx];
            const dateRow2 = hIdx > 0 ? rows[hIdx - 1] : [];
            const blockDayCols = [];
            let nameColIdx = 0;

            for (let c = 0; c < headerRow.length; c++) {
                const cell = String(headerRow[c] || '').trim().toUpperCase();
                if (cell === 'NAMA' || cell === 'NAME' || cell === 'STAFF') {
                    nameColIdx = c;
                } else if (['SEN','SEL','RAB','KAM','JUM','SAB','MIN','MGG','MON','TUE','WED','THU','FRI','SAT','SUN'].some(d => cell.startsWith(d))) {
                    let dateStr = String(dateRow2?.[c] || '').trim();
                    let dayName = cell.substring(0, 3);
                    if (dayName === 'MGG') dayName = 'MIN';
                    const label = dateStr ? `${dayName} ${dateStr}` : dayName;
                    blockDayCols.push({ colIdx: c, label });
                    if (!allDayCols.some(d => d.label === label)) allDayCols.push({ label, colIdx: c });
                }
            }

            const endIdx = blockIdx < dayRowIndices.length - 1 ? dayRowIndices[blockIdx + 1] - 1 : rows.length;
            for (let r = hIdx + 1; r < endIdx; r++) {
                const row = rows[r];
                if (!row || row.length === 0) continue;
                const col0 = String(row[0] || '').trim();
                if (col0.toUpperCase().includes('BERUBAH') || col0.toUpperCase().includes('SEWAKTU')) continue;

                let nameCell = String(row[nameColIdx] || '').trim() ||
                               String(row[1] || '').trim() ||
                               String(row[0] || '').trim();

                let hasShift = blockDayCols.some(d => {
                    const v = String(row[d.colIdx] || '').trim();
                    return v && v.toUpperCase() !== 'OFF' && v !== '-';
                });

                if (nameCell && !hasShift && !/^\d/.test(nameCell) && nameCell.toUpperCase() !== 'PIC') {
                    currentRole = nameCell;
                    continue;
                }
                if (nameCell && nameCell.toUpperCase() !== 'NAMA' && nameCell.toUpperCase() !== 'NAME' &&
                    nameCell.toUpperCase() !== 'PIC' && nameCell !== '-') {
                    if (!personMap[nameCell]) personMap[nameCell] = { name: nameCell, role: currentRole, shiftsByLabel: {} };
                    blockDayCols.forEach(d => {
                        personMap[nameCell].shiftsByLabel[d.label] = String(row[d.colIdx] || '').trim() || 'OFF';
                    });
                }
            }
        }

        result.headers = allDayCols.map(d => d.label);
        for (const name in personMap) {
            const p = personMap[name];
            result.list.push({ store: storeName, name: p.name, role: p.role, shifts: allDayCols.map(d => p.shiftsByLabel[d.label] || 'OFF') });
        }
        return result;
    };

    const schedObj = parseSchedules(scheduleRows);
    if (schedObj.list.length > 0) {
        schedObj.store = storeName;
        data.schedules.push(schedObj);
    }
    return data;
}

// ============================================================================
// 3. AGGREGATION
// ============================================================================
// Aggregate is per current period only: one MTD column + one WTD column.
// Historical months differ in depth across stores, so summing by index is meaningless.
function buildAggregateObject(allStoresData) {
    const aggregate = {
        dailyBreakdown:   { labels: [], netSales: [], target: [], at: [] },
        weeklyBreakdown:  { labels: [], netSales: [], target: [], at: [] },
        monthlyBreakdown: { labels: [], netSales: [], target: [], at: [] },
        products: {
            weekly:  { topBeverage: [], bottomBeverage: [], topMain: [], bottomMain: [], topCake: [], bottomCake: [], waste: [] },
            monthly: { topBeverage: [], bottomBeverage: [], topMain: [], bottomMain: [], topCake: [], bottomCake: [], waste: [], topMerch: [] }
        },
        cogs: { weekly: { bar: 0, kitchen: 0, cake: 0 }, monthly: { bar: 0, kitchen: 0, cake: 0 } },
        schedules: [],
        aiInsights: null
    };

    let totalMTD = 0, totalMTDTarget = 0;
    let totalWTD = 0, totalWTDTarget = 0;
    let mtdLabel = '', wtdLabel = '';
    let atMTDSum = 0, atMTDCount = 0;
    let cogsCount = 0;

    for (const store of Object.keys(allStoresData)) {
        if (store === "All" || store === "global_defaults") continue;
        const d = allStoresData[store];

        // Monthly MTD: last element of this store's monthly breakdown
        const mNS = d.monthlyBreakdown?.netSales || [];
        const mTG = d.monthlyBreakdown?.target   || [];
        const mAT = d.monthlyBreakdown?.at        || [];
        const mLB = d.monthlyBreakdown?.labels    || [];
        if (mNS.length > 0) {
            totalMTD       += mNS[mNS.length - 1] || 0;
            totalMTDTarget += mTG[mTG.length - 1] || 0;
            const lastAT = mAT[mAT.length - 1] || 0;
            if (lastAT > 0) { atMTDSum += lastAT; atMTDCount++; }
            if (!mtdLabel && mLB.length > 0) mtdLabel = mLB[mLB.length - 1];
        }

        // Weekly WTD: last element
        const wNS = d.weeklyBreakdown?.netSales || [];
        const wTG = d.weeklyBreakdown?.target   || [];
        const wLB = d.weeklyBreakdown?.labels   || [];
        if (wNS.length > 0) {
            totalWTD       += wNS[wNS.length - 1] || 0;
            totalWTDTarget += wTG[wTG.length - 1] || 0;
            if (!wtdLabel && wLB.length > 0) wtdLabel = wLB[wLB.length - 1];
        }

        // Products and COGS aggregate normally
        const mp = (aggObj, srcObj) => {
            aggObj.topBeverage.push(...(srcObj.topBeverage||[]));
            aggObj.bottomBeverage.push(...(srcObj.bottomBeverage||[]));
            aggObj.topMain.push(...(srcObj.topMain||[]));
            aggObj.bottomMain.push(...(srcObj.bottomMain||[]));
            aggObj.topCake.push(...(srcObj.topCake||[]));
            aggObj.bottomCake.push(...(srcObj.bottomCake||[]));
            aggObj.waste.push(...(srcObj.waste||[]));
            if (srcObj.topMerch) aggObj.topMerch?.push(...srcObj.topMerch);
        };
        mp(aggregate.products.weekly,  d.products.weekly);
        mp(aggregate.products.monthly, d.products.monthly);
        if (d.schedules) aggregate.schedules.push(...d.schedules);

        aggregate.cogs.weekly.bar      += d.cogs.weekly.bar      || 0;
        aggregate.cogs.weekly.kitchen  += d.cogs.weekly.kitchen  || 0;
        aggregate.cogs.weekly.cake     += d.cogs.weekly.cake     || 0;
        aggregate.cogs.monthly.bar     += d.cogs.monthly.bar     || 0;
        aggregate.cogs.monthly.kitchen += d.cogs.monthly.kitchen || 0;
        aggregate.cogs.monthly.cake    += d.cogs.monthly.cake    || 0;
        cogsCount++;
    }

    // Build single-column MTD and WTD breakdowns for "All"
    aggregate.monthlyBreakdown = {
        labels:   [mtdLabel || 'Jun MTD'],
        netSales: [totalMTD],
        target:   [totalMTDTarget],
        at:       [atMTDCount > 0 ? atMTDSum / atMTDCount : 0]
    };
    aggregate.weeklyBreakdown = {
        labels:   [wtdLabel || 'Jun WTD'],
        netSales: [totalWTD],
        target:   [totalWTDTarget],
        at:       [0]
    };
    aggregate.dailyBreakdown = { labels: [], netSales: [], target: [], at: [] };

    if (cogsCount > 0) {
        aggregate.cogs.weekly.bar      /= cogsCount;
        aggregate.cogs.weekly.kitchen  /= cogsCount;
        aggregate.cogs.weekly.cake     /= cogsCount;
        aggregate.cogs.monthly.bar     /= cogsCount;
        aggregate.cogs.monthly.kitchen /= cogsCount;
        aggregate.cogs.monthly.cake    /= cogsCount;
    }

    return aggregate;
}

// ============================================================================
// 4. AI ANALYSIS
// ============================================================================
async function generateOpsInsights(metricsSummary) {
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY tidak diset");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Kamu adalah konsultan F&B retail Indonesia. Analisis data performa outlet berikut: ${JSON.stringify(metricsSummary)}. Berikan JSON persis: {"summary": "2 kalimat kesimpulan", "todo": ["Aksi 1", "Aksi 2", "Aksi 3"]}. Tanpa blok markdown.`;
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.warn("[Gemini] Error:", error.message);
        return {
            summary: "Analisis AI tidak tersedia saat ini.",
            todo: ["Review laporan mingguan", "Cek waste items", "Cek jadwal shift"]
        };
    }
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
        const forceRefresh = req.query.refresh === 'true';
        if (!forceRefresh && cache.data && (now - cache.lastFetch < CACHE_TTL)) return res.json(cache.data);
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
