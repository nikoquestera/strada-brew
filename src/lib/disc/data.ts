// DiSC Personality Assessment — Indonesian version
// Based on the classical DiSC model (Marston) adapted for Indonesian language
// Data source: cahyadsn/disc_id (MIT License)

export type Dimension = 'D' | 'I' | 'S' | 'C'
export type DimensionOrN = Dimension | 'N'

export interface DiscOption {
  term: string
  most: DimensionOrN   // dimension this word contributes to when chosen as "Most"
  least: DimensionOrN  // dimension this word contributes to when chosen as "Least"
}

export interface DiscQuestion {
  no: number
  options: DiscOption[]
}

// 24 question groups — each has 4 options
// most/least = 'N' means no dimension is scored for that selection
export const DISC_QUESTIONS: DiscQuestion[] = [
  { no: 1,  options: [{ term: 'Ramah',                       most: 'S', least: 'N' }, { term: 'Bosan rutinitas',            most: 'N', least: 'I' }, { term: 'Inovatif',                   most: 'D', least: 'D' }, { term: 'Kepastian',                  most: 'C', least: 'C' }] },
  { no: 2,  options: [{ term: 'Menyenangkan orang',          most: 'S', least: 'S' }, { term: 'Tertawa lepas',              most: 'N', least: 'I' }, { term: 'Tak gentar',                 most: 'D', least: 'D' }, { term: 'Tenang',                     most: 'C', least: 'C' }] },
  { no: 3,  options: [{ term: 'Ingin kemajuan',              most: 'D', least: 'D' }, { term: 'Mudah Puas',                 most: 'S', least: 'N' }, { term: 'Perasaan',                   most: 'I', least: 'N' }, { term: 'Sederhana',                  most: 'N', least: 'C' }] },
  { no: 4,  options: [{ term: 'Frustrasi',                   most: 'C', least: 'C' }, { term: 'Menyimpan perasaan',        most: 'S', least: 'S' }, { term: 'Menceritakan sisi saya',     most: 'N', least: 'I' }, { term: 'Siap beroposisi',            most: 'D', least: 'D' }] },
  { no: 5,  options: [{ term: 'Suka berkumpul',              most: 'S', least: 'S' }, { term: 'Bersiap',                   most: 'C', least: 'N' }, { term: 'Petualangan baru',           most: 'I', least: 'I' }, { term: 'Mengharap imbalan',          most: 'D', least: 'D' }] },
  { no: 6,  options: [{ term: 'Disiplin',                    most: 'C', least: 'N' }, { term: 'Terburu-buru',              most: 'D', least: 'D' }, { term: 'Sosialita',                  most: 'I', least: 'I' }, { term: 'Berkomitmen',                most: 'S', least: 'S' }] },
  { no: 7,  options: [{ term: 'Terencana',                   most: 'S', least: 'N' }, { term: 'Mudah berjanji',            most: 'I', least: 'I' }, { term: 'Menghindar',                 most: 'N', least: 'C' }, { term: 'Petarung',                   most: 'N', least: 'D' }] },
  { no: 8,  options: [{ term: 'Penyemangat',                 most: 'I', least: 'I' }, { term: 'Pendengar',                 most: 'S', least: 'S' }, { term: 'Penganalisa',                most: 'C', least: 'C' }, { term: 'Delegator',                  most: 'D', least: 'D' }] },
  { no: 9,  options: [{ term: 'Tidak mudah dikalahkan',      most: 'D', least: 'D' }, { term: 'Ikut pimpinan',             most: 'S', least: 'N' }, { term: 'Riang',                      most: 'I', least: 'I' }, { term: 'Rapi',                       most: 'N', least: 'C' }] },
  { no: 10, options: [{ term: 'Lepas kendali',               most: 'N', least: 'C' }, { term: 'Mengikuti kata hati',       most: 'D', least: 'D' }, { term: 'Tanpa tekanan',              most: 'S', least: 'S' }, { term: 'Gigih',                      most: 'I', least: 'N' }] },
  { no: 11, options: [{ term: 'Memikirkan orang dahulu',     most: 'S', least: 'S' }, { term: 'Suka tantangan',            most: 'D', least: 'D' }, { term: 'Optimis',                    most: 'I', least: 'I' }, { term: 'Sistematik',                 most: 'N', least: 'C' }] },
  { no: 12, options: [{ term: 'Pendiam',                     most: 'C', least: 'N' }, { term: 'Visioner',                  most: 'D', least: 'D' }, { term: 'Suka gaul',                  most: 'N', least: 'I' }, { term: 'Pendamai',                   most: 'S', least: 'S' }] },
  { no: 13, options: [{ term: 'Penyemangat',                 most: 'I', least: 'I' }, { term: 'Perfeksionis',              most: 'N', least: 'C' }, { term: 'Berkelompok',                most: 'N', least: 'S' }, { term: 'Mempunyai tujuan',           most: 'D', least: 'N' }] },
  { no: 14, options: [{ term: 'Dapat diandalkan',            most: 'N', least: 'S' }, { term: 'Kreatif',                   most: 'I', least: 'I' }, { term: 'Orientasi hasil',            most: 'D', least: 'N' }, { term: 'Akurat',                     most: 'C', least: 'N' }] },
  { no: 15, options: [{ term: 'Suka bicara',                 most: 'I', least: 'N' }, { term: 'Gerak cepat',               most: 'D', least: 'D' }, { term: 'Menjaga keseimbangan',      most: 'S', least: 'S' }, { term: 'Taat aturan',                most: 'N', least: 'C' }] },
  { no: 16, options: [{ term: 'Aturan perlu dipertanyakan',  most: 'N', least: 'D' }, { term: 'Aturan membuat adil',        most: 'C', least: 'N' }, { term: 'Aturan membuat bosan',       most: 'I', least: 'I' }, { term: 'Aturan membuat aman',        most: 'S', least: 'S' }] },
  { no: 17, options: [{ term: 'Pendidikan',                  most: 'N', least: 'C' }, { term: 'Prestasi',                  most: 'D', least: 'D' }, { term: 'Keselamatan',                most: 'S', least: 'S' }, { term: 'Sosial',                     most: 'I', least: 'N' }] },
  { no: 18, options: [{ term: 'Memimpin',                    most: 'D', least: 'D' }, { term: 'Antusias',                  most: 'N', least: 'I' }, { term: 'Konsisten',                  most: 'N', least: 'S' }, { term: 'Waspada',                    most: 'C', least: 'N' }] },
  { no: 19, options: [{ term: 'Berorientasi hasil',          most: 'D', least: 'D' }, { term: 'Akurat',                    most: 'C', least: 'C' }, { term: 'Dibuat menyenangkan',        most: 'N', least: 'I' }, { term: 'Bekerjasama',                most: 'N', least: 'S' }] },
  { no: 20, options: [{ term: 'Saya akan pimpin mereka',     most: 'D', least: 'N' }, { term: 'Saya akan melaksanakan',    most: 'S', least: 'S' }, { term: 'Saya akan meyakinkan mereka', most: 'I', least: 'I' }, { term: 'Saya dapatkan fakta',        most: 'C', least: 'N' }] },
  { no: 21, options: [{ term: 'Mudah setuju',                most: 'S', least: 'S' }, { term: 'Mudah percaya',             most: 'I', least: 'I' }, { term: 'Petualang',                  most: 'N', least: 'D' }, { term: 'Toleran',                    most: 'C', least: 'C' }] },
  { no: 22, options: [{ term: 'Menyerah',                    most: 'N', least: 'S' }, { term: 'Mendetail',                 most: 'C', least: 'N' }, { term: 'Mudah berubah',              most: 'I', least: 'I' }, { term: 'Kasar',                      most: 'D', least: 'D' }] },
  { no: 23, options: [{ term: 'Ingin otoritas lebih',        most: 'N', least: 'D' }, { term: 'Ingin kesempatan baru',     most: 'I', least: 'N' }, { term: 'Menghindari konflik',        most: 'S', least: 'S' }, { term: 'Ingin petunjuk yang jelas',  most: 'N', least: 'C' }] },
  { no: 24, options: [{ term: 'Tenang',                      most: 'C', least: 'C' }, { term: 'Tanpa beban',               most: 'I', least: 'I' }, { term: 'Baik hati',                  most: 'S', least: 'N' }, { term: 'Berani',                     most: 'D', least: 'D' }] },
]

