import * as fs from 'fs'
import { execSync } from 'child_process'

function parseXlsxDates() {
  try {
    // 1. Get Shared Strings
    const sharedStringsXml = execSync('unzip -p Missing_Reports_Strada.xlsx xl/sharedStrings.xml').toString()
    const strings = []
    const siMatches = sharedStringsXml.matchAll(/<si><t>(.*?)<\/t><\/si>/g)
    for (const match of siMatches) {
      strings.push(match[1])
    }

    // 2. Get Sheet 2 (Combined Missing)
    const sheetXml = execSync('unzip -p Missing_Reports_Strada.xlsx xl/worksheets/sheet2.xml').toString()
    
    // In XLSX, dates are often stored as numbers (days since 1900) or indexes into shared strings
    // But based on my peek, they seem to be strings like "01/01/2025" in sharedStrings.
    
    const missingData = []
    // Each row has cells <c r="A1" t="s"><v>index</v></c>
    // Let's find rows.
    const rowMatches = sheetXml.matchAll(/<row r="(\d+)">(.*?)<\/row>/g)
    for (const rowMatch of rowMatches) {
      const cells = rowMatch[2].matchAll(/<c r="[A-Z]+\d+" t="s"><v>(\d+)<\/v><\/c>/g)
      const rowValues = []
      for (const cell of cells) {
        rowValues.push(strings[parseInt(cell[1])])
      }
      if (rowValues.length >= 3) {
        // Expected format based on common patterns: Tanggal, Store, Report Type
        missingData.push({
          date: rowValues[0],
          store: rowValues[1],
          type: rowValues[2]
        })
      }
    }
    return missingData
  } catch (e) {
    console.error('Error parsing XLSX:', e.message)
    return []
  }
}

const missing = parseXlsxDates()
fs.writeFileSync('missing_parsed.json', JSON.stringify(missing, null, 2))
console.log(`Parsed ${missing.length} missing reports.`)
