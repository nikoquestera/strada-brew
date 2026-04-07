import { CFIT_BY_ID, CFIT_QUESTIONS, CFIT_TOTAL_POINTS, CfitChoice } from './data'

export type CfitAnswers = Record<string, CfitChoice[]>

export interface CfitScoreResult {
  score: number
  totalPoints: number
  percentage: number
  perQuestion: Array<{
    id: string
    submitted: CfitChoice[]
    correct: CfitChoice[]
    isCorrect: boolean
  }>
}

function normalize(values: CfitChoice[]) {
  return [...values].sort().join('')
}

export function isQuestionAnswered(questionId: string, answers: CfitAnswers) {
  const question = CFIT_BY_ID[questionId]
  if (!question) return false
  return (answers[questionId] || []).length === question.answerCount
}

export function scoreCfitAnswers(answers: CfitAnswers): CfitScoreResult {
  const perQuestion = CFIT_QUESTIONS.map((question) => {
    const submitted = (answers[question.id] || []).slice(0, question.answerCount)
    const isCorrect = normalize(submitted) === normalize(question.correct)
    return {
      id: question.id,
      submitted,
      correct: question.correct,
      isCorrect,
    }
  })

  const score = perQuestion.filter((item) => item.isCorrect).length

  return {
    score,
    totalPoints: CFIT_TOTAL_POINTS,
    percentage: Math.round((score / CFIT_TOTAL_POINTS) * 100),
    perQuestion,
  }
}
