import { DISC_DIMENSIONS, Dimension } from './data'
import { DiscRawScores, DiscResults } from './scorer'

interface ApplicantContext {
  full_name?: string | null
  position_applied?: string | null
  outlet_preference?: string | null
}

interface StyleReference {
  adjectives: string[]
  summary: string
  strengths: string[]
  limitations: string[]
  growth: string[]
  teamValue: string[]
  teamCaution: string
  relateTo: string[]
}

export interface DiscReportCopy {
  overviewTitle: string
  overview: string
  applicantExplanation: string
  fitSummary: string
  workStyle: string[]
  strengths: string[]
  blindSpots: string[]
  motivators: string[]
  communication: string[]
  management: string[]
  graphExplanations: Array<{ title: string; summary: string }>
}

const DIMS: Dimension[] = ['D', 'I', 'S', 'C']

const STYLE_REFERENCE: Record<Dimension, StyleReference> = {
  D: {
    adjectives: ['driving', 'determined', 'decisive', 'direct', 'result-oriented'],
    summary: 'gaya yang aktif, tegas, cepat bergerak, dan cenderung fokus pada hasil serta kontrol situasi',
    strengths: [
      'Cenderung mendorong tim maju, berani menghadapi tantangan, dan nyaman mengambil keputusan.',
      'Biasanya mampu melihat gambaran besar serta menjaga fokus pada target.',
      'Sering efektif dalam situasi cepat, ambigu, atau penuh tekanan.',
    ],
    limitations: [
      'Dapat terlalu dominan, keras, atau kurang peka terhadap masukan orang lain.',
      'Berisiko menyepelekan risiko, detail, atau proses jika target terasa lebih mendesak.',
      'Cenderung tidak sabar terhadap ritme kerja yang lambat atau bertele-tele.',
    ],
    growth: [
      'Perlu lebih aktif mendengar dan memberi ruang pada ide orang lain.',
      'Perlu menjelaskan alasan di balik instruksi, bukan hanya menuntut hasil.',
      'Perlu lebih sadar dampak gaya komunikasi terhadap relasi kerja.',
    ],
    teamValue: [
      'Kuat untuk mendorong keputusan dan menjaga momentum kerja.',
      'Baik saat tim membutuhkan keberanian, arah, dan sense of urgency.',
      'Sering tampil sebagai pendorong hasil dan pemecah hambatan.',
    ],
    teamCaution: 'Saat menganalisis masalah, gaya D bisa terlalu cepat melangkah sebelum semua pro-kontra dan opini tim dibahas tuntas.',
    relateTo: [
      'Komunikasi paling efektif jika singkat, langsung, berbasis fakta, dan jelas targetnya.',
      'Diskusi dengan gaya ini lebih mudah berjalan jika fokus pada hasil, opsi tindakan, dan keputusan.',
    ],
  },
  I: {
    adjectives: ['outgoing', 'persuasive', 'enthusiastic', 'optimistic', 'people-oriented'],
    summary: 'gaya yang aktif, ekspresif, persuasif, dan cenderung menggerakkan orang lewat energi sosial',
    strengths: [
      'Mudah membangun antusiasme, mencairkan suasana, dan mempengaruhi orang lain.',
      'Sering kuat dalam komunikasi, persuasi, dan penyampaian ide secara verbal.',
      'Biasanya adaptif terhadap orang baru dan situasi yang dinamis.',
    ],
    limitations: [
      'Dapat kehilangan fokus pada detail, follow-through, atau prioritas yang paling penting.',
      'Berisiko terlalu impulsif, terlalu optimistis, atau terlalu mencari penerimaan.',
      'Kadang lebih kuat pada impresi dan relasi dibanding akurasi eksekusi.',
    ],
    growth: [
      'Perlu lebih disiplin terhadap detail, fakta, dan penyelesaian tugas sampai selesai.',
      'Perlu menahan impuls untuk terlalu cepat berbicara atau memutuskan.',
      'Perlu menyeimbangkan antusiasme dengan konsistensi tindakan.',
    ],
    teamValue: [
      'Kuat dalam membangun semangat tim dan menjaga energi interpersonal.',
      'Baik untuk persuasi, presentasi, relasi pelanggan, dan brainstorming.',
      'Sering membantu tim tetap positif saat perubahan terjadi.',
    ],
    teamCaution: 'Saat menganalisis informasi, gaya I bisa melewatkan fakta penting, memotong pembicaraan, atau terlalu cepat berpindah fokus.',
    relateTo: [
      'Komunikasi paling efektif jika hangat, interaktif, dan memberi ruang untuk bertukar ide.',
      'Arahkan pembicaraan kembali ke prioritas, detail, dan tindak lanjut konkret agar energinya tidak menyebar.',
    ],
  },
  S: {
    adjectives: ['steady', 'stable', 'patient', 'supportive', 'relationship-oriented'],
    summary: 'gaya yang lebih stabil, suportif, konsisten, dan berusaha menjaga harmoni hubungan kerja',
    strengths: [
      'Biasanya dapat diandalkan, loyal, sabar, dan baik dalam menjaga stabilitas tim.',
      'Kuat dalam follow-through, dukungan interpersonal, dan ritme kerja yang konsisten.',
      'Sering membuat orang lain merasa diterima dan aman bekerja bersama.',
    ],
    limitations: [
      'Dapat terlalu menghindari konflik, perubahan, atau keputusan yang terasa konfrontatif.',
      'Berisiko menahan pendapat, tampak setuju di luar tetapi sebenarnya belum menerima.',
      'Kadang mengorbankan kecepatan atau hasil demi menjaga kenyamanan relasi.',
    ],
    growth: [
      'Perlu lebih terbuka terhadap perubahan dan lebih langsung saat menyampaikan pendapat.',
      'Perlu meningkatkan inisiatif dan keberanian menghadapi percakapan sulit.',
      'Perlu lebih ekspresif dalam menyampaikan ide, keberatan, dan kebutuhan.',
    ],
    teamValue: [
      'Kuat sebagai penyeimbang tim dan penjaga hubungan kerja yang sehat.',
      'Baik dalam menciptakan rasa aman, kerja sama, dan dependability.',
      'Sering konsisten menjaga kontinuitas operasional dan loyalitas tim.',
    ],
    teamCaution: 'Saat menganalisis situasi, gaya S bisa tampak setuju di depan, tetapi menyimpan keraguan dan lambat memberi feedback kritis.',
    relateTo: [
      'Komunikasi paling efektif jika tenang, tulus, dan menunjukkan perhatian personal.',
      'Perubahan sebaiknya dijelaskan dengan alasan yang jelas dan risiko yang minim.',
    ],
  },
  C: {
    adjectives: ['careful', 'systematic', 'analytical', 'precise', 'quality-oriented'],
    summary: 'gaya yang lebih hati-hati, logis, sistematis, dan berfokus pada akurasi serta standard',
    strengths: [
      'Kuat dalam analisis, organisasi, quality control, dan pemikiran logis.',
      'Biasanya teliti, konsisten, dan menjaga mutu kerja tetap tinggi.',
      'Sering efektif untuk troubleshooting, evaluasi, dan penyusunan sistem.',
    ],
    limitations: [
      'Dapat terlalu berhati-hati, lambat memutuskan, atau terjebak di detail.',
      'Berisiko terlalu kritis terhadap metode orang lain atau terlalu terikat prosedur.',
      'Kadang lebih fokus pada ketepatan daripada kecepatan dan fleksibilitas.',
    ],
    growth: [
      'Perlu lebih cepat merespons dan lebih berani mengambil keputusan saat data cukup.',
      'Perlu fokus pada prioritas besar, bukan hanya detail teknis.',
      'Perlu lebih membangun relasi dan tidak hanya bertumpu pada fakta.',
    ],
    teamValue: [
      'Kuat dalam membangun sistem, menjaga standard, dan mengevaluasi kualitas kerja.',
      'Baik dalam menilai risiko, menata proses, dan menanyakan hal penting.',
      'Sering menjadi penyeimbang ketika tim terlalu spontan atau tidak terstruktur.',
    ],
    teamCaution: 'Saat menganalisis informasi, gaya C bisa terlalu konservatif, terlalu lama menimbang, dan menunda keputusan karena risiko terasa tinggi.',
    relateTo: [
      'Komunikasi paling efektif jika rapi, spesifik, sistematis, dan berbasis data.',
      'Diskusi akan lebih kuat bila menjelaskan pro-kontra, bukti, dan langkah kerja secara jelas.',
    ],
  },
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items))
}

