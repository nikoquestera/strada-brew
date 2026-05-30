import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import {
  PERFORMANCE_OUTLETS,
  parseMonthlyData,
  parseWeeklyData,
  parseDailyData,
  findMonthlyTabName,
  findMonthlyColumn,
  findWeeklyTabName,
  findWeeklyColumn,
  findDailyTabName,
  findDailyColumn,
  type OutletPerformanceData,
  type AllPerformanceData,
} from '@/lib/ops/performanceParser'

function getGoogleAuth() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!json) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set')
  const credentials = JSON.parse(json)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

/** Fetch all rows from a specific sheet tab as a 2D array. */
async function fetchSheetRows(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabName: string
): Promise<unknown[][]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tabName}'!A1:AZ300`,
  })
  return (res.data.values ?? []) as unknown[][]
}

/** List all sheet tab names in a spreadsheet. */
async function listTabNames(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<string[]> {
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  })
  return (res.data.sheets ?? []).map(s => s.properties?.title ?? '')
}

async function fetchReport(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  reportType: 'monthly' | 'weekly' | 'daily',
  outletId: string,
  outletName: string,
  today: Date
): Promise<OutletPerformanceData | null> {
  if (spreadsheetId.startsWith('YOUR_')) return null

  const tabNames = await listTabNames(sheets, spreadsheetId)

  let tabName: string | null = null
  switch (reportType) {
    case 'monthly': tabName = findMonthlyTabName(tabNames, today); break
    case 'weekly':  tabName = findWeeklyTabName(tabNames, today); break
    case 'daily':   tabName = findDailyTabName(tabNames, today); break
  }

  if (!tabName) return null

  const rows = await fetchSheetRows(sheets, spreadsheetId, tabName)

  let colIdx: number
  switch (reportType) {
    case 'monthly': colIdx = findMonthlyColumn(rows, today); break
    case 'weekly':  colIdx = findWeeklyColumn(rows, today); break
    case 'daily':   colIdx = findDailyColumn(rows, today); break
  }

  switch (reportType) {
    case 'monthly': return parseMonthlyData(rows, colIdx, outletId, outletName, today)
    case 'weekly':  return parseWeeklyData(rows, colIdx, outletId, outletName, today)
    case 'daily':   return parseDailyData(rows, colIdx, outletId, outletName, today)
  }
}

export async function GET() {
  // Auth check
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if all IDs are still placeholders
  const allPlaceholders = Object.values(PERFORMANCE_OUTLETS).every(
    o => o.monthly.startsWith('YOUR_') && o.weekly.startsWith('YOUR_') && o.daily.startsWith('YOUR_')
  )
  if (allPlaceholders) {
    const result: AllPerformanceData = {
      outlets: Object.fromEntries(
        Object.entries(PERFORMANCE_OUTLETS).map(([id]) => [id, { monthly: null, weekly: null, daily: null }])
      ),
      fetchedAt: new Date().toISOString(),
      errors: ['Spreadsheet IDs belum dikonfigurasi. Ganti YOUR_PERF_SHEET_* di performanceParser.ts.'],
    }
    return NextResponse.json(result)
  }

  let auth: ReturnType<typeof getGoogleAuth>
  try {
    auth = getGoogleAuth()
  } catch {
    return NextResponse.json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON tidak valid' }, { status: 500 })
  }

  const sheets = google.sheets({ version: 'v4', auth })
  const today = new Date()
  const errors: string[] = []

  // Fetch all 21 sheets in parallel (7 outlets × 3 report types)
  const outletEntries = Object.entries(PERFORMANCE_OUTLETS)

  const allResults = await Promise.all(
    outletEntries.map(async ([outletId, config]) => {
      const [monthly, weekly, daily] = await Promise.all([
        fetchReport(sheets, config.monthly, 'monthly', outletId, config.outletName, today)
          .catch(err => { errors.push(`${config.outletName} monthly: ${err.message}`); return null }),
        fetchReport(sheets, config.weekly, 'weekly', outletId, config.outletName, today)
          .catch(err => { errors.push(`${config.outletName} weekly: ${err.message}`); return null }),
        fetchReport(sheets, config.daily, 'daily', outletId, config.outletName, today)
          .catch(err => { errors.push(`${config.outletName} daily: ${err.message}`); return null }),
      ])
      return [outletId, { monthly, weekly, daily }] as const
    })
  )

  const result: AllPerformanceData = {
    outlets: Object.fromEntries(allResults),
    fetchedAt: today.toISOString(),
    errors,
  }

  return NextResponse.json(result)
}
