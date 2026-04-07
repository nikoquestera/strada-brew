export type CfitChoice = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export interface CfitCrop {
  src: string
  x: number
  y: number
  width: number
  height: number
}

export interface CfitSubtest {
  id: 1 | 2 | 3 | 4
  title: string
  durationSeconds: number
  introImage: string
  introSummary: string
  answerCount: 1 | 2
  choiceLabels: CfitChoice[]
}

export interface CfitQuestion {
  id: string
  subtestId: CfitSubtest['id']
  questionNo: number
  answerCount: 1 | 2
  choices: CfitChoice[]
  correct: CfitChoice[]
  crop: CfitCrop
}

const PAGE = (name: string) => `/cfit/pages/${name}`

export const CFIT_SUBTESTS: CfitSubtest[] = [
  {
    id: 1,
    title: 'Subtes 1',
    durationSeconds: 180,
    introImage: '/cfit/intro/image1.jpg',
    introSummary: 'Melengkapi pola gambar berurutan dengan 1 jawaban terbaik.',
    answerCount: 1,
    choiceLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
  },
  {
    id: 2,
    title: 'Subtes 2',
    durationSeconds: 240,
    introImage: '/cfit/intro/image2.jpg',
    introSummary: 'Menemukan 2 gambar yang berbeda dari 3 gambar lainnya.',
    answerCount: 2,
    choiceLabels: ['A', 'B', 'C', 'D', 'E'],
  },
  {
    id: 3,
    title: 'Subtes 3',
    durationSeconds: 180,
    introImage: '/cfit/intro/image3.jpg',
    introSummary: 'Melengkapi susunan kotak berdasarkan pola dari atas atau samping.',
    answerCount: 1,
    choiceLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
  },
  {
    id: 4,
    title: 'Subtes 4',
    durationSeconds: 150,
    introImage: '/cfit/intro/image4.jpg',
    introSummary: 'Memilih bentuk gabungan yang tepat dari unsur-unsur gambar.',
    answerCount: 1,
    choiceLabels: ['A', 'B', 'C', 'D', 'E'],
  },
]

function q(
  subtestId: CfitSubtest['id'],
  questionNo: number,
  correct: string,
  crop: CfitCrop,
): CfitQuestion {
  const subtest = CFIT_SUBTESTS.find((item) => item.id === subtestId)!
  return {
    id: `S${subtestId}Q${questionNo}`,
    subtestId,
    questionNo,
    answerCount: subtest.answerCount,
    choices: subtest.choiceLabels,
    correct: correct.split('') as CfitChoice[],
    crop,
  }
}

