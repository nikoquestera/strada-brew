// ============================================================
// TYPES
// ============================================================

export interface COGSData {
  pct: number
  amount: number
}

export interface OutletPerformanceData {
  outletId: string
  outletName: string
  reportType: 'monthly' | 'weekly' | 'daily'
  period: string                   // human-readable label e.g. "MEI 2026"
  netSalesTarget: number | null
  netSalesActual: number | null
  achievementPct: number | null
  atTarget: number | null
  atActual: number | null
  // Top/Bottom items
  topBeverage: string | null
  bottomBeverage: string | null
  topMainCourse: string | null
  bottomMainCourse: string | null
  topCake: string | null
  bottomCake: string | null
  topWasteBar: string | null
  topWasteKitchen: string | null
  topWasteFloor: string | null
  topWaste: string | null          // weekly uses single waste field
  // COGS (monthly only)
  cogsBar: COGSData | null
  cogsKitchen: COGSData | null
  cogsFloor: COGSData | null
  cogsMerch: COGSData | null
  // Merchandise (monthly only)
  topMerchandise: string | null
  fetchedAt: string
}

export interface AllPerformanceData {
  outlets: Record<string, {
    monthly: OutletPerformanceData | null
    weekly: OutletPerformanceData | null
    daily: OutletPerformanceData | null
  }>
  fetchedAt: string
  errors: string[]
}

// ============================================================
// OUTLET → SPREADSHEET ID MAPPING
// Replace 'YOUR_PERF_SHEET_*' with real Google Sheets spreadsheet IDs.
// Each outlet has 3 separate Sheets files (monthly / weekly / daily).
// ============================================================

export const PERFORMANCE_OUTLETS: Record<string, {
  outletName: string
  monthly: string
  weekly: string
  daily: string
}> = {
  'la-piazza': {
    outletName: 'La Piazza',
    monthly: 'YOUR_PERF_SHEET_LAPIAZZA_MONTHLY',
    weekly:  'YOUR_PERF_SHEET_LAPIAZZA_WEEKLY',
    daily:   'YOUR_PERF_SHEET_LAPIAZZA_DAILY',
  },
  'bsd': {
    outletName: 'BSD',
    monthly: 'YOUR_PERF_SHEET_BSD_MONTHLY',
    weekly:  'YOUR_PERF_SHEET_BSD_WEEKLY',
    daily:   'YOUR_PERF_SHEET_BSD_DAILY',
  },
  'mkg': {
    outletName: 'MKG',
    monthly: 'YOUR_PERF_SHEET_MKG_MONTHLY',
    weekly:  'YOUR_PERF_SHEET_MKG_WEEKLY',
    daily:   'YOUR_PERF_SHEET_MKG_DAILY',
  },
  'sms': {
    outletName: 'SMS',
    monthly: 'YOUR_PERF_SHEET_SMS_MONTHLY',
    weekly:  'YOUR_PERF_SHEET_SMS_WEEKLY',
    daily:   'YOUR_PERF_SHEET_SMS_DAILY',
  },
  'smb': {
    outletName: 'SMB',
    monthly: 'YOUR_PERF_SHEET_SMB_MONTHLY',
    weekly:  'YOUR_PERF_SHEET_SMB_WEEKLY',
    daily:   'YOUR_PERF_SHEET_SMB_DAILY',
  },
  'smb-gl': {
    outletName: 'SMB Gold Lounge',
    monthly: 'YOUR_PERF_SHEET_SMBGL_MONTHLY',
    weekly:  'YOUR_PERF_SHEET_SMBGL_WEEKLY',
    daily:   'YOUR_PERF_SHEET_SMBGL_DAILY',
  },
  'panen': {
    outletName: 'Panen Semarang',
    monthly: 'YOUR_PERF_SHEET_PANEN_MONTHLY',
    weekly:  'YOUR_PERF_SHEET_PANEN_WEEKLY',
    daily:   'YOUR_PERF_SHEET_PANEN_DAILY',
  },
}

// ============================================================
// INDONESIAN MONTH LABELS
// ============================================================

const ID_MONTH_LABELS = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
]

const ID_MONTH_SHORT: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MEI: 4, MAY: 4,
  JUN: 5, JUL: 6, AGU: 7, AUG: 7,
  SEP: 8, OKT: 9, OCT: 9, NOV: 10, DES: 11, DEC: 11,
}

