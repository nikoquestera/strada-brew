import * as XLSX from 'xlsx'

// ============================================================
// TYPES
// ============================================================

export type DivisionType = 'PIC' | 'BAR' | 'FLOOR' | 'KITCHEN' | 'HK' | 'UNKNOWN'
export type ShiftType = 'pagi' | 'siang' | 'sore' | 'off' | 'leave' | 'backup' | ''

export interface StaffSchedule {
  name: string
  division: DivisionType
  shift: string
  shiftType: ShiftType
  shiftColor: string
}

export interface OutletDaySchedule {
  outletId: string
  outletName: string
  date: string
  staff: StaffSchedule[]
  error?: string
}

export type OutletFormat = 'bsd' | 'la-piazza' | 'mkg' | 'smb' | 'smb-gl'

export interface OutletScheduleFile {
  fileId: string
  outletName: string
  format: OutletFormat
}

// ============================================================
// OUTLET FILE IDs — replace with real Google Drive file IDs
// ============================================================

export const OUTLET_SCHEDULE_FILES: Record<string, OutletScheduleFile> = {
  'bsd': {
    fileId: '1OZDFvTl6FQNN75R56yggD8PJaRVApRb2f8ClVZZ1TAw',
    outletName: 'BSD',
    format: 'bsd',
  },
  'la-piazza': {
    fileId: '1DtonAOtzkaPFWV-cCr-giQjJ9ZrqosZN4_X0nr-Hr-k',
    outletName: 'La Piazza',
    format: 'la-piazza',
  },
  'mkg': {
    fileId: '1lR2juRWd-0YoKhSDSksLAftm767nrACWdNc0HE70oY0',
    outletName: 'MKG',
    format: 'mkg',
  },
  'smb': {
    fileId: '1AvQ6fF4wt839ejmHv1qJsdXCzWc4Q30GrA8C8vCiEnc',
    outletName: 'SMB',
    format: 'smb',
  },
  'smb-gl': {
    fileId: '1Qvy7xgNP-dz_5o8Y9XfuRlIgiy-BDVgf5jkKvVnL0n0',
    outletName: 'SMB Gold Lounge',
    format: 'smb-gl',
  },
}

// ============================================================
// INDONESIAN MONTH MAPPING
// ============================================================

const ID_MONTHS: Record<string, number> = {
  JANUARI: 0, JAN: 0,
  FEBRUARI: 1, FEB: 1,
  MARET: 2, MAR: 2,
  APRIL: 3, APR: 3,
  MEI: 4, MAY: 4,
  JUNI: 5, JUN: 5,
  JUNI2: 5,
  JULI: 6, JUL: 6,
  AGUSTUS: 7, AGU: 7, AUG: 7,
  SEPTEMBER: 8, SEP: 8,
  OKTOBER: 9, OKT: 9, OCT: 9,
  NOVEMBER: 10, NOV: 10,
  DESEMBER: 11, DES: 11, DEC: 11,
}

function monthFromString(s: string): number | null {
  const u = s.toUpperCase().trim()
  if (u in ID_MONTHS) return ID_MONTHS[u]
  // Try prefix match for partial names
  for (const [key, val] of Object.entries(ID_MONTHS)) {
    if (u.startsWith(key) || key.startsWith(u)) return val
  }
  return null
}

// ============================================================
// SHIFT NORMALISATION
// ============================================================

function classifyShift(h: number): ShiftType {
  if (h < 8) return 'pagi'
  if (h < 12) return 'siang'
  return 'sore'
}

function shiftColor(t: ShiftType): string {
  if (t === 'pagi') return '#DE9733'
  if (t === 'siang') return '#037894'
  if (t === 'sore') return '#FF4F31'
  return '#8A8A8D'
}

