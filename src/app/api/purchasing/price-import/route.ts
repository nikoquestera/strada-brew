import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SERVICE_KEY =
  process.env.SERVICE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

interface ExtractedItem {
  nama_vendor: string
  harga: number
  satuan: string
}

interface MatchedItem {
  nama_vendor: string
  harga_baru: number
  satuan: string
  item_id: string | null
  nama_item: string | null
  kode_accurate: string | null
  harga_lama: number | null
  delta_pct: number | null
  confidence: number  // 0–100
  match_method: string
}

// Normalize string for fuzzy matching
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// POST /api/purchasing/price-import
// Accepts multipart/form-data: file (PDF|image|xlsx|csv) + vendor_id + berlaku_dari
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const vendorId = formData.get('vendor_id') as string
    const berlakuDari = formData.get('berlaku_dari') as string

    if (!file || !vendorId || !berlakuDari) {
      return NextResponse.json({ error: 'file, vendor_id, and berlaku_dari are required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      SERVICE_KEY!
    )

    // --- Step 1: Extract items from file ---
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type
    let extractedItems: ExtractedItem[] = []

    if (mimeType === 'application/pdf') {
      // Dynamic import to avoid build-time issues with pdf-parse's test file scanner
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const pdfData = await pdfParse(fileBuffer)
      extractedItems = await extractWithClaude(pdfData.text, 'text')
    } else if (mimeType.startsWith('image/')) {
      const base64 = fileBuffer.toString('base64')
      extractedItems = await extractWithClaudeVision(base64, mimeType)
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel' ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')
    ) {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      const textRepresentation = rows.map(r => r.join('\t')).join('\n')
      extractedItems = await extractWithClaude(textRepresentation, 'spreadsheet')
    } else if (mimeType === 'text/csv' || file.name.endsWith('.csv')) {
      const { default: Papa } = await import('papaparse')
      const csvText = fileBuffer.toString('utf-8')
      const { data } = Papa.parse(csvText, { header: true, skipEmptyLines: true })
      const textRepresentation = (data as any[])
        .map(row => Object.values(row).join('\t'))
        .join('\n')
      extractedItems = await extractWithClaude(textRepresentation, 'csv')
    } else {
      return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 400 })
    }

    if (extractedItems.length === 0) {
      return NextResponse.json({ error: 'No items could be extracted from file' }, { status: 422 })
    }

    // --- Step 2: Load items from DB for matching ---
    const { data: dbItems } = await supabase
      .from('items')
      .select('id, nama, kode_accurate, kode_quinos, satuan')
      .eq('aktif', true)

    // Load current prices for this vendor
    const { data: currentPrices } = await supabase
      .from('kamus_harga_aktif')
      .select('item_id, harga_beli')
      .eq('vendor_id', vendorId)

    const currentPriceMap = new Map<string, number>(
      (currentPrices ?? []).map((p: any) => [p.item_id, Number(p.harga_beli)])
    )

    // --- Step 3: Match each extracted item ---
    const matched: MatchedItem[] = []
    const unmatched: { nama_vendor: string; closest_match: string }[] = []

    for (const extracted of extractedItems) {
      const normExtracted = normalize(extracted.nama_vendor)
      let bestMatch: any = null
      let bestScore = 0
      let matchMethod = ''

      for (const dbItem of (dbItems ?? [])) {
        // Exact kode_quinos match
        if (dbItem.kode_quinos && normalize(dbItem.kode_quinos) === normExtracted) {
          bestMatch = dbItem
          bestScore = 100
          matchMethod = 'kode_quinos'
          break
        }
        // Exact kode_accurate match
        if (normalize(dbItem.kode_accurate) === normExtracted) {
          bestMatch = dbItem
          bestScore = 100
          matchMethod = 'kode_accurate'
          break
        }
        // Normalized name match
        const normDb = normalize(dbItem.nama)
        if (normDb === normExtracted) {
          bestMatch = dbItem
          bestScore = 95
          matchMethod = 'exact_name'
          break
        }
        // Substring match
        if (normDb.includes(normExtracted) || normExtracted.includes(normDb)) {
          const score = Math.round((Math.min(normDb.length, normExtracted.length) / Math.max(normDb.length, normExtracted.length)) * 85)
          if (score > bestScore) {
            bestMatch = dbItem
            bestScore = score
            matchMethod = 'substring'
          }
        }
      }

      const hargaLama = bestMatch ? (currentPriceMap.get(bestMatch.id) ?? null) : null
      const deltaPct = hargaLama && extracted.harga
        ? Math.round(((extracted.harga - hargaLama) / hargaLama) * 100)
        : null

      if (bestScore >= 60 && bestMatch) {
        matched.push({
          nama_vendor: extracted.nama_vendor,
          harga_baru: extracted.harga,
          satuan: extracted.satuan || bestMatch.satuan,
          item_id: bestMatch.id,
          nama_item: bestMatch.nama,
          kode_accurate: bestMatch.kode_accurate,
          harga_lama: hargaLama,
          delta_pct: deltaPct,
          confidence: bestScore,
          match_method: matchMethod,
        })
      } else {
        const closest = bestMatch?.nama ?? ''
        unmatched.push({ nama_vendor: extracted.nama_vendor, closest_match: closest })
        matched.push({
          nama_vendor: extracted.nama_vendor,
          harga_baru: extracted.harga,
          satuan: extracted.satuan,
          item_id: null,
          nama_item: null,
          kode_accurate: null,
          harga_lama: null,
          delta_pct: null,
          confidence: bestScore,
          match_method: 'no_match',
        })
      }
    }

    // Save import log
    const { data: importLog } = await supabase
      .from('price_list_imports')
      .insert({
        vendor_id: vendorId,
        berlaku_dari: berlakuDari,
        total_items_in_file: extractedItems.length,
        total_items_matched: matched.filter(m => m.item_id !== null).length,
        total_items_unmatched: unmatched.length,
        items_unmatched: unmatched,
        status: 'pending',
      })
      .select('id')
      .single()

    return NextResponse.json({
      import_id: importLog?.id,
      total: extractedItems.length,
      matched: matched.filter(m => m.item_id !== null).length,
      unmatched: unmatched.length,
      items: matched,
    })
  } catch (err: any) {
    console.error('[price-import] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function callClaude(messages: any[]): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages,
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text?.trim() ?? ''
}

function parseItemsFromText(raw: string): ExtractedItem[] {
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []
  try {
    return JSON.parse(jsonMatch[0]) as ExtractedItem[]
  } catch {
    return []
  }
}

async function extractWithClaude(text: string, format: string): Promise<ExtractedItem[]> {
  const raw = await callClaude([{
    role: 'user',
    content: `You are a purchasing assistant for Strada Coffee Indonesia.
Extract all items and their prices from this vendor price list (format: ${format}).
Return a JSON array ONLY — no markdown, no preamble, no explanation:
[{"nama_vendor": string, "harga": number, "satuan": string}]

Price list content:
${text.slice(0, 8000)}`
  }])
  return parseItemsFromText(raw)
}

async function extractWithClaudeVision(base64: string, mimeType: string): Promise<ExtractedItem[]> {
  const raw = await callClaude([{
    role: 'user',
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: mimeType, data: base64 }
      },
      {
        type: 'text',
        text: `You are a purchasing assistant for Strada Coffee Indonesia.
Extract all items and their prices from this vendor price list image.
Return a JSON array ONLY — no markdown, no preamble, no explanation:
[{"nama_vendor": string, "harga": number, "satuan": string}]`
      }
    ]
  }])
  return parseItemsFromText(raw)
}
