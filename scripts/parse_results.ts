import fs from 'fs'

const sql = fs.readFileSync('reference_disc.sql', 'utf8')
const lines = sql.split('\n')

const results: any[] = []
const regex = /\((\d+),\s*(-?\d+),\s*(-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+),\s*(\d+)\)/
for (const line of lines) {
  const match = line.match(regex)
  if (match) {
    const [_, id, value, d, i, s, c, lineNo] = match
    results.push({
      value: parseInt(value),
      d: parseFloat(d),
      i: parseFloat(i),
      s: parseFloat(s),
      c: parseFloat(c),
      line: parseInt(lineNo)
    })
  }
}

console.log(JSON.stringify(results, null, 2))
