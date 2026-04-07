import { DISC_QUESTIONS, DISC_PATTERNS, Dimension, DiscPattern } from './data'

export interface DiscAnswers {
  [questionNo: number]: { most: string; least: string }
}

export interface DiscRawScores {
  D: number; I: number; S: number; C: number
}

export interface DiscResults {
  graph1: DiscRawScores   // Most (Public Self / Mask)
  graph2: DiscRawScores   // Least (Private Self / Core)
  graph3: DiscRawScores   // Change = graph1 - graph2 (Perceived Self / Mirror)
  primaryType: Dimension
  secondaryTypes: Dimension[]
  patternKey: string
  pattern: DiscPattern        // Graph III — kepribadian asli (primary)
  pattern1: DiscPattern       // Graph I  — kepribadian di muka umum
  pattern2: DiscPattern       // Graph II — kepribadian saat mendapat tekanan
}

const DIMS: Dimension[] = ['D', 'I', 'S', 'C']

export function computeDiscResults(answers: DiscAnswers): DiscResults {
  const graph1: DiscRawScores = { D: 0, I: 0, S: 0, C: 0 }
  const graph2: DiscRawScores = { D: 0, I: 0, S: 0, C: 0 }

  for (const q of DISC_QUESTIONS) {
    const ans = answers[q.no]
    if (!ans) continue

    const mostOpt  = q.options.find(o => o.term === ans.most)
    const leastOpt = q.options.find(o => o.term === ans.least)

    if (mostOpt  && mostOpt.most  !== 'N') graph1[mostOpt.most  as Dimension]++
    if (leastOpt && leastOpt.least !== 'N') graph2[leastOpt.least as Dimension]++
  }

  const graph3: DiscRawScores = {
    D: graph1.D - graph2.D,
    I: graph1.I - graph2.I,
    S: graph1.S - graph2.S,
    C: graph1.C - graph2.C,
  }

  // Determine profile: sort dimensions by graph3 score descending
  const ranked = DIMS.slice().sort((a, b) => graph3[b] - graph3[a])
  const primaryType = ranked[0]

  // Secondary = those also above 0 (or within 2 of primary if primary is 0)
  const threshold = Math.max(0, graph3[primaryType] - 3)
  const secondaryTypes = ranked.slice(1).filter(d => graph3[d] >= threshold && graph3[d] > 0)

  const patternKey = buildPatternKey(ranked, graph3, 3)

  const pattern  = findPattern(patternKey, graph3)

  // Graph I pattern — public self (rank by graph1)
  const ranked1 = DIMS.slice().sort((a, b) => graph1[b] - graph1[a])
  const key1 = buildPatternKey(ranked1, graph1, 3)
  const pattern1 = findPattern(key1, graph1)

  // Graph II pattern — under-pressure self (rank by graph2)
  const ranked2 = DIMS.slice().sort((a, b) => graph2[b] - graph2[a])
  const key2 = buildPatternKey(ranked2, graph2, 3)
  const pattern2 = findPattern(key2, graph2)

  return { graph1, graph2, graph3, primaryType, secondaryTypes, patternKey, pattern, pattern1, pattern2 }
}

function buildPatternKey(ranked: Dimension[], scores: DiscRawScores, topN: number): string {
  const max = scores[ranked[0]]
  const threshold = Math.max(0, max - 3)
  const active = ranked.filter(d => scores[d] >= threshold && scores[d] > 0).slice(0, topN)
  return active.length > 0 ? active.join('-') : ranked[0]
}

function findPattern(key: string, graph3: DiscRawScores): DiscPattern {
  // Try exact match first
  let found = DISC_PATTERNS.find(p => p.type === key)
  if (found) return found

  // Try alternate slash notation (S-C/C-S)
  found = DISC_PATTERNS.find(p => p.type.split('/').some(t => t.trim() === key))
  if (found) return found

  // Try matching the first two letters of the key
  if (key.length > 1) {
    const twoKey = key.split('-').slice(0, 2).join('-')
    found = DISC_PATTERNS.find(p => p.type === twoKey)
    if (found) return found
  }

  // Fall back to single-letter primary
  const singleKey = key.split('-')[0]
  found = DISC_PATTERNS.find(p => p.type === singleKey)
  if (found) return found

  // Absolute fallback: highest score
  const primary = (Object.entries(graph3) as [Dimension, number][])
    .sort((a, b) => b[1] - a[1])[0][0]
  return DISC_PATTERNS.find(p => p.type === primary) || DISC_PATTERNS[0]
}

// Generate a unique 6-character alphanumeric access code
export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Validate a submitted answer set before scoring
export function validateAnswers(answers: DiscAnswers): { valid: boolean; unanswered: number[] } {
  const unanswered: number[] = []
  for (const q of DISC_QUESTIONS) {
    const ans = answers[q.no]
    if (!ans || !ans.most || !ans.least || ans.most === ans.least) {
      unanswered.push(q.no)
    }
  }
  return { valid: unanswered.length === 0, unanswered }
}