// ============================================================
// VALUE PARSERS
// ============================================================

/** Parse Rupiah string: "Rp. 76.839.056" → 76839056 */
export function parseRupiah(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const s = String(raw).replace(/[Rp.\s]/gi, '').replace(/\./g, '').replace(/,/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

/** Parse number from cell (handles numeric or string). */
function parseNum(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const n = parseFloat(String(raw).replace(',', '.'))
  return isNaN(n) ? null : n
}

/** Parse COGS cell: "22.97 % = Rp. 76.839.056" */
export function parseCOGS(raw: unknown): COGSData | null {
  if (!raw) return null
  const s = String(raw)
  const pctMatch = s.match(/([\d.,]+)\s*%/)
  const rpMatch = s.match(/Rp\.?\s*([\d.]+)/)
  if (!pctMatch && !rpMatch) return null
  const pct = pctMatch ? parseFloat(pctMatch[1].replace(',', '.')) : 0
  const amount = rpMatch ? parseFloat(rpMatch[1].replace(/\./g, '')) : 0
  return { pct: isNaN(pct) ? 0 : pct, amount: isNaN(amount) ? 0 : amount }
}

/** Extract a string item name from a cell value. */
function parseItemName(raw: unknown): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  return s.length > 0 ? s : null
}

// ============================================================
// ROW/COLUMN HELPERS
// ============================================================

type SheetRows = unknown[][]

function cell(rows: SheetRows, rowIdx: number, colIdx: number): unknown {
  return rows[rowIdx]?.[colIdx] ?? null
}

// ============================================================
// TAB FINDERS
// ============================================================

/**
 * Monthly: tabs are year labels like "2026".
 * Returns the tab name for the current year.
 */
export function findMonthlyTabName(sheetNames: string[], today: Date): string | null {
  const year = String(today.getFullYear())
  // Exact match
  if (sheetNames.includes(year)) return year
  // Prefix/contains match
  for (const n of sheetNames) {
    if (n.includes(year)) return n
  }
  // Fallback: last sheet
  return sheetNames[sheetNames.length - 1] ?? null
}

/**
 * Monthly: within the tab, find the column whose row[2] matches current month label.
 * Scans up to 50 columns starting from col 1.
 */
export function findMonthlyColumn(rows: SheetRows, today: Date): number {
  const targetLabel = ID_MONTH_LABELS[today.getMonth()]
  const dateRow = rows[2] ?? []
  for (let c = 1; c < Math.min(dateRow.length, 50); c++) {
    const v = String(dateRow[c] ?? '').toUpperCase().trim()
    if (v.includes(targetLabel) || v.includes(targetLabel.substring(0, 3))) return c
  }
  // Fallback: find by month index (each month occupies ~1 column)
  return today.getMonth() + 1
}

/**
 * Weekly: tabs are month labels like "MEI 26", "APR 26".
 * Returns the tab name matching the current month.
 */
export function findWeeklyTabName(sheetNames: string[], today: Date): string | null {
  const targetMonth = today.getMonth()
  for (const name of sheetNames) {
    const u = name.toUpperCase().trim()
    const parts = u.split(/\s+/)
    const short = parts[0]
    if (short in ID_MONTH_SHORT && ID_MONTH_SHORT[short] === targetMonth) return name
    // Also try the full month label
    if (ID_MONTH_LABELS[targetMonth] && u.startsWith(ID_MONTH_LABELS[targetMonth])) return name
  }
  // Fallback: first sheet
  return sheetNames[0] ?? null
}

/**
 * Weekly: within the tab, find the column whose row[3] date range contains today.
 * Date ranges look like "1 - 7 MEI 2026" or "8-14 MEI".
 */
export function findWeeklyColumn(rows: SheetRows, today: Date): number {
  const targetDay = today.getDate()
  const dateRow = rows[3] ?? []
  for (let c = 1; c < Math.min(dateRow.length, 20); c++) {
    const v = String(dateRow[c] ?? '').trim()
    const nums = [...v.matchAll(/(\d+)/g)].map(m => parseInt(m[1]))
    if (nums.length >= 2) {
      const [start, end] = [nums[0], nums[1]]
      if (targetDay >= start && targetDay <= end) return c
    }
  }
  // Fallback: estimate column by week number
  const weekOfMonth = Math.ceil(targetDay / 7)
  return weekOfMonth
}

/**
 * Daily: tabs are week ranges like "11 - 17 AGUSTUS".
 * Returns the tab whose range contains today.
 */
export function findDailyTabName(sheetNames: string[], today: Date): string | null {
  const targetDay = today.getDate()
  const targetMonth = today.getMonth()
  for (const name of sheetNames) {
    const u = name.toUpperCase()
    // Check month
    let monthMatch = false
    for (const [key, val] of Object.entries(ID_MONTH_SHORT)) {
      if (u.includes(key) && val === targetMonth) { monthMatch = true; break }
    }
    if (!monthMatch && !u.includes(ID_MONTH_LABELS[targetMonth])) continue
    // Check day range
    const nums = [...u.matchAll(/(\d+)/g)].map(m => parseInt(m[1]))
    if (nums.length >= 2) {
      const [start, end] = [nums[0], nums[1]]
      if (targetDay >= start && targetDay <= end) return name
    }
  }
  return sheetNames[sheetNames.length - 1] ?? null
}

/**
 * Daily: within the tab, find the column whose row[3] matches today's date.
 */
export function findDailyColumn(rows: SheetRows, today: Date): number {
  const targetDay = today.getDate()
  const dateRow = rows[3] ?? []
  for (let c = 1; c < Math.min(dateRow.length, 20); c++) {
    const v = dateRow[c]
    if (v === null || v === undefined) continue
    // Could be a date serial, a number, or a string
    const n = Number(v)
    if (!isNaN(n) && n === targetDay) return c
    const s = String(v).trim()
    const dayMatch = s.match(/^(\d{1,2})/)
    if (dayMatch && parseInt(dayMatch[1]) === targetDay) return c
  }
  // Fallback: day of week (Mon=1)
  const dow = today.getDay() || 7 // 1–7
  return dow
}

// ============================================================
// DATA EXTRACTORS
// ============================================================

/**
 * Extract monthly performance metrics from the resolved column.
 * Row indices are 0-based from the start of the sheet values array.
 *
 * Monthly row map (from CLAUDE.md):
 *   4  → Net Sales Target
 *   5  → Net Sales Actual
 *   6  → Achievement %
 *   20 → AT Target
 *   21 → AT Actual
 *   59 → Top Beverage
 *   65 → Bottom Beverage
 *   71 → Top Main Course
 *   77 → Bottom Main Course
 *   84 → Top Cake
 *   90 → Bottom Cake
 *   96 → Top Waste Bar
 *  102 → Top Waste Kitchen
 *  108 → Top Waste Floor
 *  114 → COGS Bar
 *  115 → COGS Kitchen
 *  116 → COGS Floor
 *  117 → COGS Merch & Cake
 *  135 → Top Merchandise
 */
export function parseMonthlyData(
  rows: SheetRows,
  colIdx: number,
  outletId: string,
  outletName: string,
  today: Date
): OutletPerformanceData {
  const c = colIdx
  return {
    outletId,
    outletName,
    reportType: 'monthly',
    period: `${ID_MONTH_LABELS[today.getMonth()]} ${today.getFullYear()}`,
    netSalesTarget:    parseRupiah(cell(rows, 4,   c)),
    netSalesActual:    parseRupiah(cell(rows, 5,   c)),
    achievementPct:    parseNum(cell(rows, 6,   c)),
    atTarget:          parseRupiah(cell(rows, 20,  c)),
    atActual:          parseRupiah(cell(rows, 21,  c)),
    topBeverage:       parseItemName(cell(rows, 59,  c)),
    bottomBeverage:    parseItemName(cell(rows, 65,  c)),
    topMainCourse:     parseItemName(cell(rows, 71,  c)),
    bottomMainCourse:  parseItemName(cell(rows, 77,  c)),
    topCake:           parseItemName(cell(rows, 84,  c)),
    bottomCake:        parseItemName(cell(rows, 90,  c)),
    topWasteBar:       parseItemName(cell(rows, 96,  c)),
    topWasteKitchen:   parseItemName(cell(rows, 102, c)),
    topWasteFloor:     parseItemName(cell(rows, 108, c)),
    topWaste:          null,
    cogsBar:           parseCOGS(cell(rows, 114, c)),
    cogsKitchen:       parseCOGS(cell(rows, 115, c)),
    cogsFloor:         parseCOGS(cell(rows, 116, c)),
    cogsMerch:         parseCOGS(cell(rows, 117, c)),
    topMerchandise:    parseItemName(cell(rows, 135, c)),
    fetchedAt: new Date().toISOString(),
  }
}

/**
 * Extract weekly performance metrics.
 *
 * Weekly row map (from CLAUDE.md):
 *   5  → Net Sales Target
 *   6  → Net Sales Quinos (actual)
 *   7  → Net Sales Point (actual)
 *   8  → Total Net Sales Actual
 *   9  → Achievement %
 *  26  → AT Target
 *  27  → AT Actual
 *  52  → Top Beverage
 *  58  → Bottom Beverage
 *  64  → Top Cake
 *  70  → Bottom Cake
 *  76  → Top Waste
 *
 * NOTE: SMS weekly has no Main Course section.
 */
export function parseWeeklyData(
  rows: SheetRows,
  colIdx: number,
  outletId: string,
  outletName: string,
  today: Date
): OutletPerformanceData {
  const c = colIdx
  // Determine period label from row[3]
  const periodRaw = cell(rows, 3, c)
  const period = periodRaw ? String(periodRaw).trim() : `Minggu ${Math.ceil(today.getDate() / 7)} — ${ID_MONTH_LABELS[today.getMonth()]} ${today.getFullYear()}`

  return {
    outletId,
    outletName,
    reportType: 'weekly',
    period,
    netSalesTarget:    parseRupiah(cell(rows, 5,  c)),
    netSalesActual:    parseRupiah(cell(rows, 8,  c)),   // total actual
    achievementPct:    parseNum(cell(rows, 9,  c)),
    atTarget:          parseRupiah(cell(rows, 26, c)),
    atActual:          parseRupiah(cell(rows, 27, c)),
    topBeverage:       parseItemName(cell(rows, 52, c)),
    bottomBeverage:    parseItemName(cell(rows, 58, c)),
    topMainCourse:     null,   // not in weekly
    bottomMainCourse:  null,
    topCake:           parseItemName(cell(rows, 64, c)),
    bottomCake:        parseItemName(cell(rows, 70, c)),
    topWasteBar:       null,
    topWasteKitchen:   null,
    topWasteFloor:     null,
    topWaste:          parseItemName(cell(rows, 76, c)),
    cogsBar:           null,
    cogsKitchen:       null,
    cogsFloor:         null,
    cogsMerch:         null,
    topMerchandise:    null,
    fetchedAt: new Date().toISOString(),
  }
}

/**
 * Extract daily performance metrics.
 *
 * Daily row map (from CLAUDE.md):
 *   5  → Net Sales Target
 *   6  → Net Sales Actual
 *   7  → Achievement %
 *  17  → AT Target
 *  18  → AT Actual
 */
export function parseDailyData(
  rows: SheetRows,
  colIdx: number,
  outletId: string,
  outletName: string,
  today: Date
): OutletPerformanceData {
  const c = colIdx
  const periodRaw = cell(rows, 3, c)
  const d = today
  const period = periodRaw ? String(periodRaw).trim()
    : `${d.getDate()} ${ID_MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`

  return {
    outletId,
    outletName,
    reportType: 'daily',
    period,
    netSalesTarget:    parseRupiah(cell(rows, 5,  c)),
    netSalesActual:    parseRupiah(cell(rows, 6,  c)),
    achievementPct:    parseNum(cell(rows, 7,  c)),
    atTarget:          parseRupiah(cell(rows, 17, c)),
    atActual:          parseRupiah(cell(rows, 18, c)),
    topBeverage: null, bottomBeverage: null,
    topMainCourse: null, bottomMainCourse: null,
    topCake: null, bottomCake: null,
    topWasteBar: null, topWasteKitchen: null, topWasteFloor: null, topWaste: null,
    cogsBar: null, cogsKitchen: null, cogsFloor: null, cogsMerch: null,
    topMerchandise: null,
    fetchedAt: new Date().toISOString(),
  }
}
