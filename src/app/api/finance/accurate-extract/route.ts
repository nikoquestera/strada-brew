import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'Extracted_Accurate_Granular_Data.csv')
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ data: [] })
    }
    
    const csvContent = fs.readFileSync(filePath, 'utf-8')
    const lines = csvContent.split('\n').filter(l => l.trim() !== '')
    if (lines.length < 2) return NextResponse.json({ data: [] })
    
    const headers = lines[0].split(',')
    const data = []
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',')
      const row: Record<string, any> = {}
      headers.forEach((h, idx) => {
        const val = cols[idx]
        // Columns 2-5 are pre-calculated totals
        row[h] = idx >= 2 ? (parseFloat(val) || 0) : val
      })
      data.push(row)
    }
    
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
