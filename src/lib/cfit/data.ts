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
  introSummary: string
  answerCount: 1 | 2
  choiceLabels: CfitChoice[]
  instructionParagraphs: string[]
  exampleAnswersSummary: string
  exampleCrop: CfitCrop
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
    introSummary: 'Melengkapi pola gambar berurutan dengan 1 jawaban terbaik.',
    answerCount: 1,
    choiceLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
    instructionParagraphs: [
      'Pada setiap soal, Anda akan melihat empat kotak. Tiga kotak pertama membentuk urutan gambar, sedangkan kotak terakhir kosong.',
      'Tugas Anda adalah memilih satu jawaban dari pilihan a sampai f untuk melengkapi kotak yang kosong. Gunakan pola perubahan gambar dari kiri ke kanan sebagai petunjuk.',
      'Pada contoh di bawah, jawaban yang benar berturut-turut adalah c, e, dan e. Setelah Anda siap, klik tombol mulai agar timer Subtes 1 berjalan.',
    ],
    exampleAnswersSummary: 'Contoh jawaban: c, e, dan e.',
    exampleCrop: { src: PAGE('page02_01.jpg'), x: 1360, y: 40, width: 1120, height: 1500 },
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
      'Pada contoh di bawah, pasangan jawaban yang benar adalah b dan d untuk contoh pertama, lalu c dan e untuk contoh berikutnya. Klik mulai ketika Anda benar-benar siap.',
    ],
    exampleAnswersSummary: 'Contoh jawaban: b dan d, lalu c dan e.',
    exampleCrop: { src: PAGE('page06_01.jpg'), x: 1360, y: 60, width: 1120, height: 1380 },
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
      'Pada contoh di bawah, jawaban yang benar berturut-turut adalah b, c, dan f. Setelah siap, mulai subtes agar timer berjalan.',
    ],
    exampleAnswersSummary: 'Contoh jawaban: b, c, dan f.',
    exampleCrop: { src: PAGE('page09_01.jpg'), x: 1360, y: 45, width: 1120, height: 1500 },
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
      'Pada contoh di bawah, jawaban yang benar berturut-turut adalah c, d, dan b. Klik mulai ketika Anda sudah siap mengerjakan Subtes 4.',
    ],
    exampleAnswersSummary: 'Contoh jawaban: c, d, dan b.',
    exampleCrop: { src: PAGE('page12_01.jpg'), x: 1360, y: 40, width: 1120, height: 1500 },
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
  q(1, 1, 'B', { src: PAGE('page03_01.jpg'), x: 1420, y: 110, width: 1080, height: 430 }),
  q(1, 2, 'C', { src: PAGE('page03_01.jpg'), x: 1420, y: 500, width: 1080, height: 430 }),
  q(1, 3, 'B', { src: PAGE('page03_01.jpg'), x: 1420, y: 890, width: 1080, height: 430 }),
  q(1, 4, 'D', { src: PAGE('page04_01.jpg'), x: 40, y: 50, width: 1120, height: 360 }),
  q(1, 5, 'E', { src: PAGE('page04_01.jpg'), x: 40, y: 420, width: 1120, height: 360 }),
  q(1, 6, 'B', { src: PAGE('page04_01.jpg'), x: 40, y: 790, width: 1120, height: 360 }),
  q(1, 7, 'D', { src: PAGE('page04_01.jpg'), x: 1360, y: 50, width: 1120, height: 360 }),
  q(1, 8, 'B', { src: PAGE('page04_01.jpg'), x: 1360, y: 420, width: 1120, height: 360 }),
  q(1, 9, 'F', { src: PAGE('page04_01.jpg'), x: 1360, y: 790, width: 1120, height: 360 }),
  q(1, 10, 'C', { src: PAGE('page05_01.jpg'), x: 40, y: 45, width: 1120, height: 360 }),
  q(1, 11, 'B', { src: PAGE('page05_01.jpg'), x: 40, y: 420, width: 1120, height: 360 }),
  q(1, 12, 'B', { src: PAGE('page05_01.jpg'), x: 40, y: 795, width: 1120, height: 360 }),
  q(1, 13, 'E', { src: PAGE('page05_01.jpg'), x: 1360, y: 45, width: 1090, height: 520 }),

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

  q(3, 1, 'E', { src: PAGE('page10_01.jpg'), x: 1430, y: 40, width: 1050, height: 430 }),
  q(3, 2, 'E', { src: PAGE('page10_01.jpg'), x: 1430, y: 325, width: 1050, height: 430 }),
  q(3, 3, 'F', { src: PAGE('page10_01.jpg'), x: 1430, y: 610, width: 1050, height: 430 }),
  q(3, 4, 'B', { src: PAGE('page10_01.jpg'), x: 1430, y: 895, width: 1050, height: 430 }),
  q(3, 5, 'C', { src: PAGE('page10_01.jpg'), x: 1430, y: 1180, width: 1050, height: 430 }),
  q(3, 6, 'D', { src: PAGE('page11_01.jpg'), x: 40, y: 30, width: 1140, height: 390 }),
  q(3, 7, 'E', { src: PAGE('page11_01.jpg'), x: 40, y: 270, width: 1140, height: 390 }),
  q(3, 8, 'E', { src: PAGE('page11_01.jpg'), x: 40, y: 510, width: 1140, height: 390 }),
  q(3, 9, 'A', { src: PAGE('page11_01.jpg'), x: 40, y: 750, width: 1140, height: 390 }),
  q(3, 10, 'A', { src: PAGE('page11_01.jpg'), x: 40, y: 990, width: 1140, height: 390 }),
  q(3, 11, 'F', { src: PAGE('page11_01.jpg'), x: 1360, y: 40, width: 1080, height: 390 }),
  q(3, 12, 'C', { src: PAGE('page11_01.jpg'), x: 1360, y: 355, width: 1080, height: 390 }),
  q(3, 13, 'C', { src: PAGE('page11_01.jpg'), x: 1360, y: 670, width: 1080, height: 390 }),

  q(4, 1, 'B', { src: PAGE('page13_01.jpg'), x: 1435, y: 40, width: 1045, height: 360 }),
  q(4, 2, 'A', { src: PAGE('page13_01.jpg'), x: 1435, y: 305, width: 1045, height: 360 }),
  q(4, 3, 'D', { src: PAGE('page13_01.jpg'), x: 1435, y: 570, width: 1045, height: 360 }),
  q(4, 4, 'D', { src: PAGE('page13_01.jpg'), x: 1435, y: 835, width: 1045, height: 360 }),
  q(4, 5, 'A', { src: PAGE('page13_01.jpg'), x: 1435, y: 1100, width: 1045, height: 360 }),
  q(4, 6, 'B', { src: PAGE('page14_01.jpg'), x: 50, y: 35, width: 1140, height: 360 }),
  q(4, 7, 'C', { src: PAGE('page14_01.jpg'), x: 50, y: 275, width: 1140, height: 360 }),
  q(4, 8, 'D', { src: PAGE('page14_01.jpg'), x: 50, y: 515, width: 1140, height: 360 }),
  q(4, 9, 'A', { src: PAGE('page14_01.jpg'), x: 50, y: 755, width: 1140, height: 360 }),
  q(4, 10, 'D', { src: PAGE('page14_01.jpg'), x: 50, y: 995, width: 1140, height: 360 }),
]

export const CFIT_TOTAL_POINTS = CFIT_QUESTIONS.length

export const CFIT_BY_ID = Object.fromEntries(CFIT_QUESTIONS.map((question) => [question.id, question]))