export const CFIT_QUESTIONS: CfitQuestion[] = [
  q(1, 1, 'B', { src: PAGE('page03_01.jpg'), x: 1440, y: 40, width: 1080, height: 350 }),
  q(1, 2, 'C', { src: PAGE('page03_01.jpg'), x: 1440, y: 410, width: 1080, height: 360 }),
  q(1, 3, 'B', { src: PAGE('page03_01.jpg'), x: 1440, y: 790, width: 1080, height: 360 }),
  q(1, 4, 'D', { src: PAGE('page04_01.jpg'), x: 60, y: 40, width: 1120, height: 330 }),
  q(1, 5, 'E', { src: PAGE('page04_01.jpg'), x: 60, y: 400, width: 1120, height: 340 }),
  q(1, 6, 'B', { src: PAGE('page04_01.jpg'), x: 60, y: 760, width: 1120, height: 360 }),
  q(1, 7, 'D', { src: PAGE('page04_01.jpg'), x: 1370, y: 40, width: 1120, height: 330 }),
  q(1, 8, 'B', { src: PAGE('page04_01.jpg'), x: 1370, y: 400, width: 1120, height: 340 }),
  q(1, 9, 'F', { src: PAGE('page04_01.jpg'), x: 1370, y: 760, width: 1120, height: 360 }),
  q(1, 10, 'C', { src: PAGE('page05_01.jpg'), x: 60, y: 30, width: 1120, height: 330 }),
  q(1, 11, 'B', { src: PAGE('page05_01.jpg'), x: 60, y: 390, width: 1120, height: 340 }),
  q(1, 12, 'B', { src: PAGE('page05_01.jpg'), x: 60, y: 760, width: 1120, height: 330 }),
  q(1, 13, 'E', { src: PAGE('page05_01.jpg'), x: 1380, y: 30, width: 1040, height: 420 }),

  q(2, 1, 'BE', { src: PAGE('page07_01.jpg'), x: 1450, y: 40, width: 1020, height: 220 }),
  q(2, 2, 'AE', { src: PAGE('page07_01.jpg'), x: 1450, y: 280, width: 1020, height: 220 }),
  q(2, 3, 'AD', { src: PAGE('page07_01.jpg'), x: 1450, y: 520, width: 1020, height: 220 }),
  q(2, 4, 'CE', { src: PAGE('page07_01.jpg'), x: 1450, y: 760, width: 1020, height: 220 }),
  q(2, 5, 'BE', { src: PAGE('page07_01.jpg'), x: 1450, y: 1000, width: 1020, height: 220 }),
  q(2, 6, 'AD', { src: PAGE('page07_01.jpg'), x: 1450, y: 1240, width: 1020, height: 220 }),
  q(2, 7, 'BE', { src: PAGE('page08_01.jpg'), x: 60, y: 30, width: 1120, height: 220 }),
  q(2, 8, 'BE', { src: PAGE('page08_01.jpg'), x: 60, y: 255, width: 1120, height: 220 }),
  q(2, 9, 'AD', { src: PAGE('page08_01.jpg'), x: 60, y: 490, width: 1120, height: 220 }),
  q(2, 10, 'BD', { src: PAGE('page08_01.jpg'), x: 60, y: 730, width: 1120, height: 220 }),
  q(2, 11, 'AE', { src: PAGE('page08_01.jpg'), x: 60, y: 970, width: 1120, height: 220 }),
  q(2, 12, 'CD', { src: PAGE('page08_01.jpg'), x: 1370, y: 70, width: 1100, height: 240 }),
  q(2, 13, 'BC', { src: PAGE('page08_01.jpg'), x: 1370, y: 365, width: 1100, height: 240 }),
  q(2, 14, 'AB', { src: PAGE('page08_01.jpg'), x: 1370, y: 720, width: 1100, height: 250 }),

  q(3, 1, 'E', { src: PAGE('page10_01.jpg'), x: 1450, y: 30, width: 1030, height: 250 }),
  q(3, 2, 'E', { src: PAGE('page10_01.jpg'), x: 1450, y: 300, width: 1030, height: 250 }),
  q(3, 3, 'F', { src: PAGE('page10_01.jpg'), x: 1450, y: 565, width: 1030, height: 250 }),
  q(3, 4, 'B', { src: PAGE('page10_01.jpg'), x: 1450, y: 830, width: 1030, height: 250 }),
  q(3, 5, 'C', { src: PAGE('page10_01.jpg'), x: 1450, y: 1095, width: 1030, height: 250 }),
  q(3, 6, 'D', { src: PAGE('page11_01.jpg'), x: 60, y: 25, width: 1120, height: 220 }),
  q(3, 7, 'E', { src: PAGE('page11_01.jpg'), x: 60, y: 255, width: 1120, height: 220 }),
  q(3, 8, 'E', { src: PAGE('page11_01.jpg'), x: 60, y: 485, width: 1120, height: 220 }),
  q(3, 9, 'A', { src: PAGE('page11_01.jpg'), x: 60, y: 720, width: 1120, height: 220 }),
  q(3, 10, 'A', { src: PAGE('page11_01.jpg'), x: 60, y: 955, width: 1120, height: 220 }),
  q(3, 11, 'F', { src: PAGE('page11_01.jpg'), x: 1380, y: 35, width: 1040, height: 260 }),
  q(3, 12, 'C', { src: PAGE('page11_01.jpg'), x: 1380, y: 345, width: 1040, height: 260 }),
  q(3, 13, 'C', { src: PAGE('page11_01.jpg'), x: 1380, y: 650, width: 1040, height: 260 }),

  q(4, 1, 'B', { src: PAGE('page13_01.jpg'), x: 1450, y: 20, width: 1020, height: 240 }),
  q(4, 2, 'A', { src: PAGE('page13_01.jpg'), x: 1450, y: 275, width: 1020, height: 240 }),
  q(4, 3, 'D', { src: PAGE('page13_01.jpg'), x: 1450, y: 530, width: 1020, height: 240 }),
  q(4, 4, 'D', { src: PAGE('page13_01.jpg'), x: 1450, y: 785, width: 1020, height: 240 }),
  q(4, 5, 'A', { src: PAGE('page13_01.jpg'), x: 1450, y: 1040, width: 1020, height: 240 }),
  q(4, 6, 'B', { src: PAGE('page14_01.jpg'), x: 70, y: 25, width: 1120, height: 220 }),
  q(4, 7, 'C', { src: PAGE('page14_01.jpg'), x: 70, y: 255, width: 1120, height: 220 }),
  q(4, 8, 'D', { src: PAGE('page14_01.jpg'), x: 70, y: 485, width: 1120, height: 220 }),
  q(4, 9, 'A', { src: PAGE('page14_01.jpg'), x: 70, y: 715, width: 1120, height: 220 }),
  q(4, 10, 'D', { src: PAGE('page14_01.jpg'), x: 70, y: 945, width: 1120, height: 240 }),
]

export const CFIT_TOTAL_POINTS = CFIT_QUESTIONS.length

export const CFIT_BY_ID = Object.fromEntries(CFIT_QUESTIONS.map((question) => [question.id, question]))
