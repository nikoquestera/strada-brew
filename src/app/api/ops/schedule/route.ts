import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import {
  OUTLET_SCHEDULE_FILES,
  parseOutletSchedule,
  type OutletDaySchedule,
} from '@/lib/ops/scheduleParser'

function getGoogleAuth() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!json) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set')
  const credentials = JSON.parse(json)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
}

export async function GET(req: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  const outletParam = searchParams.get('outlet') // optional — if omitted, fetch all

  // Parse and validate date
  let targetDate: Date
  if (dateParam) {
    targetDate = new Date(dateParam + 'T00:00:00')
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.' }, { status: 400 })
    }
  } else {
    targetDate = new Date()
  }

  const outletIds = outletParam
    ? [outletParam]
    : Object.keys(OUTLET_SCHEDULE_FILES)

  // Check if any file IDs are still placeholders
  const unconfigured = outletIds.filter(id => {
    const f = OUTLET_SCHEDULE_FILES[id]
    return f && f.fileId.startsWith('YOUR_')
  })
  if (unconfigured.length === outletIds.length) {
    return NextResponse.json({
      date: targetDate.toISOString().split('T')[0],
      outlets: outletIds.map(id => ({
        outletId: id,
        outletName: OUTLET_SCHEDULE_FILES[id]?.outletName ?? id,
        date: targetDate.toISOString().split('T')[0],
        staff: [],
        error: 'File ID belum dikonfigurasi',
      })),
      message: 'Ganti YOUR_SHEET_ID_* di scheduleParser.ts dengan Google Drive file ID yang sebenarnya.',
    }, { status: 200 })
  }

  let auth: ReturnType<typeof getGoogleAuth>
  try {
    auth = getGoogleAuth()
  } catch (err) {
    return NextResponse.json({
      error: 'GOOGLE_SERVICE_ACCOUNT_JSON tidak tersedia atau tidak valid',
    }, { status: 500 })
  }

  const drive = google.drive({ version: 'v3', auth })

  const results: OutletDaySchedule[] = await Promise.all(
    outletIds.map(async (outletId) => {
      const outletConfig = OUTLET_SCHEDULE_FILES[outletId]
      if (!outletConfig) {
        return {
          outletId,
          outletName: outletId,
          date: targetDate.toISOString().split('T')[0],
          staff: [],
          error: 'Outlet tidak ditemukan',
        }
      }

      if (outletConfig.fileId.startsWith('YOUR_')) {
        return {
          outletId,
          outletName: outletConfig.outletName,
          date: targetDate.toISOString().split('T')[0],
          staff: [],
          error: 'File ID belum dikonfigurasi',
        }
      }

      try {
        const res = await drive.files.get(
          { fileId: outletConfig.fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        )
        const buffer = Buffer.from(res.data as ArrayBuffer)
        return parseOutletSchedule(
          outletId,
          outletConfig.format,
          outletConfig.outletName,
          buffer,
          targetDate
        )
      } catch (err) {
        console.error(`[ops/schedule] Failed to fetch ${outletId}:`, err)
        return {
          outletId,
          outletName: outletConfig.outletName,
          date: targetDate.toISOString().split('T')[0],
          staff: [],
          error: `Gagal mengambil data: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      }
    })
  )

  return NextResponse.json({
    date: targetDate.toISOString().split('T')[0],
    outlets: results,
  })
}
