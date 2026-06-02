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
// IDs sourced from store-mappings.json (ops-mgr-dashboard/backend/config/).
// Each outlet has 3 separate Sheets files (monthly / weekly / daily).
// SUMMITMAS maps to what CLAUDE.md calls "panen" — verify with Niko if needed.
// ============================================================

export const PERFORMANCE_OUTLETS: Record<string, {
  outletName: string
  monthly: string
  weekly: string
  daily: string
}> = {
  'la-piazza': {
    outletName: 'La Piazza',
    monthly: '1ly7LV1d1K2F46TmH03XMzX7PgS48Kf88jm1G27lLQY4',
    weekly:  '11ZLrkIlXPpre1C-2k0qXacw2MRiVnbWWpNTSUL2hl-0',
    daily:   '13C86lmlfwmvsWvgIAAHVPzrp0a4BcTnI79hzXtMQgWA',
  },
  'bsd': {
    outletName: 'BSD',
    monthly: '19A11CSWN1PCU15fiLeJtMJ8BxNDyZwLi2D1sPqsAbmw',
    weekly:  '1om_NQuon2NKXk6XcmIKJtPecZN3VdtVa7qYwa7N0R9A',
    daily:   '1Z4MltvorOw7glrVX4_bhdPb9A4915FQQ41Q6gxoSCJA',
  },
  'mkg': {
    outletName: 'MKG',
    monthly: '1YQaE4le8ZGaQM5To6FN7EYg4npzot9g1q9dcCghkJ6g',
    weekly:  '1TFqod7abJ-29X8MzXbjQvFQN57S1Hf4vHyxQRPK3CQY',
    daily:   '141bNlF56RyoX3fZxbizTRHLfVoWgUZIVgsnngDQ1MQk',
  },
  'sms': {
    outletName: 'SMS',
    monthly: '1Gwf0wTLPVneA4iWc9KuFkvTPlRoTzJ97w2SV2wqjUh0',
    weekly:  '1yrKWsR4IqdIO_EiDV-ApWe2AxPkhmTzTdJx7cy4sRHI',
    daily:   '1QgSpglMvHHTemo_oQdoRfXiaICc_4NRSQ_y6D1UV0UM',
  },
  'smb': {
    outletName: 'SMB',
    monthly: '1IW2L52NKxn25EWSonwFu0bx2Y0Y3cC0biEjY4qnbKMo',
    weekly:  '1jSN_C3pwBslz645f_tzUWrAq_f6uzAAjXSaU9Bmm1m0',
    daily:   '1zd719n-ycABb3dIqQbiEuBHuG_0ucd1IZLJM21ereSw',
  },
  'smb-gl': {
    outletName: 'SMB Gold Lounge',
    monthly: '1-x8GuMbxbSOtyiOpJJBmfaAs3K-lA7m0h4KkKvsRHhM',
    weekly:  '134Gt6cScX5RItSNoXLkcTA3wEunVmy0OZGKDrXWgh70',
    daily:   '11zN87Vr2KAwpZb_gBwE2GNx64JBW1sDczb7D-Alzvqo',
  },
  'summitmas': {
    outletName: 'Summitmas',
    monthly: '1VWGHUO1LzZBbeQPru4QiPRblU9yp5kIAkJtKTDMJVNE',
    weekly:  '13v0dOq55TsvK1e_PT2j5f0ONNCbRODQJsl7Uw5pEgm0',
    daily:   '1qoPX4tgmsKtrXLkHorsKUDTEuo24PFcCfIyPTmQWRpQ',
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

/**
 * Parse Rupiah string — handles both formats used in the sheets:
 *   "Rp700,000,000"  (comma thousand-separator, API FORMATTED_VALUE)
 *   "Rp. 76.839.056" (dot thousand-separator, typed string in COGS cells)
 *   76839056         (plain number)
 */
export function parseRupiah(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'number') return isNaN(raw) ? null : raw
  // Strip "Rp" prefix (with optional dot and space), then strip all separators
  const s = String(raw)
    .replace(/^Rp\.?\s*/i, '')
    .replace(/[.,\s]/g, '')   // remove ALL dots, commas, spaces (all are thousand-separators for IDR)
    .trim()
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

/** Parse number from cell (handles numeric or string). */
function parseNum(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const n = parseFloat(String(raw).replace(',', '.'))
  return isNaN(n) ? null : n
}

/**
 * Parse a percentage cell — handles both:
 *   - Formatted string: "83.4%" → 83.4
 *   - Raw decimal (Google Sheets native format): 0.834 → 83.4
 */
function parsePct(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const s = String(raw).trim()
  const n = parseFloat(s.replace(',', '.'))
  if (isNaN(n)) return null
  // Values stored as Google Sheets decimals (0 < n <= 1) → multiply by 100
  if (n > 0 && n <= 1 && !s.includes('%')) return Math.round(n * 10000) / 100
  return n
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
 * Monthly: find the data column for the current month.
 * Row[4] has month labels ("januari 2026", "Februari 2026"...) starting at col D (index 3).
 *
 * Smart fallback: if the target month has no actual data yet (staff haven't entered
 * this month's figures), returns the last column that DOES have data.
 */
export function findMonthlyColumn(rows: SheetRows, today: Date): number {
  const targetLabel = ID_MONTH_LABELS[today.getMonth()]
  const dateRow = rows[4] ?? []

  let targetCol = -1
  let lastDataCol = 3   // row[7] = Net Sales Actual — if empty, month not yet filled

  for (let c = 3; c < 20; c++) {
    const header = String(dateRow[c] ?? '').toUpperCase().trim()
    if (rows[7]?.[c] != null && rows[7][c] !== '') lastDataCol = c
    if (targetCol < 0 && (header.includes(targetLabel) || header.includes(targetLabel.substring(0, 3)))) {
      targetCol = c
    }
  }

  if (targetCol >= 0) {
    const hasData = rows[7]?.[targetCol] != null && rows[7][targetCol] !== ''
    return hasData ? targetCol : lastDataCol
  }

  const expectedCol = 3 + today.getMonth()
  const hasData = rows[7]?.[expectedCol] != null && rows[7][expectedCol] !== ''
  return hasData ? expectedCol : lastDataCol
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
 * Weekly: find the column whose row[5] date range contains today.
 * Row[4] = "WEEK 1", "WEEK 2"... Row[5] = "27 Apr - 3 May 26", "04 - 10 May 26"...
 * Data columns start at D (index 3).
 */
export function findWeeklyColumn(rows: SheetRows, today: Date): number {
  const targetDay = today.getDate()
  const targetMonth = today.getMonth()
  // Row 5 has actual date ranges; scan from col D (index 3)
  const dateRow = rows[5] ?? []
  let lastValidCol = 3
  for (let c = 3; c < Math.min(dateRow.length, 12); c++) {
    const v = String(dateRow[c] ?? '').trim()
    if (!v) continue
    lastValidCol = c
    // Extract all numbers ≤ 31 (day numbers, ignore year digits > 31)
    const nums = [...v.matchAll(/(\d+)/g)]
      .map(m => parseInt(m[1]))
      .filter(n => n >= 1 && n <= 31)
    if (nums.length < 2) continue
    const [startDay, endDay] = [nums[0], nums[1]]
    const u = v.toUpperCase()
    // Check if current month is mentioned (or absent, meaning intra-month)
    const currentMonthMentioned = ID_MONTH_LABELS[targetMonth] && u.includes(ID_MONTH_LABELS[targetMonth]) ||
      Object.entries(ID_MONTH_SHORT).some(([k, mv]) => mv === targetMonth && u.includes(k))
    const prevMonth = (targetMonth - 1 + 12) % 12
    const prevMonthMentioned = ID_MONTH_LABELS[prevMonth] && u.includes(ID_MONTH_LABELS[prevMonth]) ||
      Object.entries(ID_MONTH_SHORT).some(([k, mv]) => mv === prevMonth && u.includes(k))
    if (startDay <= endDay) {
      // Same-month range — only return if the week has actual non-zero sales (not yet-to-fill)
      const weekHasData = (ri: number) => {
        for (let r = 8; r <= 13; r++) {
          const v = rows[r]?.[ri]
          if (v != null && v !== '' && v !== 'Rp0' && (parseRupiah(v as unknown) ?? 0) > 1000) return true
        }
        return false
      }
      if (currentMonthMentioned && targetDay >= startDay && targetDay <= endDay && weekHasData(c)) return c
      if (!currentMonthMentioned && !prevMonthMentioned && targetDay >= startDay && targetDay <= endDay && weekHasData(c)) return c
    } else {
      // Cross-month range (e.g. "27 Apr - 3 May", "30 Mar - 5 Apr")
      // Identify start/end months by their position in the string — don't rely on prevMonth assumption
      const occ: { pos: number; m: number }[] = []
      for (let m = 0; m < 12; m++) {
        for (const name of [ID_MONTH_LABELS[m], Object.keys(ID_MONTH_SHORT).find(k => ID_MONTH_SHORT[k] === m) ?? '']) {
          if (!name) continue
          const pos = u.indexOf(name)
          if (pos >= 0 && !occ.some(o => Math.abs(o.pos - pos) < 3)) occ.push({ pos, m })
        }
      }
      occ.sort((a, b) => a.pos - b.pos)
      const rangeStartM = occ[0]?.m ?? -1
      const rangeEndM   = occ[1]?.m ?? -1
      const tm = targetMonth
      if (rangeEndM >= 0 && tm === rangeEndM && targetDay <= endDay) return c
      if (rangeStartM >= 0 && tm === rangeStartM && targetDay >= startDay) return c
    }
  }
  return lastValidCol // Fallback: most recent week with data
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
 * Daily: find the column whose row[5] date matches today.
 * Row[4] = "MONDAY", "TUESDAY"... Row[5] = "14 Juli 2025", "31 Mei 2026"...
 * Data columns start at D (index 3).
 */
export function findDailyColumn(rows: SheetRows, today: Date): number {
  const targetDay = today.getDate()
  // Row 5 has individual date labels; scan from col D (index 3)
  const dateRow = rows[5] ?? []
  for (let c = 3; c < Math.min(dateRow.length, 12); c++) {
    const v = dateRow[c]
    if (v === null || v === undefined || v === '') continue
    const n = Number(v)
    if (!isNaN(n) && n === targetDay) return c
    const s = String(v).trim()
    const dayMatch = s.match(/^(\d{1,2})/)
    if (dayMatch && parseInt(dayMatch[1]) === targetDay) return c
  }
  // Fallback: day of week (Mon=col3, Tue=col4, ..., Sun=col9)
  const dow = today.getDay() // 0=Sun
  return dow === 0 ? 9 : 2 + dow
}

// ============================================================
// LABEL SCANNER — robustness fallback for top/bottom items
// ============================================================

/** Find the row index where col B contains any of the given label fragments. */
function findLabelRow(rows: SheetRows, ...fragments: string[]): number {
  for (let r = 0; r < rows.length; r++) {
    const b = String(rows[r]?.[1] ?? '').trim().toUpperCase()
    for (const frag of fragments) {
      if (b.includes(frag.toUpperCase())) return r
    }
  }
  return -1
}

/**
 * Get cell value — tries a fixed row index first, falls back to label scan.
 * Col B = index 1 (labels). Data = colIdx (month/week/day column).
 */
function cellOrLabel(
  rows: SheetRows,
  primaryRow: number,
  colIdx: number,
  ...labelFragments: string[]
): unknown {
  const v = rows[primaryRow]?.[colIdx] ?? null
  if (v !== null && v !== '') return v
  const r = findLabelRow(rows, ...labelFragments)
  return r >= 0 ? (rows[r]?.[colIdx] ?? null) : null
}

/**
 * Get the item name from the first row below a section header.
 * Section header is found by label, item at header+1.
 */
function firstItemBelow(rows: SheetRows, sectionLabel: string, colIdx: number): string | null {
  const r = findLabelRow(rows, sectionLabel)
  if (r < 0) return null
  return parseItemName(rows[r + 1]?.[colIdx] ?? null)
}

// ============================================================
// DATA EXTRACTORS
// ============================================================

/**
 * Extract monthly performance metrics.
 *
 * Actual row map (0-based, verified against live La Piazza sheet 2026-05-31):
 *   6  → Net Sales (Target)
 *   7  → Net Sales (Actual)
 *   8  → Net Sales Achievement (%)
 *   22 → AT (Target)
 *   23 → AT (Actual)
 *   60 → TOP 1 Beverage   (row 59 = "TOP 5 BEVERAGE" section header)
 *   66 → BOTTOM 1 Beverage (row 65 = section header)
 *   72 → TOP 1 Main Course (row 71 = section header)
 *   78 → BOTTOM 1 Main Course
 *   84 → TOP 1 Cake        (row 83 = section header)
 *   90 → BOTTOM 1 Cake
 *   96 → TOP 1 Waste Bar   (row 95 = section header)
 *  102 → TOP 1 Waste Kitchen
 *  108 → TOP 1 Waste Floor
 *  114 → % COGS BAR
 *  115 → % COGS KITCHEN
 *  116 → % COGS FLOOR
 *  117 → % COGS MERCHANDISE & CAKE
 *  135 → TOP 1 Merchandise (row 134 = section header)
 *
 * Label-scan fallbacks used for top/bottom items in case outlet templates differ.
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
    // Derive period label from the actual column header (not today's month)
    // so it reads "APRIL 2026" even when fetched in May if May isn't filled yet.
    period: (() => {
      const hdr = String(rows[4]?.[c] ?? '').trim()
      return hdr || `${ID_MONTH_LABELS[today.getMonth()]} ${today.getFullYear()}`
    })(),
    netSalesTarget:    parseRupiah(cellOrLabel(rows, 6,  c, 'Net Sales (Target)', 'Net Sales Target')),
    netSalesActual:    parseRupiah(cellOrLabel(rows, 7,  c, 'Net Sales (Actual)', 'Net Sales Actual')),
    achievementPct:    parsePct(cellOrLabel(rows, 8,  c, 'Net Sales Achievement', 'Achievement (%)')),
    atTarget:          parseRupiah(cellOrLabel(rows, 22, c, 'AT (Target)')),
    atActual:          parseRupiah(cellOrLabel(rows, 23, c, 'AT (Actual)')),
    topBeverage:       firstItemBelow(rows, 'TOP 5 BEVERAGE', c),
    bottomBeverage:    firstItemBelow(rows, 'BOTTOM 5 BEVERAGE', c),
    topMainCourse:     firstItemBelow(rows, 'TOP 5 MAIN COURSE', c),
    bottomMainCourse:  firstItemBelow(rows, 'BOTTOM 5 MAIN COURSE', c),
    topCake:           firstItemBelow(rows, 'TOP 5 CAKE', c),
    bottomCake:        firstItemBelow(rows, 'BOTTOM 5 CAKE', c),
    topWasteBar:       firstItemBelow(rows, 'TOP 5 WASTE BAR', c),
    topWasteKitchen:   firstItemBelow(rows, 'TOP 5 WASTE KITCHEN', c),
    topWasteFloor:     firstItemBelow(rows, 'TOP 5 WASTE FLOOR', c),
    topWaste:          null,
    cogsBar:           parseCOGS(cellOrLabel(rows, 114, c, '% COGS BAR', 'COGS BAR')),
    cogsKitchen:       parseCOGS(cellOrLabel(rows, 115, c, '% COGS KITCHEN', 'COGS KITCHEN')),
    cogsFloor:         parseCOGS(cellOrLabel(rows, 116, c, '% COGS FLOOR', 'COGS FLOOR')),
    cogsMerch:         parseCOGS(cellOrLabel(rows, 117, c, '% COGS MERCHANDISE', 'COGS MERCH')),
    topMerchandise:    firstItemBelow(rows, 'TOP MERCHANDISE SELLER', c),
    fetchedAt: new Date().toISOString(),
  }
}

/**
 * Extract weekly performance metrics.
 *
 * Actual row map (0-based, verified against live La Piazza weekly 2026-05-31):
 *   7  → Net Sales (Target)
 *   8  → Net Sales (Actual)
 *   9  → Net Sales Achievement (%)
 *  20  → AT (Target)
 *  21  → AT (Actual)
 *  55  → TOP 1 Beverage   (row 54 = "TOP 5 BEVERAGE" header)
 *  61  → BOTTOM 1 Beverage
 *  67  → TOP 1 Main Course (row 66 = section header)
 *  73  → BOTTOM 1 Main Course
 *  79  → TOP 1 Cake        (row 78 = section header)
 *  85  → BOTTOM 1 Cake
 *
 * Label-scan used as primary for top/bottom items (more robust across outlets).
 * Period label read from row[5] (date ranges row).
 */
export function parseWeeklyData(
  rows: SheetRows,
  colIdx: number,
  outletId: string,
  outletName: string,
  today: Date
): OutletPerformanceData {
  const c = colIdx
  const periodRaw = rows[5]?.[c]
  const period = periodRaw
    ? String(periodRaw).trim()
    : `Minggu ${Math.ceil(today.getDate() / 7)} — ${ID_MONTH_LABELS[today.getMonth()]} ${today.getFullYear()}`

  return {
    outletId,
    outletName,
    reportType: 'weekly',
    period,
    netSalesTarget:    parseRupiah(cellOrLabel(rows, 7,  c, 'Net Sales (Target)', 'Net Sales Target')),
    netSalesActual:    parseRupiah(cellOrLabel(rows, 8,  c, 'Net Sales (Actual)', 'Net Sales Actual')),
    achievementPct:    parsePct(cellOrLabel(rows, 9,  c, 'Net Sales Achievement', 'Achievement (%)')),
    atTarget:          parseRupiah(cellOrLabel(rows, 20, c, 'AT (Target)')),
    atActual:          parseRupiah(cellOrLabel(rows, 21, c, 'AT (Actual)')),
    topBeverage:       firstItemBelow(rows, 'TOP 5 BEVERAGE', c),
    bottomBeverage:    firstItemBelow(rows, 'BOTTOM 5 BEVERAGE', c),
    topMainCourse:     firstItemBelow(rows, 'TOP 5 MAIN COURSE', c),
    bottomMainCourse:  firstItemBelow(rows, 'BOTTOM 5 MAIN COURSE', c),
    topCake:           firstItemBelow(rows, 'TOP 5 CAKE', c),
    bottomCake:        firstItemBelow(rows, 'BOTTOM 5 CAKE', c),
    topWasteBar:       null,
    topWasteKitchen:   null,
    topWasteFloor:     null,
    topWaste:          firstItemBelow(rows, 'TOP 5 WASTE', c),
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
 * Actual row map (0-based, verified against live La Piazza daily 2026-05-31):
 *   7  → Net Sales (Target)
 *   8  → Net Sales (Actual)
 *   9  → Net Sales Achievement (%)
 *  19  → AT (Target)
 *  20  → AT (Actual)
 *
 * Period label read from row[5] (individual date labels row).
 */
export function parseDailyData(
  rows: SheetRows,
  colIdx: number,
  outletId: string,
  outletName: string,
  today: Date
): OutletPerformanceData {
  const c = colIdx
  const periodRaw = rows[5]?.[c]
  const d = today
  const period = periodRaw
    ? String(periodRaw).trim()
    : `${d.getDate()} ${ID_MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`

  return {
    outletId,
    outletName,
    reportType: 'daily',
    period,
    netSalesTarget:    parseRupiah(cellOrLabel(rows, 7,  c, 'Net Sales (Target)', 'Net Sales Target')),
    netSalesActual:    parseRupiah(cellOrLabel(rows, 8,  c, 'Net Sales (Actual)', 'Net Sales Actual')),
    achievementPct:    parsePct(cellOrLabel(rows, 9,  c, 'Net Sales Achievement', 'Achievement (%)')),
    atTarget:          parseRupiah(cellOrLabel(rows, 19, c, 'AT (Target)')),
    atActual:          parseRupiah(cellOrLabel(rows, 20, c, 'AT (Actual)')),
    topBeverage: null, bottomBeverage: null,
    topMainCourse: null, bottomMainCourse: null,
    topCake: null, bottomCake: null,
    topWasteBar: null, topWasteKitchen: null, topWasteFloor: null, topWaste: null,
    cogsBar: null, cogsKitchen: null, cogsFloor: null, cogsMerch: null,
    topMerchandise: null,
    fetchedAt: new Date().toISOString(),
  }
}