export function normalizeShift(raw: unknown): Pick<StaffSchedule, 'shift' | 'shiftType' | 'shiftColor'> {
  if (raw === null || raw === undefined || raw === '') {
    return { shift: '', shiftType: '', shiftColor: '' }
  }

  const val = String(raw).trim()
  const upper = val.toUpperCase()

  // Backup store codes (with optional " // STORE" suffix)
  const backupMatch = val.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*\/\/\s*\w+$/i)
  if (backupMatch) {
    const [h] = backupMatch[1].split(':').map(Number)
    const t = classifyShift(h)
    return { shift: backupMatch[1].slice(0, 5), shiftType: 'backup', shiftColor: '#8A8A8D' }
  }
  if (['SMS', 'LPZ', 'MKG', 'ACA', 'BSD', 'SMB', 'PANEN', 'GL'].includes(upper)) {
    return { shift: upper, shiftType: 'backup', shiftColor: '#8A8A8D' }
  }

  // Off / leave
  if (['OFF', 'OFFDAY', 'LIBUR'].includes(upper)) {
    return { shift: 'OFF', shiftType: 'off', shiftColor: '#8A8A8D' }
  }
  if (['CUTI', 'PH', 'SAKIT', 'IZIN'].includes(upper)) {
    return { shift: upper, shiftType: 'leave', shiftColor: '#4C4845' }
  }

  // Numeric decimal (Excel time fraction or float like 6.0, 14.0)
  const num = parseFloat(val)
  if (!isNaN(num) && num >= 0 && num <= 24) {
    const h = Math.floor(num)
    const m = Math.round((num - h) * 60)
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const t = classifyShift(h)
    return { shift: timeStr, shiftType: t, shiftColor: shiftColor(t) }
  }

  // Time string "06:00:00" or "06:00"
  const timeMatch = val.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (timeMatch) {
    const h = parseInt(timeMatch[1])
    const timeStr = `${String(h).padStart(2, '0')}:${timeMatch[2]}`
    const t = classifyShift(h)
    return { shift: timeStr, shiftType: t, shiftColor: shiftColor(t) }
  }

  return { shift: val, shiftType: '', shiftColor: '#8A8A8D' }
}

// ============================================================
// DIVISION MAPPING
// ============================================================

const ROLE_ALIASES: Record<string, DivisionType> = {
  PIC: 'PIC', HEAD: 'PIC', KOORDINATOR: 'PIC', 'CO.': 'PIC', CO: 'PIC', 'HEAD BAR': 'PIC',
  BARISTA: 'BAR', 'JR BARISTA': 'BAR', 'JR. BARISTA': 'BAR', CASHIER: 'BAR', BAR: 'BAR', KASIR: 'BAR',
  SERVER: 'FLOOR', FLOOR: 'FLOOR', HF: 'FLOOR', HEADFLOOR: 'FLOOR', 'HEAD FLOOR': 'FLOOR',
  COOK: 'KITCHEN', 'HEAD KITCHEN': 'KITCHEN', 'COOK HELPER': 'KITCHEN',
  STEWARD: 'KITCHEN', KITCHEN: 'KITCHEN',
  HK: 'HK', HOUSEKEEPING: 'HK',
}

function mapDivision(label: string): DivisionType {
  const u = label.toUpperCase().trim()
  if (u in ROLE_ALIASES) return ROLE_ALIASES[u]
  // Prefix match
  for (const [key, val] of Object.entries(ROLE_ALIASES)) {
    if (u.startsWith(key + ' ') || u.startsWith(key + '\t')) return val
  }
  return 'UNKNOWN'
}

function isRoleLabel(val: unknown): boolean {
  if (!val) return false
  const u = String(val).toUpperCase().trim()
  return u in ROLE_ALIASES || Object.keys(ROLE_ALIASES).some(k => u.startsWith(k + ' '))
}

function cleanName(val: unknown): string {
  if (!val) return ''
  // Strip "// 08:00" or "// SMS" suffixes
  return String(val).replace(/\/\/.*$/, '').trim()
}

// ============================================================
// SHEET TAB SELECTION
// ============================================================

function parseMonthYear(name: string): { month: number; year: number } | null {
  const u = name.toUpperCase().trim()

  // "MEI 26", "APR 26", "MAY 26", "APRIL 26"
  const parts = u.split(/[\s_-]+/)
  if (parts.length >= 2) {
    const month = monthFromString(parts[0])
    const yearRaw = parseInt(parts[1])
    if (month !== null && !isNaN(yearRaw)) {
      const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw
      return { month, year }
    }
  }

  // "SCHEDULE MEI" or "SCHEDULE APRIL"
  if (parts[0] === 'SCHEDULE' && parts.length >= 2) {
    const month = monthFromString(parts[1])
    if (month !== null) return { month, year: new Date().getFullYear() }
  }

  return null
}

