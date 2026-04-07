import fs from 'fs'

const sql = fs.readFileSync('reference_disc.sql', 'utf8')
const lines = sql.split('\n')
const questions: any[] = []

let currentQ: any = null

const regex = /\((\d+),\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/
for (const line of lines) {
  const match = line.match(regex)
  if (match) {
    const [_, id, no, term, most, least] = match
    const qNo = parseInt(no)
    if (!currentQ || currentQ.no !== qNo) {
      if (currentQ) questions.push(currentQ)
      currentQ = { no: qNo, options: [] }
    }
    currentQ.options.push({ term, most, least })
  }
}
if (currentQ) questions.push(currentQ)

console.log(JSON.stringify(questions, null, 2))