// Lookup table: converts raw Most/Least counts (0–20) to visual plot position
// Line 1 = Graph I (Most), Line 2 = Graph II (Least)
// Values already normalized to -8..+8 scale for display
export const GRAPH_LOOKUP: Record<number, { d: number; i: number; s: number; c: number; line: number }[]> = {}
;[
  // line 1 (Most)
  { value: 0,  d: -6,    i: -7,   s: -5.7, c: -6,   line: 1 },
  { value: 1,  d: -5.3,  i: -4.6, s: -4.3, c: -4.7, line: 1 },
  { value: 2,  d: -4,    i: -2.5, s: -3.5, c: -3.5, line: 1 },
  { value: 3,  d: -2.5,  i: -1.3, s: -1.5, c: -1.5, line: 1 },
  { value: 4,  d: -1.7,  i: 1,    s: -0.7, c: 0.5,  line: 1 },
  { value: 5,  d: -1.3,  i: 3,    s: 0.5,  c: 2,    line: 1 },
  { value: 6,  d: 0,     i: 3.5,  s: 1,    c: 3,    line: 1 },
  { value: 7,  d: 0.5,   i: 5.3,  s: 2.5,  c: 5.3,  line: 1 },
  { value: 8,  d: 1,     i: 5.7,  s: 3,    c: 5.7,  line: 1 },
  { value: 9,  d: 2,     i: 6,    s: 4,    c: 6,    line: 1 },
  { value: 10, d: 3,     i: 6.5,  s: 4.6,  c: 6.3,  line: 1 },
  { value: 11, d: 3.5,   i: 7,    s: 5,    c: 6.5,  line: 1 },
  { value: 12, d: 4,     i: 7,    s: 5.7,  c: 6.7,  line: 1 },
  { value: 13, d: 4.7,   i: 7,    s: 6,    c: 7,    line: 1 },
  { value: 14, d: 5.3,   i: 7,    s: 6.5,  c: 7.3,  line: 1 },
  { value: 15, d: 6.5,   i: 7,    s: 6.5,  c: 7.3,  line: 1 },
  { value: 16, d: 7,     i: 7.5,  s: 7,    c: 7.3,  line: 1 },
  { value: 17, d: 7,     i: 7.5,  s: 7,    c: 7.5,  line: 1 },
  { value: 18, d: 7,     i: 7.5,  s: 7,    c: 8,    line: 1 },
  { value: 19, d: 7.5,   i: 7.5,  s: 7.5,  c: 8,    line: 1 },
  { value: 20, d: 7.5,   i: 8,    s: 7.5,  c: 8,    line: 1 },
  // line 2 (Least)
  { value: 0,  d: 7.5,   i: 7,    s: 7.5,  c: 7.5,  line: 2 },
  { value: 1,  d: 6.5,   i: 6,    s: 7,    c: 7,    line: 2 },
  { value: 2,  d: 4.3,   i: 4,    s: 6,    c: 5.6,  line: 2 },
  { value: 3,  d: 2.5,   i: 2.5,  s: 4,    c: 4,    line: 2 },
  { value: 4,  d: 1.5,   i: 0.5,  s: 2.5,  c: 2.5,  line: 2 },
  { value: 5,  d: 0.5,   i: 0,    s: 1.5,  c: 1.5,  line: 2 },
  { value: 6,  d: 0,     i: -2,   s: 0.5,  c: 0.5,  line: 2 },
  { value: 7,  d: -1.3,  i: -3.5, s: -1.3, c: 0,    line: 2 },
  { value: 8,  d: -1.5,  i: -4.3, s: -2,   c: -1.3, line: 2 },
  { value: 9,  d: -2.5,  i: -5.3, s: -3,   c: -2.5, line: 2 },
  { value: 10, d: -3,    i: -6,   s: -4.3, c: -3.5, line: 2 },
  { value: 11, d: -3.5,  i: -6.5, s: -5.3, c: -5.3, line: 2 },
  { value: 12, d: -4.3,  i: -7,   s: -6,   c: -5.7, line: 2 },
  { value: 13, d: -5.3,  i: -7.2, s: -6.5, c: -6,   line: 2 },
  { value: 14, d: -5.7,  i: -7.2, s: -6.7, c: -6.5, line: 2 },
  { value: 15, d: -6,    i: -7.2, s: -6.7, c: -7,   line: 2 },
  { value: 16, d: -6.5,  i: -7.3, s: -7,   c: -7.3, line: 2 },
  { value: 17, d: 6.7,   i: -7.3, s: -7.2, c: -7.5, line: 2 },
  { value: 18, d: 7,     i: -7.3, s: -7.3, c: -7.7, line: 2 },
  { value: 19, d: -7.3,  i: -7.5, s: -7.5, c: -7.9, line: 2 },
  { value: 20, d: -7.5,  i: -8,   s: -8,   c: -8,   line: 2 },
].forEach(row => {
  const key = row.line * 1000 + row.value
  GRAPH_LOOKUP[key] = [...(GRAPH_LOOKUP[key] || []), row]
})