/** Find the right sheet for BSD / La Piazza / SMB-GL (month+year tab naming) */
function findMonthYearTab(workbook: XLSX.WorkBook, targetMonth: number, targetYear: number): XLSX.WorkSheet | null {
  for (const name of workbook.SheetNames) {
    const parsed = parseMonthYear(name)
    if (parsed && parsed.month === targetMonth && parsed.year === targetYear) {
      return workbook.Sheets[name]
    }
  }
  return null
}

/** Find MKG sheet — weekly date ranges like "4MEI-10MEI", "30MAR-5APL" */
function findMKGTab(workbook: XLSX.WorkBook, targetDay: number, targetMonth: number): XLSX.WorkSheet | null {
  for (const name of workbook.SheetNames) {
    const u = name.toUpperCase().replace(/\s+/g, '')
    // Check if this tab has a month match AND contains the target day
    let foundMonth: number | null = null
    for (const [key, val] of Object.entries(ID_MONTHS)) {
      if (u.includes(key)) {
        foundMonth = val
        break
      }
    }
    if (foundMonth === null || foundMonth !== targetMonth) continue

    // Extract numbers from tab name
    const nums = [...u.matchAll(/(\d+)/g)].map(m => parseInt(m[1]))
    if (nums.length >= 2) {
      const [start, end] = [Math.min(...nums), Math.max(...nums)]
      if (targetDay >= start && targetDay <= end) return workbook.Sheets[name]
    }
    // If only one number found, check proximity
    if (nums.length === 1) return workbook.Sheets[name]
  }
  // Fallback: pick first sheet with a matching month
  for (const name of workbook.SheetNames) {
    const u = name.toUpperCase()
    for (const [key, val] of Object.entries(ID_MONTHS)) {
      if (u.includes(key) && val === targetMonth) return workbook.Sheets[name]
    }
  }
  return workbook.Sheets[workbook.SheetNames[0]] || null
}

/** Find SMB sheet — full date range like "27 Apr - 24 Mei 2026" */
function findSMBTab(workbook: XLSX.WorkBook, targetMonth: number): XLSX.WorkSheet | null {
  for (const name of workbook.SheetNames) {
    const u = name.toUpperCase()
    for (const [key, val] of Object.entries(ID_MONTHS)) {
      if (u.includes(key) && val === targetMonth) return workbook.Sheets[name]
    }
  }
  return workbook.Sheets[workbook.SheetNames[0]] || null
}

// ============================================================
// XLSX → 2D ARRAY
// ============================================================

type Row = unknown[]

function getRows(sheet: XLSX.WorkSheet): Row[] {
  return XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, defval: null })
}

// ============================================================
// PARSER: BSD
// ============================================================
// Row 1 (0-based): date numbers (col D+ = index 3+)
// Col B (1): division label  /  Col C (2): staff name  /  Col D+ (3+): shifts
// Kitchen section ~row 29: no col B label, col A has numeric time fraction

function parseBSD(rows: Row[], targetDay: number): StaffSchedule[] {
  const dateRow = rows[1] ?? []
  let colIdx = -1
  for (let c = 3; c < dateRow.length; c++) {
    if (Number(dateRow[c]) === targetDay) { colIdx = c; break }
  }
  if (colIdx < 0) return []

  const staff: StaffSchedule[] = []
  let currentDiv: DivisionType = 'UNKNOWN'

  for (let r = 3; r < rows.length; r++) {
    const row = rows[r]
    if (!row) continue
    const colB = row[1]
    const colC = row[2]
    const shiftVal = row[colIdx]

    if (colB && isRoleLabel(colB)) {
      currentDiv = mapDivision(String(colB))
      // Staff name might be in col C on the same row
      const name = cleanName(colC)
      if (name && !isRoleLabel(colC)) {
        staff.push({ name, division: currentDiv, ...normalizeShift(shiftVal) })
      }
    } else if (colC && !isRoleLabel(colC)) {
      const name = cleanName(colC)
      if (name) staff.push({ name, division: currentDiv, ...normalizeShift(shiftVal) })
    } else if (!colB && !colC) {
      // Kitchen section: col A has numeric time fraction
      const numA = parseFloat(String(row[0] ?? ''))
      if (!isNaN(numA) && numA > 0 && numA < 1) currentDiv = 'KITCHEN'
    }
  }
  return staff
}

