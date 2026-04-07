import fs from 'fs'

// Read and parse SQL
const sql = fs.readFileSync('reference_disc.sql', 'utf8')
const lines = sql.split('\n')
const refMap: Record<string, { most: string, least: string }> = {}

const regex = /\((\d+),\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/
for (const line of lines) {
  const match = line.match(regex)
  if (match) {
    const [_, id, no, term, most, least] = match
    refMap[`${no}-${term}`] = { most, least }
  }
}

// Read current data.ts
const dataTs = fs.readFileSync('src/lib/disc/data.ts', 'utf8')
// Extract the DISC_QUESTIONS array content
const questionsMatch = dataTs.match(/export const DISC_QUESTIONS: DiscQuestion\[\] = (\[[\s\S]+?\])/)
if (!questionsMatch) {
  console.error('Could not find DISC_QUESTIONS in data.ts')
  process.exit(1)
}

// Simple parser for the JS array (since we can't easily eval TS)
const currentMap: Record<string, { most: string, least: string }> = {}
const qRegex = /\{ no: (\d+),\s*options: \[(.*?)\] \}/g
const optRegex = /\{ term: '([^']+)',\s*most: '([^']+)',\s*least: '([^']+)' \}/g

let m
while ((m = qRegex.exec(questionsMatch[1])) !== null) {
  const qNo = m[1]
  const optsStr = m[2]
  let mo
  while ((mo = optRegex.exec(optsStr)) !== null) {
    const [_, term, most, least] = mo
    currentMap[`${qNo}-${term}`] = { most, least }
  }
}

// Compare
const refKeys = Object.keys(refMap).sort()
const currentKeys = Object.keys(currentMap).sort()

console.log('--- Missing in current data.ts ---')
for (const k of refKeys) {
  if (!currentMap[k]) console.log(k)
  else if (refMap[k].most !== currentMap[k].most || refMap[k].least !== currentMap[k].least) {
    console.log(`Mismatch ${k}: Ref(${refMap[k].most},${refMap[k].least}) vs Current(${currentMap[k].most},${currentMap[k].least})`)
  }
}

console.log('\n--- Extra in current data.ts ---')
for (const k of currentKeys) {
  if (!refMap[k]) console.log(k)
}