export interface DiscPattern {
  type: string
  pattern: string
  behaviour: string[]
  jobs: string[]
  description: string
}

export const DISC_PATTERNS: DiscPattern[] = [
  { type: 'C',         pattern: 'LOGICAL THINKER',          behaviour: ['Pendiam', 'Anti Kritik', 'Perfeksionis'],                                                                          jobs: ['Perencana', 'Insinyur Teknis', 'Peneliti'],                              description: 'Seorang yang praktis, cakap dan unik. Ia mampu menilai diri sendiri dan kritis terhadap dirinya dan orang lain.' },
  { type: 'D',         pattern: 'ESTABLISHER',              behaviour: ['Individualis', 'Ego Tinggi', 'Kurang Sensitif'],                                                                    jobs: ['Pengacara', 'Peneliti', 'Sales Representative'],                         description: 'Memiliki rasa ego yang tinggi dan cenderung individualis dengan standar yang sangat tinggi. Ia lebih suka menganalisa masalah sendirian.' },
  { type: 'D-C',       pattern: 'CHALLENGER',               behaviour: ['Mempunyai keputusan yang kuat', 'Kreatif dalam memecahkan masalah', 'Memiliki reaksi yang cepat'],                 jobs: ['Supervisor Rumah Sakit', 'Industrial Marketing', 'Investment Banking'],   description: 'Seorang yang tekun dan memiliki reaksi yang cepat. Ia akan meneliti dan mengejar semua kemungkinan dalam mencari solusi permasalahan.' },
  { type: 'D-I',       pattern: 'PENGAMBIL KEPUTUSAN',      behaviour: ['Leader', 'Dingin / Task Oriented', 'Argumentatif'],                                                                 jobs: ['General Management', 'Public Relations', 'Business Management'],         description: 'Tidak basa-basi dan tegas, ia cenderung seorang individualis yang kuat. Berpandangan jauh ke depan, progresif dan mau berkompetisi.' },
  { type: 'D-I-C',     pattern: 'CHANCELLOR',               behaviour: ['Ramah secara alami', 'Menggabungkan kesenangan dengan pekerjaan', 'Menyukai hubungan dengan sesama'],              jobs: ['Finance', 'Production Planning', 'Personnel Disciplines'],               description: 'Ia menggabungkan antara kesenangan dengan pekerjaan. Kelihatan menyukai hubungan dengan sesama tapi juga dapat mengerjakan hal-hal detil.' },
  { type: 'D-I-S',     pattern: 'DIRECTOR',                 behaviour: ['Pengelola', 'Enerjik', 'Kurang Detail'],                                                                            jobs: ['Service Manager', 'Office Management', 'Account Manager'],               description: 'Fokus pada penyelesaian pekerjaan dan menunjukkan penghargaan yang tinggi kepada orang lain. Tidak berorientasi detil, fokus pada target secara keseluruhan.' },
  { type: 'D-S',       pattern: 'SELF-MOTIVATED',           behaviour: ['Objektif & Analitis', 'Mandiri', 'Good Planner'],                                                                   jobs: ['Peneliti', 'Pengacara', 'Solicitor'],                                    description: 'Seorang yang obyektif dan analitis. Termotivasi oleh target pribadi, berorientasi terhadap pekerjaannya tapi juga menyukai hubungan dengan sesama.' },
  { type: 'D-S-C',     pattern: 'DIRECTOR',                 behaviour: ['Ingin terlibat dalam situasi', 'Ingin memberikan bantuan dan dukungan', 'Termotivasi oleh target pribadi'],        jobs: ['Office Management', 'Business Consultant', 'Human Resources'],           description: 'Seorang yang obyektif dan analitis. Ia ingin terlibat dalam situasi, memberikan bantuan dan dukungan kepada yang ia hormati.' },
  { type: 'D-S-I',     pattern: 'DIRECTOR',                 behaviour: ['Seorang yang obyektif dan analitis', 'Termotivasi oleh target pribadi', 'Berorientasi terhadap pekerjaannya'],    jobs: ['Engineering and Production', 'Service Selling', 'Distribution'],         description: 'Seorang yang obyektif dan analitis. Ulet dalam memulai pekerjaan, akan berusaha keras mencapai sasarannya. Mandiri dan cermat.' },
  { type: 'D-C-I',     pattern: 'CHALLENGER',               behaviour: ['Seorang yang tekun', 'Mempunyai keputusan yang kuat', 'Kreatif dalam memecahkan masalah'],                         jobs: ['Technical/Scientific Management', 'Engineering', 'Finance'],             description: 'Seorang yang sensitif terhadap permasalahan, memiliki kreativitas yang baik dalam memecahkan masalah. Banyak memberikan ide-ide dengan berfokus pada pekerjaan.' },
  { type: 'D-C-S',     pattern: 'CHALLENGER',               behaviour: ['Memiliki reaksi yang cepat', 'Mampu mencari solusi permasalahan', 'Banyak memberikan ide-ide', 'Usaha keras pada ketepatan'], jobs: ['Engineering', 'Scientific', 'Research Planning'],             description: 'Seorang yang sensitif terhadap permasalahan, memiliki kreativitas yang baik dalam memecahkan masalah. Dapat menyelesaikan tugas penting dalam waktu singkat.' },
  { type: 'I',         pattern: 'COMMUNICATOR',             behaviour: ['Persuasif', 'Bicara aktif', 'Inspirasional'],                                                                       jobs: ['Promoting', 'Demonstrating', 'Canvassing'],                              description: 'Merupakan seorang yang antusias dan optimistik, lebih suka mencapai sasarannya melalui orang lain. Suka berhubungan dengan sesamanya dan mengadakan pertemuan.' },
  { type: 'I-S',       pattern: 'ADVISOR',                  behaviour: ['Hangat', 'Simpati', 'Tenang dalam situasi sosial'],                                                                 jobs: ['Personnel-HR', 'Coach', 'Mentor'],                                       description: 'Seorang yang mengesankan orang akan kehangatan, simpati dan pengertiannya. Memiliki ketenangan dalam sebagian besar situasi sosial.' },
  { type: 'I-C',       pattern: 'ASSESSOR',                 behaviour: ['Suka berteman', 'Nyaman walaupun dengan orang asing', 'Mudah mengembangkan hubungan baru'],                        jobs: ['Training', 'Inventing', 'Service Engineer'],                             description: 'Merupakan seorang yang ramah dan suka berteman; merasa nyaman walaupun dengan orang asing. Cenderung perfeksionis secara alamiah.' },
  { type: 'I-C-D',     pattern: 'ASSESSOR',                 behaviour: ['Analitis', 'Berwatak hati-hati', 'Ramah pada saat merasa nyaman'],                                                 jobs: ['Financial Manager', 'Engineering Manager', 'Project Engineer'],          description: 'Merupakan seseorang yang analitis, berwatak hati-hati dan ramah pada saat merasa nyaman. Suka berada pada situasi yang dapat diramalkan dan tidak ada kejutan.' },
  { type: 'I-C-S',     pattern: 'RESPONSIVE & THOUGHTFUL',  behaviour: ['Good Communication Skill', 'To The Point', 'Need Socialism', 'Kurang Fokus'],                                      jobs: ['Customer Services', 'Public Relations', 'Artist'],                       description: 'Individu yang berorientasi pada orang dan lancar berkomunikasi serta loyal. Butuh pengakuan sosial dan perhatian pribadi; dapat cepat akrab dengan orang lain.' },
  { type: 'I-S-C',     pattern: 'RESPONSIVE & THOUGHTFUL',  behaviour: ['High Energy', 'To The Point', 'Sensitif'],                                                                          jobs: ['Actors', 'Chef', 'Personnel', 'Welfare'],                                description: 'Individu yang berorientasi pada orang dan lancar berkomunikasi serta loyal. Cenderung sensitif dan mempunyai standar yang tinggi.' },
  { type: 'S',         pattern: 'SPECIALIST',               behaviour: ['Stabil & Konsisten', 'Nyaman di Belakang Layar', 'Process Oriented'],                                               jobs: ['Administrative Work', 'Service-General', 'Landscape Gardener'],          description: 'Individu konsisten yang berusaha menjaga lingkungan yang tidak berubah. Butuh waktu untuk menyesuaikan diri dengan perubahan. Akan menghindari konfrontasi.' },
  { type: 'S-C',       pattern: 'PEACEMAKER & ACCURATE',    behaviour: ['Memikirkan Dampak ke Orang Lain', 'Terlalu Mendalam dalam Berpikir', 'Concern ke Data dan Fakta'],                 jobs: ['Office Manager', 'Chief Clerk', 'General Administrator'],                description: 'Ia peduli dengan orang-orang di sekitarnya dan mempunyai kualitas yang membuatnya sangat teliti dalam penyelesaian tugas.' },
  { type: 'S-C/C-S',   pattern: 'PERFECTIONIST',            behaviour: ['Detail & Teliti', 'Sistematik & Prosedural', 'Anti Kritik'],                                                        jobs: ['Statistician', 'Surveyor', 'Optician'],                                  description: 'Berpikir sistematis dan cenderung mengikuti prosedur dalam kehidupan pribadi dan pekerjaannya. Teratur, memiliki perencanaan yang baik, teliti dan fokus pada detil.' },
  { type: 'S-D',       pattern: 'SELF-MOTIVATED',           behaviour: ['Mandiri', 'Good Planner', 'Komitmen terhadap target', 'Termotivasi oleh target pribadi'],                          jobs: ['Investigator', 'Researcher', 'Computer Specialist'],                     description: 'Seorang yang obyektif dan analitis. Karena determinasinya yang kuat, sering berhasil dalam berbagai hal; karakter yang tenang, stabil.' },
  { type: 'S-D-I',     pattern: 'DIRECTOR',                 behaviour: ['Seorang yang obyektif dan analitis', 'Termotivasi oleh target pribadi', 'Berorientasi terhadap pekerjaannya'],    jobs: ['Engineering and Production (Supervision)', 'Service Selling', 'Office Management'], description: 'Seorang yang obyektif dan analitis. Ulet dalam memulai pekerjaan. Ia akan berusaha keras untuk mencapai sasarannya. Mandiri dan cermat.' },
  { type: 'S-I',       pattern: 'ADVISOR',                  behaviour: ['Simpati dan Pengertian', 'Tenang dalam situasi sosial', 'Pendengar yang baik'],                                    jobs: ['Hotelier', 'Travel Agent', 'Therapist'],                                 description: 'Seorang yang mengesankan orang akan kehangatan, simpati dan pengertiannya. Merupakan "penjaga damai" yang sebenarnya.' },
  { type: 'S-I-C',     pattern: 'ADVOCATE',                 behaviour: ['Stabil', 'Detail ketika situasi membutuhkan', 'Teguh pendirian'],                                                  jobs: ['Personnel Welfare', 'Technical Instructor', 'Customer Service'],         description: 'Orang yang stabil, individu yang ramah yang berusaha keras membangun hubungan yang positif. Sekali dia membuat keputusan, sangat sulit mengubah pendiriannya.' },
  { type: 'S-I-D',     pattern: 'ADVISOR',                  behaviour: ['Pendengar yang baik', 'Demonstratif', 'Tidak memaksakan idenya pada orang lain'],                                  jobs: ['Engineering and Production (Supervision)', 'Service Selling', 'Distribution and Warehouse'], description: 'Seorang yang mengesankan orang akan kehangatan, simpati dan pengertiannya. Banyak orang datang padanya karena ia kelihatan sebagai pendengar yang baik.' },
  { type: 'S-C-D',     pattern: 'INQUIRER',                 behaviour: ['Sangat berorientasi pada detil', 'Sangat teliti dalam penyelesaian tugas', 'Sangat berhati-hati'],                 jobs: ['Managing/Supervising', 'Accountancy', 'Project Engineer'],               description: 'Seorang yang baik secara alamiah dan sangat berorientasi detil. Mempertimbangkan sekelilingnya dengan hati-hati sebelum membuat keputusan.' },
  { type: 'S-C-I',     pattern: 'ADVOCATE',                 behaviour: ['Stabil', 'Ramah', 'Cenderung individualis'],                                                                        jobs: ['Personnel Welfare', 'Advisers', 'Attorney Counseling'],                  description: 'Orang yang stabil, individu yang ramah yang berusaha keras membangun hubungan yang positif. Ingin diterima sebagai anggota tim.' },
  { type: 'C-D-I',     pattern: 'CHALLENGER',               behaviour: ['Sangat berorientasi pada tugas', 'Sensitif terhadap permasalahan', 'Lebih mempedulikan tugas daripada orang'],    jobs: ['Logistic Support', 'Systems Analyst', 'Lecturer'],                       description: 'Seorang yang sangat berorientasi pada tugas dan sensitif pada permasalahan. Lebih mempedulikan tugas yang ada dibanding orang-orang di sekitarnya.' },
  { type: 'C-D-S',     pattern: 'CONTEMPLATOR',             behaviour: ['Mempunyai standar tinggi untuk dirinya', 'Selalu berpikir ada ruang untuk kemajuan', 'Ingin menghasilkan mutu yang terbaik'], jobs: ['Accountant', 'Administrator', 'Quality Controller'], description: 'Berorientasi pada hal detil dan mempunyai standar tinggi untuk dirinya. Logis dan analitis. Ingin berbuat yang terbaik.' },
  { type: 'C-I',       pattern: 'ASSESSOR',                 behaviour: ['Analitis', 'Berwatak hati-hati', 'Ramah pada saat merasa nyaman'],                                                 jobs: ['Public Relations', 'Lecturer', 'Personnel Administration'],              description: 'Seseorang yang analitis, berwatak hati-hati dan ramah pada saat merasa nyaman. Menampilkan sikap peduli dan ramah, namun mampu memusatkan perhatian pada penyelesaian tugas.' },
  { type: 'C-I-D',     pattern: 'ASSESSOR',                 behaviour: ['Berwatak hati-hati', 'Sangat biasa dengan orang asing', 'Memusatkan perhatian pada penyelesaian tugas'],           jobs: ['Managing/Supervising Engineering', 'Research', 'Finance'],               description: 'Seseorang yang analitis, berwatak hati-hati dan ramah. Sangat biasa dengan orang asing, karena dapat menilai dan menyesuaikan diri dalam hubungan mereka.' },
  { type: 'C-S-D',     pattern: 'PRECISIONIST',             behaviour: ['Sistematis dan Prosedural', 'Fokus pada detil', 'Mengharapkan akurasi dan standar tinggi'],                        jobs: ['Engineering', 'Research Director', 'Production and Finance Director'],   description: 'Berpikir sistematis dan cenderung mengikuti prosedur. Teratur, memiliki perencanaan yang baik, teliti dan fokus pada detil. Bertindak dengan penuh kebijaksanaan.' },
]

