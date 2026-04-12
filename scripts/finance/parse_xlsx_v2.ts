import * as fs from 'fs'
import { execSync } from 'child_process'

function parseXlsx() {
  const sharedStrings = execSync('unzip -p Missing_Reports_Strada.xlsx xl/sharedStrings.xml').toString()
  const strings = []
  const tMatches = sharedStrings.match(/<t>(.*?)<\/t>/g) || []
  for (const t of tMatches) {
    strings.push(t.replace(/<\/?t>/g, ''))
  }

  const sheet2 = execSync('unzip -p Missing_Reports_Strada.xlsx xl/worksheets/sheet2.xml').toString()
  
  const results = []
  // Find all cells <c ... t="s"><v>INDEX</v></c>
  const cellRegex = /<c [^>]*?t="s"[^>]*?><v>(\d+)<\/v><\/c>/g
  let match
  let currentRow = []
  
  // Actually row based is better.
  const rows = sheet2.match(/<row [^>]*?>(.*?)<\/row>/g) || []
  for (const row of rows) {
    const cells = row.match(/<v>(\d+)<\/v>/g) || []
    const values = cells.map(c => {
      const idx = parseInt(c.replace(/<\/?v>/g, ''))
      return strings[idx]
    })
    
    // Look for patterns like DD/MM/YYYY, Store, Type
    const dateIdx = values.findIndex(v => v && v.match(/^\d{2}\/\d{2}\/\d{4}$/))
    if (dateIdx !== -1 && values.length >= dateIdx + 3) {
      results.push({
        date: values[dateIdx],
        store: values[dateIdx+1],
        type: values[dateIdx+2]
      })
    }
  }
  return results
}

const data = parseXlsx()
fs.writeFileSync('missing_detailed.json', JSON.stringify(data, null, 2))
console.log(`Extracted ${data.length} missing records.`)