// ============================================================
// PARSER: LA PIAZZA
// ============================================================
// Row 2 (0-based): date numbers (col C+ = index 2+)
// Row 3: day names  /  Col A (0): name or role  /  Col B (1): PH count (ignored)
// Kitchen section starts ~row 37

function parseLaPiazza(rows: Row[], targetDay: number): StaffSchedule[] {
  const dateRow = rows[2] ?? []
  let colIdx = -1
  for (let c = 2; c < dateRow.length; c++) {
    if (Number(dateRow[c]) === targetDay) { colIdx = c; break }
  }
  if (colIdx < 0) return []

  const staff: StaffSchedule[] = []
  let currentDiv: DivisionType = 'UNKNOWN'

  for (let r = 4; r < rows.length; r++) {
    const row = rows[r]
    if (!row) continue
    const colA = row[0]
    if (!colA) continue

    if (isRoleLabel(colA)) {
      currentDiv = mapDivision(String(colA))
    } else {
      const name = cleanName(colA)
      if (name && name.length > 1) {
        staff.push({ name, division: currentDiv, ...normalizeShift(row[colIdx]) })
      }
    }
  }
  return staff
}

// ============================================================
// PARSER: MKG
// ============================================================
// Row 1: dates in col C+ ("09/12" or Excel Date serial)
// Col A: section label (when non-empty)  /  Col B: staff name  /  Col C+: shifts

function parseMKG(rows: Row[], targetDay: number, targetMonth: number): StaffSchedule[] {
  const dateRow = rows[1] ?? []
  let colIdx = -1

  for (let c = 2; c < dateRow.length; c++) {
    const v = dateRow[c]
    if (v === null || v === undefined) continue
    // Excel Date serial (number > 40000)
    if (typeof v === 'number' && v > 40000) {
      const d = XLSX.SSF.parse_date_code(v)
      if (d && d.d === targetDay && (d.m - 1) === targetMonth) { colIdx = c; break }
      continue
    }
    // "09/12" → day/month
    const s = String(v).trim()
    const slash = s.match(/^(\d{1,2})\/(\d{1,2})$/)
    if (slash) {
      if (parseInt(slash[1]) === targetDay && parseInt(slash[2]) - 1 === targetMonth) { colIdx = c; break }
      continue
    }
    if (Number(s) === targetDay) { colIdx = c; break }
  }
  if (colIdx < 0) return []

  const staff: StaffSchedule[] = []
  let currentDiv: DivisionType = 'UNKNOWN'

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r]
    if (!row) continue
    const colA = row[0]
    const colB = row[1]

    if (colA) {
      const aStr = String(colA).trim()
      if (isRoleLabel(aStr)) currentDiv = mapDivision(aStr)
      else if (aStr.toUpperCase().includes('HEAD')) currentDiv = 'PIC'
      else if (aStr.toUpperCase().includes('CASHIER')) currentDiv = 'BAR'
      else if (aStr.toUpperCase().includes('FLOOR')) currentDiv = 'FLOOR'
      else if (aStr.toUpperCase().includes('KITCHEN')) currentDiv = 'KITCHEN'
      else if (aStr.toUpperCase().includes('HOUSEKEEPING')) currentDiv = 'HK'
    }
    if (colB) {
      const name = cleanName(colB)
      if (name && name.length > 1 && !isRoleLabel(name)) {
        staff.push({ name, division: currentDiv, ...normalizeShift(row[colIdx]) })
      }
    }
  }
  return staff
}

// ============================================================
// PARSER: SMB
// ============================================================
// Row 3 (0-based): date numbers (col C+ = index 2+)
// Row 4: day names  /  Col A: name or role  /  Col B: PH count (ignored)
// Kitchen section ~row 31 — has its own repeat date header

