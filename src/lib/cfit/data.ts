export type CfitChoice = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export interface CfitVisual {
  mode: 'single' | 'stacked'
  src?: string
  promptSrc?: string
  optionsSrc?: string
}

export interface CfitSubtest {
  id: 1 | 2 | 3 | 4
  title: string
  durationSeconds: number
  introSummary: string
  answerCount: 1 | 2
  choiceLabels: CfitChoice[]
  instructionParagraphs: string[]
  exampleAnswersSummary: string
  exampleVisual: CfitVisual
}

export interface CfitQuestion {
  id: string
  subtestId: CfitSubtest['id']
  questionNo: number
  answerCount: 1 | 2
  choices: CfitChoice[]
  correct: CfitChoice[]
  visual: CfitVisual
}

const ASSET = (name: string) => `/cfit/assets/${encodeURIComponent(name)}`

function questionVisual(subtestId: 1 | 3 | 4, questionNo: number): CfitVisual {
  return {
    mode: 'stacked',
    promptSrc: ASSET(`subtes${subtestId}_q${questionNo}.png`),
    optionsSrc: ASSET(`subtes${subtestId}_options_q${questionNo}.png`),
  }
}

function singleVisual(src: string): CfitVisual {
  return {
    mode: 'single',
    src,
  }
}

export const CFIT_SUBTESTS: CfitSubtest[] = [
  {
    id: 1,
    title: 'Subtes 1',
    durationSeconds: 180,
    introSummary: 'Melengkapi pola gambar berurutan dengan 1 jawaban terbaik.',
    answerCount: 1,
    choiceLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
    instructionParagraphs: [
      'Pada setiap soal, Anda akan melihat empat kotak. Tiga kotak pertama membentuk urutan gambar, sedangkan kotak terakhir kosong.',
      'Tugas Anda adalah memilih satu jawaban dari pilihan a sampai f untuk melengkapi kotak yang kosong. Gunakan pola perubahan gambar dari kiri ke kanan sebagai petunjuk.',
      'Perhatikan contoh terlebih dahulu. Setelah Anda siap, klik tombol mulai agar timer Subtes 1 berjalan.',
    ],
    exampleAnswersSummary: 'Contoh jawaban benar berturut-turut adalah c, e, dan e.',
    exampleVisual: singleVisual(ASSET('Contoh subtes 1.png')),
  },
  {
    id: 2,
    title: 'Subtes 2',
    durationSeconds: 240,
    introSummary: 'Menemukan 2 gambar yang berbeda dari 3 gambar lainnya.',
    answerCount: 2,
    choiceLabels: ['A', 'B', 'C', 'D', 'E'],
    instructionParagraphs: [
      'Pada setiap soal, Anda akan melihat lima gambar. Tiga gambar memiliki pola yang sama, sedangkan dua gambar berbeda dari tiga gambar lainnya.',
      'Tugas Anda adalah menemukan tepat dua jawaban yang berbeda tersebut. Karena itu, setiap soal di Subtes 2 selalu memiliki dua jawaban.',
      'Perhatikan contoh terlebih dahulu. Klik mulai hanya ketika Anda benar-benar siap mengerjakan.',
    ],
    exampleAnswersSummary: 'Contoh jawaban benar adalah b dan d untuk contoh pertama, lalu c dan e untuk contoh berikutnya.',
    exampleVisual: singleVisual(ASSET('Contoh subtes 2.png')),
  },
  {
    id: 3,
    title: 'Subtes 3',
    durationSeconds: 180,
    introSummary: 'Melengkapi susunan kotak berdasarkan pola dari atas atau samping.',
    answerCount: 1,
    choiceLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
    instructionParagraphs: [
      'Pada setiap soal, Anda akan melihat satu kotak besar yang dibagi menjadi empat kotak kecil. Tiga kotak berisi gambar, dan satu kotak masih kosong.',
      'Tugas Anda adalah memilih satu jawaban yang paling tepat untuk mengisi kotak kosong. Pola bisa dibaca dari kotak di samping atau dari kotak di atas.',
      'Perhatikan contoh terlebih dahulu. Setelah siap, mulai subtes agar timer berjalan.',
    ],
    exampleAnswersSummary: 'Contoh jawaban benar berturut-turut adalah b, c, dan f.',
    exampleVisual: singleVisual(ASSET('Contoh subtes 3.png')),
  },
  {
    id: 4,
    title: 'Subtes 4',
    durationSeconds: 150,
    introSummary: 'Memilih bentuk gabungan yang tepat dari unsur-unsur gambar.',
    answerCount: 1,
    choiceLabels: ['A', 'B', 'C', 'D', 'E'],
    instructionParagraphs: [
      'Kotak paling kiri adalah soal, sedangkan kotak a sampai e adalah pilihan jawabannya. Fokus utama Anda adalah posisi titik terhadap bentuk-bentuk pada soal.',
      'Untuk setiap soal, pilih satu jawaban yang menempatkan titik pada posisi yang sama seperti pada gambar soal. Di contoh pertama titik tampak langsung, sedangkan pada soal berikutnya Anda perlu membayangkan posisinya.',
      'Perhatikan contoh terlebih dahulu. Klik mulai ketika Anda sudah siap mengerjakan Subtes 4.',
    ],
    exampleAnswersSummary: 'Contoh jawaban benar berturut-turut adalah c, d, dan b.',
    exampleVisual: singleVisual(ASSET('Contoh subtes 4.png')),
  },
]