// Dimension metadata for display
export const DISC_DIMENSIONS: Record<Dimension, { label: string; color: string; bg: string; lightBg: string; description: string; keywords: string[] }> = {
  D: {
    label: 'Dominance',
    color: '#D12E2E',
    bg: '#D12E2E',
    lightBg: '#FFF0F0',
    description: 'Berorientasi pada hasil, tegas, kompetitif, dan suka tantangan.',
    keywords: ['Tegas', 'Kompetitif', 'Berani', 'Langsung', 'Mandiri'],
  },
  I: {
    label: 'Influence',
    color: '#DE9733',
    bg: '#DE9733',
    lightBg: '#FEF8E6',
    description: 'Antusias, optimistik, kolaboratif, dan suka mempengaruhi orang lain.',
    keywords: ['Antusias', 'Optimistik', 'Persuasif', 'Ekspresif', 'Energik'],
  },
  S: {
    label: 'Steadiness',
    color: '#037894',
    bg: '#037894',
    lightBg: '#E6F4F8',
    description: 'Stabil, sabar, konsisten, dan suka mendukung orang lain.',
    keywords: ['Stabil', 'Sabar', 'Konsisten', 'Dapat Diandalkan', 'Kolaboratif'],
  },
  C: {
    label: 'Conscientiousness',
    color: '#005353',
    bg: '#005353',
    lightBg: '#E6F4F1',
    description: 'Analitis, akurat, sistematis, dan berorientasi pada kualitas.',
    keywords: ['Analitis', 'Akurat', 'Sistematis', 'Teliti', 'Kritis'],
  },
}