function parseSMB(rows: Row[], targetDay: number): StaffSchedule[] {
  // Find the date row (auto-detect in case rows shift slightly)
  let dateRowIdx = 3
  for (let r = 2; r < Math.min(rows.length, 8); r++) {
    const nums = (rows[r] ?? []).slice(2).filter(v => {
      const n = Number(v)
      return n >= 1 && n <= 31
    })
    if (nums.length >= 7) { dateRowIdx = r; break }
  }

  let colIdx = findDayInRow(rows[dateRowIdx] ?? [], targetDay, 2)
  if (colIdx < 0) return []

  const staff: StaffSchedule[] = []
  let currentDiv: DivisionType = 'UNKNOWN'

  for (let r = dateRowIdx + 2; r < rows.length; r++) {
    const row = rows[r]
    if (!row) continue
    const colA = row[0]
    if (!colA) continue

    const aStr = String(colA)
    // Numeric → could be a repeat date row (kitchen section header)
    const numA = Number(aStr)
    if (!isNaN(numA) && numA >= 1 && numA <= 31) {
      const newCol = findDayInRow(row, targetDay, 2)
      if (newCol >= 0) colIdx = newCol
      currentDiv = 'KITCHEN'
      continue
    }
    if (isRoleLabel(colA)) {
      currentDiv = mapDivision(aStr)
    } else {
      const name = cleanName(colA)
      if (name && name.length > 1) {
        staff.push({ name, division: currentDiv, ...normalizeShift(row[colIdx]) })
      }
    }
  }
  return staff
}

// ============================================================
// PARSER: SMB GOLD LOUNGE
// ============================================================
// Weekly blocks stacked vertically — each block:
//   Row 0: col A = "NAMA", col B+: empty or day names
//   Row 1: col A = empty, col B+: date numbers
//   Row 2: col A = empty, col B+: day labels
//   Row 3+: staff rows (col A = name or role label, col B+: shifts)

function parseSMBGL(rows: Row[], targetDay: number): StaffSchedule[] {
  let blockStart = -1
  let colIdx = -1

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    if (!row) continue
    if (String(row[0] ?? '').toUpperCase().trim() !== 'NAMA') continue
    // Check the next row for the target day
    const dateRow = rows[r + 1] ?? []
    const ci = findDayInRow(dateRow, targetDay, 1)
    if (ci >= 0) { blockStart = r; colIdx = ci; break }
  }
  if (blockStart < 0 || colIdx < 0) return []

  const staff: StaffSchedule[] = []
  let currentDiv: DivisionType = 'UNKNOWN'

  for (let r = blockStart + 3; r < rows.length; r++) {
    const row = rows[r]
    if (!row) continue
    const colA = row[0]
    if (!colA) continue
    if (String(colA).toUpperCase().trim() === 'NAMA') break // next block

    if (isRoleLabel(colA)) {
      currentDiv = mapDivision(String(colA))
    } else {
      const name = cleanName(colA)
      if (name && name.length > 1) {
        staff.push({ name, division: currentDiv, ...normalizeShift(row[colIdx]) })
      }
    }
  }
  return staff
}

// ============================================================
// HELPER
// ============================================================

function findDayInRow(row: Row, targetDay: number, startCol: number): number {
  for (let c = startCol; c < row.length; c++) {
    if (Number(row[c]) === targetDay) return c
  }
  return -1
}

// ============================================================
// MAIN EXPORT
// ============================================================

export function parseOutletSchedule(
  outletId: string,
  format: OutletFormat,
  outletName: string,
  buffer: Buffer,
  date: Date
): OutletDaySchedule {
  const targetDay = date.getDate()
  const targetMonth = date.getMonth()
  const targetYear = date.getFullYear()
  const dateStr = date.toISOString().split('T')[0]

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  } catch {
    return { outletId, outletName, date: dateStr, staff: [], error: 'Gagal membaca file Excel' }
  }

  let sheet: XLSX.WorkSheet | null = null
  switch (format) {
    case 'bsd':
    case 'la-piazza':
    case 'smb-gl':
      sheet = findMonthYearTab(workbook, targetMonth, targetYear)
      break
    case 'mkg':
      sheet = findMKGTab(workbook, targetDay, targetMonth)
      break
    case 'smb':
      sheet = findSMBTab(workbook, targetMonth)
      break
  }

  if (!sheet) {
    return { outletId, outletName, date: dateStr, staff: [], error: 'Tab jadwal tidak ditemukan' }
  }

  const rows = getRows(sheet)
  let staff: StaffSchedule[] = []

  switch (format) {
    case 'bsd':       staff = parseBSD(rows, targetDay); break
    case 'la-piazza': staff = parseLaPiazza(rows, targetDay); break
    case 'mkg':       staff = parseMKG(rows, targetDay, targetMonth); break
    case 'smb':       staff = parseSMB(rows, targetDay); break
    case 'smb-gl':    staff = parseSMBGL(rows, targetDay); break
  }

  return {
    outletId,
    outletName,
    date: dateStr,
    staff: staff.filter(s => s.name.length > 0),
  }
}
