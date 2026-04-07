import { DISC_QUESTIONS, DISC_PATTERNS, DISC_SCORING_TABLE, Dimension, DiscPattern, DiscResultRow } from './data'

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
  // Normalized values for plotting (-8 to +8)
  plot1: DiscRawScores
  plot2: DiscRawScores
  plot3: DiscRawScores
  primaryType: Dimension
  secondaryTypes: Dimension[]
  patternKey: string
  pattern: DiscPattern        // Graph III — kepribadian asli (primary)
  pattern1: DiscPattern       // Graph I  — kepribadian di muka umum
  pattern2: DiscPattern       // Graph II — kepribadian saat mendapat tekanan
}

const DIMS: Dimension[] = ['D', 'I', 'S', 'C']

function getPlotValues(raw: DiscRawScores, line: number): DiscRawScores {
  const plot: DiscRawScores = { D: 0, I: 0, S: 0, C: 0 }
  for (const d of DIMS) {
    const val = raw[d]
    const row = DISC_SCORING_TABLE.find(r => r.line === line && r.value === val)
    if (row) {
      plot[d] = (row as any)[d.toLowerCase()]
    }
  }
  return plot
}

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

  const plot1 = getPlotValues(graph1, 1)
  const plot2 = getPlotValues(graph2, 2)
  const plot3 = getPlotValues(graph3, 3)

  // Patterns are determined by the NORMALIZED plot values, as per reference_result.php
  const pattern1 = findPatternByPlot(plot1)
  const pattern2 = findPatternByPlot(plot2)
  const pattern3 = findPatternByPlot(plot3)

  const ranked = DIMS.slice().sort((a, b) => plot3[b] - plot3[a])
  const primaryType = ranked[0]
  const secondaryTypes = ranked.slice(1).filter(d => plot3[d] > 0)

  return { 
    graph1, graph2, graph3, 
    plot1, plot2, plot3,
    primaryType, secondaryTypes, 
    patternKey: pattern3.type,
    pattern: pattern3, 
    pattern1, 
    pattern2 
  }
}

/**
 * Ported logic from getPattern in reference_result.php
 */
function findPatternByPlot(plot: DiscRawScores): DiscPattern {
  const { D, I, S, C } = plot
  let pIdx = 0

  if(D<=0 && I<=0 && S<=0 && C>0) pIdx=1;
  else if(D>0 && I<=0 && S<=0 && C<=0) pIdx=2;
  else if(D>0 && I<=0 && S<=0 && C>0 && C>=D) pIdx=3;
  else if(D>0 && I>0 && S<=0 && C<=0 && I>=D) pIdx=4;
  else if(D>0 && I>0 && S<=0 && C>0 && I>=D && D>=C) pIdx=5;
  else if(D>0 && I>0 && S>0 && C<=0 && I>=D && D>=S) pIdx=6;
  else if(D>0 && I>0 && S>0 && C<=0 && I>=S && S>=D) pIdx=7;
  else if(D>0 && I<=0 && S>0 && C>0 && S>=D && D>=C) pIdx=8;
  else if(D>0 && I>0 && S<=0 && C<=0 && D>=I) pIdx=9;
  else if(D>0 && I>0 && S>0 && C<=0 && D>=I && I>=S) pIdx=10;
  else if(D>0 && I<=0 && S>0 && C<=0 && D>=S) pIdx=11;
  else if(D<=0 && I>0 && S>0 && C>0 && C>=I && I>=S) pIdx=12;
  else if(D<=0 && I>0 && S>0 && C>0 && C>=S && S>=I) pIdx=13;
  else if(D<=0 && I>0 && S>0 && C>0 && I>=S && I>=C) pIdx=14;
  else if(D<=0 && I<=0 && S>0 && C<=0) pIdx=15;
  else if(D<=0 && I<=0 && S>0 && C>0 && C>=S) pIdx=16;
  else if(D<=0 && I<=0 && S>0 && C>0 && S>=C) pIdx=17;
  else if(D>0 && I<=0 && S<=0 && C>0 && D>=C) pIdx=18;
  else if(D>0 && I>0 && S<=0 && C>0 && D>=I && I>=C) pIdx=19;
  else if(D>0 && I>0 && S>0 && C<=0 && D>=S && S>=I) pIdx=20;
  else if(D>0 && I<=0 && S>0 && C>0 && D>=S && S>=C) pIdx=21;
  else if(D>0 && I>0 && S<=0 && C>0 && D>=C && C>=I) pIdx=22;
  else if(D>0 && I<=0 && S>0 && C>0 && D>=C && C>=S) pIdx=23;
  else if(D<=0 && I>0 && S<=0 && C<=0) pIdx=24;
  else if(D<=0 && I>0 && S>0 && C<=0 && I>=S) pIdx=25;
  else if(D<=0 && I>0 && S<=0 && C>0 && I>=C) pIdx=26;
  else if(D>0 && I>0 && S<=0 && C>0 && I>=C && C>=D) pIdx=27;
  else if(D<=0 && I>0 && S>0 && C>0 && I>=C && C>=S) pIdx=28;
  else if(D>0 && I<=0 && S>0 && C<=0 && S>=D) pIdx=29;
  else if(D<=0 && I>0 && S>0 && C<=0 && S>=I) pIdx=30;
  else if(D>0 && I>0 && S>0 && C<=0 && S>=D && D>=I) pIdx=31;
  else if(D>0 && I>0 && S>0 && C<=0 && S>=I && I>=D) pIdx=32;
  else if(D<=0 && I>0 && S>0 && C>0 && S>=I && I>=C) pIdx=33;
  else if(D>0 && I<=0 && S>0 && C>0 && S>=C && C>=D) pIdx=34;
  else if(D<=0 && I>0 && S>0 && C>0 && S>=C && C>=I) pIdx=35;
  else if(D<=0 && I>0 && S<=0 && C>0 && C>=I) pIdx=36;
  else if(D>0 && I>0 && S<=0 && C>0 && C>=D && D>=I) pIdx=37;
  else if(D>0 && I<=0 && S>0 && C>0 && C>=D && D>=S) pIdx=38;
  else if(D>0 && I>0 && S<=0 && C>0 && C>=I && I>=D) pIdx=39;
  else if(D>0 && I<=0 && S>0 && C>0 && C>=S && S>=D) pIdx=40;

  return DISC_PATTERNS[pIdx - 1] || DISC_PATTERNS[0]
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