function getLeadDimension(scores: DiscRawScores): Dimension {
  return DIMS.slice().sort((a, b) => scores[b] - scores[a])[0]
}

function describeOrientation(dim: Dimension) {
  if (dim === 'D') return 'aktif dan berorientasi tugas'
  if (dim === 'I') return 'aktif dan berorientasi orang'
  if (dim === 'S') return 'lebih tenang dan berorientasi orang'
  return 'lebih tenang dan berorientasi tugas'
}

function formatApplicant(applicant?: ApplicantContext | null) {
  return applicant?.full_name?.trim() || 'Kandidat'
}

function formatRole(applicant?: ApplicantContext | null) {
  const role = applicant?.position_applied?.trim()
  const outlet = applicant?.outlet_preference?.trim()
  if (role && outlet) return `${role} di ${outlet}`
  return role || outlet || 'posisi yang dilamar'
}

export function buildDiscReportCopy(results: DiscResults, applicant?: ApplicantContext | null): DiscReportCopy {
  const applicantName = formatApplicant(applicant)
  const role = formatRole(applicant)

  const adaptedLead = getLeadDimension(results.plot1)
  const naturalLead = getLeadDimension(results.plot2)
  const integratedLead = getLeadDimension(results.plot3)

  const adaptedRef = STYLE_REFERENCE[adaptedLead]
  const naturalRef = STYLE_REFERENCE[naturalLead]
  const integratedRef = STYLE_REFERENCE[integratedLead]

  const sameAdaptation = adaptedLead === naturalLead
  const adaptationSentence = sameAdaptation
    ? `${applicantName} tampak relatif konsisten antara gaya yang ditampilkan di lingkungan kerja dan kecenderungan alaminya.`
    : `${applicantName} tampak melakukan penyesuaian perilaku: yang lebih terlihat di lingkungan kerja adalah gaya ${adaptedLead}, sementara kecenderungan yang lebih natural mengarah ke ${naturalLead}.`

  const integratedPattern = results.pattern?.pattern || integratedLead
  const activeDims = [results.primaryType, ...results.secondaryTypes]
    .map((dim) => `${dim} (${DISC_DIMENSIONS[dim].label})`)
    .join(', ')

  const overviewTitle = `${integratedPattern} • ${activeDims}`
  const overview = `${applicantName} terutama terbaca sebagai profil ${describeOrientation(integratedLead)}. Berdasarkan kerangka pada DISC PDF, gaya ${integratedLead} biasanya menunjukkan ${integratedRef.summary}.`
  const applicantExplanation = `${adaptationSentence} Pada konteks rekrutmen untuk ${role}, pembacaan yang paling penting adalah membedakan gaya yang sedang diadaptasi terhadap tuntutan situasi dengan gaya yang lebih natural saat kandidat tidak terlalu menyesuaikan diri.`
  const fitSummary = `Interpretasi ini sebaiknya dipakai sebagai bahan interview lanjutan, bukan keputusan final tunggal. Fungsi DISC adalah membantu HR membaca kecenderungan perilaku, cara kandidat berinteraksi, area kekuatan, dan area risiko dalam konteks kerja.`

  const workStyle = uniqueStrings([
    `Graph I menunjukkan gaya yang cenderung muncul ketika kandidat merasa ada ekspektasi lingkungan: ${adaptedRef.summary}.`,
    `Graph II menunjukkan kecenderungan yang lebih natural: ${naturalRef.summary}.`,
    `Graph III dipakai sebagai ringkasan integrasi pola perilaku, sehingga narasi utama di report ini mengikuti gaya ${integratedLead}.`,
    sameAdaptation
      ? `Karena gaya adaptif dan gaya natural relatif searah, perilaku kandidat kemungkinan terasa cukup konsisten lintas situasi.`
      : `Karena gaya adaptif dan natural berbeda, HR perlu mengecek apakah penyesuaian ini sehat dan fungsional, atau justru menimbulkan kelelahan/pergeseran perilaku saat tekanan naik.`,
  ])

  const strengths = uniqueStrings([
    ...integratedRef.strengths,
    ...naturalRef.teamValue.slice(0, 1),
  ]).slice(0, 4)

  const blindSpots = uniqueStrings([
    ...integratedRef.limitations,
    naturalRef.teamCaution,
  ]).slice(0, 4)

  const motivators = uniqueStrings([
    adaptedLead === 'D' ? 'Target yang jelas, ruang mengambil keputusan, dan tantangan yang nyata.' : '',
    adaptedLead === 'I' ? 'Ruang berinteraksi, pengakuan, dan suasana kerja yang hidup.' : '',
    adaptedLead === 'S' ? 'Stabilitas, ritme kerja yang dapat diprediksi, dan hubungan kerja yang aman.' : '',
    adaptedLead === 'C' ? 'Standard yang jelas, proses yang rapi, dan ekspektasi mutu yang spesifik.' : '',
    naturalLead === 'D' ? 'Kesempatan memimpin, mengatasi hambatan, dan melihat hasil konkret.' : '',
    naturalLead === 'I' ? 'Kesempatan mempengaruhi, membangun relasi, dan menyebarkan energi positif.' : '',
    naturalLead === 'S' ? 'Lingkungan yang suportif, konsisten, dan minim drama yang tidak perlu.' : '',
    naturalLead === 'C' ? 'Data yang cukup, struktur yang masuk akal, dan kualitas kerja yang bisa dijaga.' : '',
  ].filter(Boolean)).slice(0, 4)

  const communication = uniqueStrings([
    ...adaptedRef.relateTo,
    ...naturalRef.relateTo,
  ]).slice(0, 4)

  const management = uniqueStrings([
    ...integratedRef.growth,
    `Untuk menilai kecocokan ${applicantName} pada ${role}, bandingkan hasil ini dengan kebutuhan ritme kerja, intensitas interaksi customer, tuntutan SOP, dan kebutuhan kecepatan keputusan.`,
  ]).slice(0, 4)

  const graphExplanations = [
    {
      title: 'Graph I — Adapted Style',
      summary: `Dalam PDF, Graph I dibaca sebagai “This is expected of me”. Artinya grafik ini menunjukkan gaya yang kemungkinan ditampilkan kandidat untuk menyesuaikan diri dengan tuntutan lingkungan. Pada hasil ini, aksen terkuatnya mengarah ke ${adaptedLead}.`,
    },
    {
      title: 'Graph II — Natural Style',
      summary: `Dalam PDF, Graph II dibaca sebagai “This is me”. Grafik ini membantu melihat kecenderungan yang lebih natural saat kandidat tidak terlalu menyesuaikan diri. Pada hasil ini, aksen terkuatnya mengarah ke ${naturalLead}.`,
    },
    {
      title: 'Graph III — Ringkasan Profil',
      summary: `Sistem ini memakai Graph III sebagai ringkasan pola utama untuk report. Pembacaannya tetap harus dikaitkan dengan Graph I dan II agar HR tahu apakah perilaku kandidat konsisten atau sedang banyak beradaptasi. Pada hasil ini, ringkasan utamanya mengarah ke ${integratedLead}.`,
    },
  ]

  return {
    overviewTitle,
    overview,
    applicantExplanation,
    fitSummary,
    workStyle,
    strengths,
    blindSpots,
    motivators,
    communication,
    management,
    graphExplanations,
  }
}