function q(
  subtestId: CfitSubtest['id'],
  questionNo: number,
  correct: string,
): CfitQuestion {
  const subtest = CFIT_SUBTESTS.find((item) => item.id === subtestId)!
  const visual =
    subtestId === 2
      ? singleVisual(ASSET(`subtes2_q${questionNo}.png`))
      : questionVisual(subtestId as 1 | 3 | 4, questionNo)

  return {
    id: `S${subtestId}Q${questionNo}`,
    subtestId,
    questionNo,
    answerCount: subtest.answerCount,
    choices: subtest.choiceLabels,
    correct: correct.split('') as CfitChoice[],
    visual,
  }
}

export const CFIT_QUESTIONS: CfitQuestion[] = [
  q(1, 1, 'B'),
  q(1, 2, 'C'),
  q(1, 3, 'B'),
  q(1, 4, 'D'),
  q(1, 5, 'E'),
  q(1, 6, 'B'),
  q(1, 7, 'D'),
  q(1, 8, 'B'),
  q(1, 9, 'F'),
  q(1, 10, 'C'),
  q(1, 11, 'B'),
  q(1, 12, 'B'),
  q(1, 13, 'E'),

  q(2, 1, 'BE'),
  q(2, 2, 'AE'),
  q(2, 3, 'AD'),
  q(2, 4, 'CE'),
  q(2, 5, 'BE'),
  q(2, 6, 'AD'),
  q(2, 7, 'BE'),
  q(2, 8, 'BE'),
  q(2, 9, 'AD'),
  q(2, 10, 'BD'),
  q(2, 11, 'AE'),
  q(2, 12, 'CD'),
  q(2, 13, 'BC'),
  q(2, 14, 'AB'),

  q(3, 1, 'E'),
  q(3, 2, 'E'),
  q(3, 3, 'F'),
  q(3, 4, 'B'),
  q(3, 5, 'C'),
  q(3, 6, 'D'),
  q(3, 7, 'E'),
  q(3, 8, 'E'),
  q(3, 9, 'A'),
  q(3, 10, 'A'),
  q(3, 11, 'F'),
  q(3, 12, 'C'),
  q(3, 13, 'C'),

  q(4, 1, 'B'),
  q(4, 2, 'A'),
  q(4, 3, 'D'),
  q(4, 4, 'D'),
  q(4, 5, 'A'),
  q(4, 6, 'B'),
  q(4, 7, 'C'),
  q(4, 8, 'D'),
  q(4, 9, 'A'),
  q(4, 10, 'D'),
]

export const CFIT_TOTAL_POINTS = CFIT_QUESTIONS.length

export const CFIT_BY_ID = Object.fromEntries(CFIT_QUESTIONS.map((question) => [question.id, question]))
