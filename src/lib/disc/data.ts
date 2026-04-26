// DiSC Personality Assessment — Indonesian version
// Based on the classical DiSC model (Marston) adapted for Indonesian language
// Data source: cahyadsn/disc_id (MIT License)

export type Dimension = 'D' | 'I' | 'S' | 'C'
export type DimensionOrN = Dimension | 'N'

export interface DiscOption {
  term: string
  most: DimensionOrN
  least: DimensionOrN
}

export interface DiscQuestion {
  no: number
  options: DiscOption[]
}

export const DISC_QUESTIONS: DiscQuestion[] = [
  { no: 1, options: [{ term: 'Gampangan, Mudah setuju', most: 'S', least: 'S' }, { term: 'Percaya, Mudah percaya pada orang', most: 'I', least: 'I' }, { term: 'Petualang, Mengambil resiko', most: 'N', least: 'D' }, { term: 'Toleran, Menghormati', most: 'C', least: 'C' }] },
  { no: 2, options: [{ term: 'Lembut suara, Pendiam', most: 'C', least: 'N' }, { term: 'Optimistik, Visioner', most: 'D', least: 'D' }, { term: 'Pusat Perhatian, Suka gaul', most: 'N', least: 'I' }, { term: 'Pendamai, Membawa Harmoni', most: 'S', least: 'S' }] },
  { no: 3, options: [{ term: 'Menyemangati orang', most: 'I', least: 'I' }, { term: 'Berusaha sempurna', most: 'N', least: 'C' }, { term: 'Bagian dari kelompok', most: 'N', least: 'S' }, { term: 'Ingin membuat tujuan', most: 'D', least: 'N' }] },
  { no: 4, options: [{ term: 'Menjadi frustrasi', most: 'C', least: 'C' }, { term: 'Menyimpan perasaan saya', most: 'S', least: 'S' }, { term: 'Menceritakan sisi saya', most: 'N', least: 'I' }, { term: 'Siap beroposisi', most: 'D', least: 'D' }] },
  { no: 5, options: [{ term: 'Hidup, Suka bicara', most: 'I', least: 'N' }, { term: 'Gerak cepat, Tekun', most: 'D', least: 'D' }, { term: 'Usaha menjaga keseimbangan', most: 'S', least: 'S' }, { term: 'Usaha mengikuti aturan', most: 'N', least: 'C' }] },
  { no: 6, options: [{ term: 'Kelola waktu secara efisien', most: 'C', least: 'N' }, { term: 'Sering terburu-buru, Merasa tertekan', most: 'D', least: 'D' }, { term: 'Masalah sosial itu penting', most: 'I', least: 'I' }, { term: 'Suka selesaikan apa yang saya mulai', most: 'S', least: 'S' }] },
  { no: 7, options: [{ term: 'Tolak perubahan mendadak', most: 'S', least: 'N' }, { term: 'Cenderung janji berlebihan', most: 'I', least: 'I' }, { term: 'Tarik diri di tengah tekanan', most: 'N', least: 'C' }, { term: 'Tidak takut bertempur', most: 'N', least: 'D' }] },
  { no: 8, options: [{ term: 'Penyemangat yang baik', most: 'I', least: 'I' }, { term: 'Pendengar yang baik', most: 'S', least: 'S' }, { term: 'Penganalisa yang baik', most: 'C', least: 'C' }, { term: 'Delegator yang baik', most: 'D', least: 'D' }] },
  { no: 9, options: [{ term: 'Hasil adalah penting', most: 'D', least: 'D' }, { term: 'Lakukan dengan benar, Akurasi penting', most: 'C', least: 'C' }, { term: 'Dibuat menyenangkan', most: 'N', least: 'I' }, { term: 'Mari kerjakan bersama', most: 'N', least: 'S' }] },
  { no: 10, options: [{ term: 'Akan berjalan terus tanpa kontrol diri', most: 'N', least: 'C' }, { term: 'Akan membeli sesuai dorongan hati', most: 'D', least: 'D' }, { term: 'Akan menunggu, Tanpa tekanan', most: 'S', least: 'S' }, { term: 'Akan mengusahakan yang kuinginkan', most: 'I', least: 'N' }] },
  { no: 11, options: [{ term: 'Ramah, Mudah bergabung', most: 'S', least: 'N' }, { term: 'Unik, Bosan rutinitas', most: 'N', least: 'I' }, { term: 'Aktif mengubah sesuatu', most: 'D', least: 'D' }, { term: 'Ingin hal-hal yang pasti', most: 'C', least: 'C' }] },
  { no: 12, options: [{ term: 'Non-konfrontasi, Menyerah', most: 'N', least: 'S' }, { term: 'Dipenuhi hal detail', most: 'C', least: 'N' }, { term: 'Perubahan pada menit terakhir', most: 'I', least: 'I' }, { term: 'Menuntut, Kasar', most: 'D', least: 'D' }] },
  { no: 13, options: [{ term: 'Ingin kemajuan', most: 'D', least: 'D' }, { term: 'Puas dengan segalanya', most: 'S', least: 'N' }, { term: 'Terbuka memperlihatkan perasaan', most: 'I', least: 'N' }, { term: 'Rendah hati, Sederhana', most: 'N', least: 'C' }] },
  { no: 14, options: [{ term: 'Tenang, Pendiam', most: 'C', least: 'C' }, { term: 'Bahagia, Tanpa beban', most: 'I', least: 'I' }, { term: 'Menyenangkan, Baik hati', most: 'S', least: 'N' }, { term: 'Tak gentar, Berani', most: 'D', least: 'D' }] },
  { no: 15, options: [{ term: 'Menggunakan waktu berkualitas dgn teman', most: 'S', least: 'S' }, { term: 'Rencanakan masa depan, Bersiap', most: 'C', least: 'N' }, { term: 'Bepergian demi petualangan baru', most: 'I', least: 'I' }, { term: 'Menerima ganjaran atas tujuan yg dicapai', most: 'D', least: 'D' }] },
  { no: 16, options: [{ term: 'Aturan perlu dipertanyakan', most: 'N', least: 'D' }, { term: 'Aturan membuat adil', most: 'C', least: 'N' }, { term: 'Aturan membuat bosan', most: 'I', least: 'I' }, { term: 'Aturan membuat aman', most: 'S', least: 'S' }] },
  { no: 17, options: [{ term: 'Pendidikan, Kebudayaan', most: 'N', least: 'C' }, { term: 'Prestasi, Ganjaran', most: 'D', least: 'D' }, { term: 'Keselamatan, keamanan', most: 'S', least: 'S' }, { term: 'Sosial, Perkumpulan kelompok', most: 'I', least: 'N' }] },
  { no: 18, options: [{ term: 'Memimpin, Pendekatan langsung', most: 'D', least: 'D' }, { term: 'Suka bergaul, Antusias', most: 'N', least: 'I' }, { term: 'Dapat diramal, Konsisten', most: 'N', least: 'S' }, { term: 'Waspada, Hati-hati', most: 'C', least: 'N' }] },
  { no: 19, options: [{ term: 'Tidak mudah dikalahkan', most: 'D', least: 'D' }, { term: 'Kerjakan sesuai perintah, Ikut pimpinan', most: 'S', least: 'N' }, { term: 'Mudah terangsang, Riang', most: 'I', least: 'I' }, { term: 'Ingin segalanya teratur, Rapi', most: 'N', least: 'C' }] },
  { no: 20, options: [{ term: 'Saya akan pimpin mereka', most: 'D', least: 'N' }, { term: 'Saya akan melaksanakan', most: 'S', least: 'S' }, { term: 'Saya akan meyakinkan mereka', most: 'I', least: 'I' }, { term: 'Saya dapatkan fakta', most: 'C', least: 'N' }] },
  { no: 21, options: [{ term: 'Memikirkan orang dahulu', most: 'S', least: 'S' }, { term: 'Kompetitif, Suka tantangan', most: 'D', least: 'D' }, { term: 'Optimis, Positif', most: 'I', least: 'I' }, { term: 'Pemikir logis, Sistematik', most: 'N', least: 'C' }] },
  { no: 22, options: [{ term: 'Menyenangkan orang, Mudah setuju', most: 'S', least: 'S' }, { term: 'Tertawa lepas, Hidup', most: 'N', least: 'I' }, { term: 'Berani, Tak gentar', most: 'D', least: 'D' }, { term: 'Tenang, Pendiam', most: 'C', least: 'C' }] },
  { no: 23, options: [{ term: 'Ingin otoritas lebih', most: 'N', least: 'D' }, { term: 'Ingin kesempatan baru', most: 'I', least: 'N' }, { term: 'Menghindari konflik', most: 'S', least: 'S' }, { term: 'Ingin petunjuk yang jelas', most: 'N', least: 'C' }] },
  { no: 24, options: [{ term: 'Dapat diandalkan, Dapat dipercaya', most: 'N', least: 'S' }, { term: 'Kreatif, Unik', most: 'I', least: 'I' }, { term: 'Garis dasar, Orientasi hasil', most: 'D', least: 'N' }, { term: 'Jalankan standar yang tinggi, Akurat', most: 'C', least: 'N' }] },
]

export interface DiscResultRow {
  value: number
  d: number; i: number; s: number; c: number
  line: number
}

// Normalized scores lookup from tbl_results
export const DISC_SCORING_TABLE: DiscResultRow[] = [
  { line: 1, value: 0, d: -12, i: -11, s: -12, c: -12 },
  { line: 1, value: 1, d: -11, i: -10, s: -9, c: -11 },
  { line: 1, value: 2, d: -10, i: -9, s: -8, c: -8 },
  { line: 1, value: 3, d: -9, i: -7, s: -7, c: -6 },
  { line: 1, value: 4, d: -8, i: -4, s: -5, c: -3 },
  { line: 1, value: 5, d: -7, i: -2, s: -3, c: 6 },
  { line: 1, value: 6, d: -5, i: 3, s: -2, c: 9 },
  { line: 1, value: 7, d: -3, i: 8, s: 6, c: 11 },
  { line: 1, value: 8, d: -1, i: 10, s: 7, c: 12 },
  { line: 1, value: 9, d: 6, i: 11, s: 8, c: 13 },
  { line: 1, value: 10, d: 7, i: 12, s: 10, c: 13.2 },
  { line: 1, value: 11, d: 8, i: 12.3, s: 12, c: 13.3 },
  { line: 1, value: 12, d: 9, i: 12.6, s: 13, c: 13.5 },
  { line: 1, value: 13, d: 10, i: 12.9, s: 13.1, c: 13.7 },
  { line: 1, value: 14, d: 11, i: 13.1, s: 13.3, c: 13.8 },
  { line: 1, value: 15, d: 12, i: 13.4, s: 13.4, c: 14 },
  { line: 1, value: 16, d: 13, i: 13.7, s: 13.6, c: 14 },
  { line: 1, value: 17, d: 13.3, i: 14, s: 13.7, c: 14 },
  { line: 1, value: 18, d: 13.5, i: 14, s: 13.9, c: 14 },
  { line: 1, value: 19, d: 13.8, i: 14, s: 14, c: 14 },
  { line: 1, value: 20, d: 14, i: 14, s: 14, c: 14 },
  { line: 1, value: 21, d: 14, i: 14, s: 14, c: 14 },
  { line: 1, value: 22, d: 14, i: 14, s: 14, c: 14 },
  { line: 1, value: 23, d: 14, i: 14, s: 14, c: 14 },
  { line: 1, value: 24, d: 14, i: 14, s: 14, c: 14 },
  { line: 2, value: 0, d: 14, i: 14, s: 14, c: 14 },
  { line: 2, value: 1, d: 12, i: 13, s: 13, c: 13 },
  { line: 2, value: 2, d: 10, i: 10, s: 12, c: 11 },
  { line: 2, value: 3, d: 8, i: 8, s: 10, c: 10 },
  { line: 2, value: 4, d: 7, i: -1, s: 8, c: 8 },
  { line: 2, value: 5, d: -1, i: -3, s: -1, c: -1 },
  { line: 2, value: 6, d: -3, i: -5, s: -2, c: -2 },
  { line: 2, value: 7, d: -5, i: -7, s: -4, c: -4 },
  { line: 2, value: 8, d: -6, i: -10, s: -6, c: -6 },
  { line: 2, value: 9, d: -7, i: -12, s: -8, c: -7 },
  { line: 2, value: 10, d: -8, i: -13, s: -11, c: -11 },
  { line: 2, value: 11, d: -9, i: -14, s: -12.5, c: -12.5 },
  { line: 2, value: 12, d: -11, i: -14.3, s: -14, c: -14 },
  { line: 2, value: 13, d: -12, i: -14.5, s: -15, c: -15 },
  { line: 2, value: 14, d: -13, i: -14.8, s: -15.2, c: -15.3 },
  { line: 2, value: 15, d: -14, i: -15, s: -15.3, c: -15.7 },
  { line: 2, value: 16, d: -15, i: -15.3, s: -15.5, c: -16 },
  { line: 2, value: 17, d: -15.2, i: -15.5, s: -15.7, c: -16 },
  { line: 2, value: 18, d: -15.4, i: -15.8, s: -15.8, c: -16 },
  { line: 2, value: 19, d: -15.6, i: -16, s: -16, c: -16 },
  { line: 2, value: 20, d: -15.8, i: -16, s: -16, c: -16 },
  { line: 2, value: 21, d: -16, i: -16, s: -16, c: -16 },
  { line: 2, value: 22, d: -16, i: -16, s: -16, c: -16 },
  { line: 2, value: 23, d: -16, i: -16, s: -16, c: -16 },
  { line: 2, value: 24, d: -16, i: -16, s: -16, c: -16 },
  { line: 3, value: -22, d: -8, i: -8, s: -8, c: -7.5 },
  { line: 3, value: -21, d: -7.5, i: -8, s: -8, c: -7.3 },
  { line: 3, value: -20, d: -7, i: -8, s: -8, c: -7.3 },
  { line: 3, value: -19, d: -6.8, i: -8, s: -8, c: -7 },
  { line: 3, value: -18, d: -6.75, i: -7, s: -7.5, c: -6.7 },
  { line: 3, value: -17, d: -6.7, i: -6.7, s: -7.3, c: -6.7 },
  { line: 3, value: -16, d: -6.5, i: -6.7, s: -7.3, c: -6.7 },
  { line: 3, value: -15, d: -6.3, i: -6.7, s: -7, c: -6.5 },
  { line: 3, value: -14, d: -6.1, i: -6.7, s: -6.5, c: -6.3 },
  { line: 3, value: -13, d: -5.9, i: -6.7, s: -6.5, c: -6 },
  { line: 3, value: -12, d: -5.7, i: -6.7, s: -6.5, c: -5.85 },
  { line: 3, value: -11, d: -5.3, i: -6.7, s: -6.5, c: -5.85 },
  { line: 3, value: -10, d: -4.3, i: -6.5, s: -6, c: -5.7 },
  { line: 3, value: -9, d: -3.5, i: -6, s: -4.7, c: -4.7 },
  { line: 3, value: -8, d: -3.25, i: -5.7, s: -4.3, c: -4.3 },
  { line: 3, value: -7, d: -3, i: -4.7, s: -3.5, c: -3.5 },
  { line: 3, value: -6, d: -2.75, i: -4.3, s: -3, c: -3 },
  { line: 3, value: -5, d: -2.5, i: -3.5, s: -2, c: -2.5 },
  { line: 3, value: -4, d: -1.5, i: -3, s: -1.5, c: -0.5 },
  { line: 3, value: -3, d: -1, i: -2, s: -1, c: 0 },
  { line: 3, value: -2, d: -0.5, i: -1.5, s: -0.5, c: 0.3 },
  { line: 3, value: -1, d: -0.25, i: 0, s: 0, c: 0.5 },
  { line: 3, value: 0, d: 0, i: 0.5, s: 1, c: 1.5 },
  { line: 3, value: 1, d: 0.5, i: 1, s: 1.5, c: 3 },
  { line: 3, value: 2, d: 0.7, i: 1.5, s: 2, c: 4 },
  { line: 3, value: 3, d: 1, i: 3, s: 3, c: 4.3 },
  { line: 3, value: 4, d: 1.3, i: 4, s: 3.5, c: 5.5 },
  { line: 3, value: 5, d: 1.5, i: 4.3, s: 4, c: 5.7 },
  { line: 3, value: 6, d: 2, i: 5, s: 4.3, c: 6 },
  { line: 3, value: 7, d: 2.5, i: 5.5, s: 4.7, c: 6.3 },
  { line: 3, value: 8, d: 3.5, i: 6.5, s: 5, c: 6.5 },
  { line: 3, value: 9, d: 4, i: 6.7, s: 5.5, c: 6.7 },
  { line: 3, value: 10, d: 4.7, i: 7, s: 6, c: 7 },
  { line: 3, value: 11, d: 4.85, i: 7.3, s: 6.2, c: 7.3 },
  { line: 3, value: 12, d: 5, i: 7.3, s: 6.3, c: 7.3 },
  { line: 3, value: 13, d: 5.5, i: 7.3, s: 6.5, c: 7.3 },
  { line: 3, value: 14, d: 6, i: 7.3, s: 6.7, c: 7.3 },
  { line: 3, value: 15, d: 6.3, i: 7.3, s: 7, c: 7.3 },
  { line: 3, value: 16, d: 6.5, i: 7.3, s: 7.3, c: 7.3 },
  { line: 3, value: 17, d: 6.7, i: 7.3, s: 7.3, c: 7.5 },
  { line: 3, value: 18, d: 7, i: 7.5, s: 7.3, c: 8 },
  { line: 3, value: 19, d: 7.3, i: 8, s: 7.3, c: 8 },
  { line: 3, value: 20, d: 7.3, i: 8, s: 7.5, c: 8 },
  { line: 3, value: 21, d: 7.5, i: 8, s: 8, c: 8 },
  { line: 3, value: 22, d: 8, i: 8, s: 8, c: 8 },
];

export interface DiscPattern {
  type: string
  pattern: string
  behaviour: string[]
  jobs: string[]
  description: string
}

export const DISC_PATTERNS: DiscPattern[] = [
  { type: 'C',         pattern: 'LOGICAL THINKER',          behaviour: ['Pendiam', 'Anti Kritik', 'Perfeksionis'],                                                                          jobs: ['Planner (any function)', 'Engineer (Installation, Technical)', 'Technical/Research (Chemist Technician)'],                              description: 'Seorang yang praktis, cakap dan unik. Ia orang yang mampu menilai diri sendiri dan kritis terhadap dirinya dan orang lain.' },
  { type: 'D',         pattern: 'ESTABLISHER',              behaviour: ['Individualis', 'Ego Tinggi', 'Kurang Sensitif'],                                                                    jobs: ['Attorney', 'Researcher', 'Sales Representative'],                         description: 'Memiliki rasa ego yang tinggi dan cenderung invidualis dengan standard yang sangat tinggi. Ia lebih suka menganalisa masalah sendirian daripada bersama orang lain.' },
  { type: 'D / C-D',   pattern: 'DESIGNER',                 behaviour: ['Sensitif', 'Result Oriented', 'Suka Tantangan'],                                                                    jobs: ['Engineering (Management, Research, Design)', 'Research (R&D)', 'Planning'],                              description: 'Seorang yang sangat berorientasi pada tugas dan sensitif pada permasalahan. Ia lebih mempedulikan tugas yang ada dibanding orang-orang di sekitarnya, termasuk perasaan mereka.' },
  { type: 'D / I-D',   pattern: 'NEGOTIATOR',               behaviour: ['Terlalu Percaya Diri', 'Agresif', 'Optimis'],                                                                       jobs: ['Recruitment Consultant', 'Politician', 'Self-Employed.'],                         description: 'Merupakan seorang pemimpin integratif yang bekerja dengan dan melalui orang lain. Ia ramah, memiliki perhatian yang tinggi akan orang dan juga mempunyai kemampuan untuk memperoleh hormat dan penghargaan dari berbagai tipe orang. Melakukan pekerjaannya dengan cara yang bersahabat, baik dalam mencapai sasarannya maupun meyakinkan pandangannya kepada orang lain.' },
  { type: 'D / I-D-C', pattern: 'CONFIDENT & DETERMINED',   behaviour: ['Dominan', 'Agresif', 'Perfeksionis'],                                                                               jobs: ['Insurance, Mortgage and Finance Sales', 'Personnel and Marketing Services.'],                         description: 'Sangat berorientasi terhadap tugas and juga menyukai orang. Ia sangat baik dalam menarik orang/recruiting. Seorang yang bersahabat, tetapi menyukai keadaan di mana tugas-tugas harus dilakukan dengan benar. Perlu belajar untuk secara sungguh-sungguh mendengarkan orang-orang di sekitarnya dari pada selalu berpikir apa yang ingin dikatakan. Ia mempunyai kemampuan logika yang tinggi ketika ia mau menggunakannya.' },
  { type: 'D / I-D-S', pattern: 'REFORMER',                 behaviour: ['Butuh Pujian & Penghargaan', 'Cepat Percaya Orang', 'Mudah Simpati & Empati'],                                      jobs: ['Recruiting Agent', 'Sales (Manager/Person)', 'Marketing Services.'],                         description: 'Ia menyelesaikan tugasnya melalui keterampilan sosialnya; ia peduli dan menerima orang lain. Ia berkonsentrasi pada tugas yang ada di tangannya sampai selesai dan akan minta bantuan orang lain jika perlu. Ia menyadari keterbatasannya dan meminta bantuan jika memerlukannya. Ia disukai dan orang ingin menolongnya.' },
  { type: 'D / I-S-D', pattern: 'MOTIVATOR',                behaviour: ['Supporter', 'Sosialisasi Baik', 'Butuh Pujian & Penghargaan'],                                                      jobs: ['Hotelier', 'Community Counseling', 'Complaints Manager.'],                         description: 'Seorang yang menampilkan gaya bersemangat ketika termotivasi pada sasaran. Ia lebih suka memimpin atau melibatkan diri, walaupun ia juga mau melayani sebagai pembantu. Menampilkan keterampilan berhubungan dan berkomunikasi dengan sangat baik. Ia akan berusaha keras menyelesaikan tugas dengan cepat dan efisien.' },
  { type: 'D / S-D-C / S-C-D', pattern: 'INQUIRER',         behaviour: ['Result Oriented', 'Kaku dan Keras Kepala', 'Good Service'],                                                         jobs: ['Research Manager', 'Scientific Work', 'Accountant.'],                         description: 'Seorang yang sabar, terkontrol dan suka menggali fakta dan jalan keluar. Ia tenang dan ramah. Ia merencanakan pekerjaan dengan hati-hati, tetapi agresif, menanyakan sesuatu serta mengumpulkan data pendukung. Seorang yang konsisten dan suka menolong. People skill darinya melebihi orientasi tugasnya.' },
  { type: 'D-I',       pattern: 'PENGAMBIL KEPUTUSAN',      behaviour: ['Leader', 'Dingin / Task Oriented', 'Argumentatif'],                                                                 jobs: ['General Management (Directing/Managing/Supervising)', 'Public Relations', 'Business Management'],         description: 'Tidak basa-basi dan tegas, ia cenderung merupakan seorang invidualis yang kuat. Ia berpandangan jauh ke depan, progresif dan mau berkompetisi untuk mencapai sasaran. Ia juga menempatkan standard tinggi pada orang-orang di sekitarnya, serta mengutamakan kesempurnaan. Ia menginginkan otoritas yang jelas dan menyukai tugas-tugas baru.' },
  { type: 'D-I-S',     pattern: 'DIRECTOR',                 behaviour: ['Pengelola', 'Enerjik', 'Kurang Detail'],                                                                            jobs: ['Service Manager', 'Office Management', 'Account Manager'],               description: 'Fokus pada penyelesaian pekerjaan dan menunjukkan penghargaan yang tinggi kepada orang lain. Ia memiliki kemampuan untuk menggerakkan orang dan pekerjaan dikarenakan keterampilannya berpikir ke depan dan hubungan antar manusia. Tidak berorientasi detil, ia fokus pada target secara keseluruhan dengan menyerahkan hal detil kepada orang lain. Sekali ia memutuskan sesuatu, ia akan terus mengerjakannya dan bertahan sampai selesai.' },
  { type: 'D-S',       pattern: 'SELF-MOTIVATED',           behaviour: ['Objektif & Analitis', 'Mandiri', 'Good Planner'],                                                                   jobs: ['Researcher', 'Lawyer', 'Solicitor'],                                    description: 'Seorang yang obyektif dan analitis. Ia ingin terlibat dalam situasi, dan ia juga ingin memberikan bantuan dan dukungan kepada orang yang ia hormati. Secara internal termotivasi oleh target pribadi, ia berorientasi terhadap pekerjaannya tapi juga menyukai hubungan dengan sesama. Seorang yang mandiri dan cermat serta memiliki tindak lanjut yang baik.' },
  { type: 'I / C-I-S', pattern: 'MEDIATOR',                 behaviour: ['Sensitif', 'Good Communication Skill', 'Good Analitical Think'],                                                    jobs: ['Public Relations', 'Administration', 'Office Administrator.'],                         description: 'Merupakan individu yang berorientasi pada orang, ia mampu menggabungkan ketepatan dan loyalitas. Ia cenderung peka dan mempunyai standard yang tinggi. Ia menginginkan stabilitas dan berorientasi terhadap sasaran. Ia menginginkan pengakuan sosial dan perhatian pribadi.' },
  { type: 'I / C-S-I', pattern: 'PRACTITIONER',             behaviour: ['Perfeksionis', 'Quality Oriented', 'Scheduled'],                                                                    jobs: ['Chemist Research', 'Computer Programmer', 'Market Analyst.'],                         description: 'Bersahabat, antusias, informal, banyak bicara, dan mungkin sangat mencemaskan apa yang dipikirkan oleh orang lain. Ia menolak agresi dan mengharapkan suasana harmonis. Ia cenderung cukup cerdas dalam berbagai hal. Ia merupakan pencari fakta yang sangat baik dan akan membuat keputusan yang baik setelah mengumpulkan fakta dan data pendukung.' },
  { type: 'I-S-C / I-C-S', pattern: 'RESPONSIVE & THOUGHTFUL', behaviour: ['High Energy', 'To The Point', 'Sensitif'],                                                                          jobs: ['Actors', 'Chef', 'Personnel', 'Welfare'],                                description: 'Merupakan individu yang berorientasi pada orang dan lancar berkomunikasi serta loyal. Ia cenderung sensitif dan mempunyai standard yang tinggi. Keputusannya dibuat berdasarkan fakta dan data pendukung. Ia sepertinya tidak bisa diam. Ia perlu untuk lebih terus terang dan jangan terlalu subyektif.' },
  { type: 'S',         pattern: 'SPECIALIST',               behaviour: ['Stabil & Konsisten', 'Nyaman di Belakang Layar', 'Process Oriented'],                                               jobs: ['Administrative Work', 'Service-General', 'Landscape Gardener.'],          description: 'Merupakan individu konsisten yang berusaha menjaga lingkungan/suasana yang tidak berubah. Ia butuh waktu untuk menyesuaikan diri dengan perubahan dan sungkan menjalankan "cara-cara lama mengerjakan sesuatu". Ia akan menghindari konfrontasi dan berusaha sekuat tenaga memendam perasaannya.' },
  { type: 'S / C-S',   pattern: 'PERFECTIONIST',            behaviour: ['Detail & Teliti', 'Sistematik & Prosedural', 'Anti Kritik'],                                                        jobs: ['Statistician', 'Surveyor', 'Optician.'],                                  description: 'Berpikir sistematis dan cenderung mengikuti prosedur dalam kehidupan pribadi dan pekerjaannya. Teratur dan memiliki perencanaan yang baik, ia teliti dan fokus pada detil. Bertindak dengan penuh kebijaksanaan, diplomatis dan jarang menentang rekan kerjanya dengan sengaja. Menginginkan adanya petunjuk standard pelaksanaan kerja dan tanpa perubahan mendadak.' },
  { type: 'S-C',       pattern: 'PEACEMAKER, RESPECTFULL & ACCURATE', behaviour: ['Memikirkan Dampak ke Orang Lain', 'Terlalu Mendalam dalam Berpikir', 'Concern ke Data dan Fakta'],                 jobs: ['Office (Manager; Supervisor; Person)', 'Chief Clerk', 'General Administrator.'],                description: 'Ia peduli dengan orang-orang di sekitarnya dan mempunyai kualitas yang membuatnya sangat teliti dalam penyelesaian tugas. Jika ia merasa seseorang memanfaatkan situasi, ia akan memperlambat kerjanya sehingga dapat mengamati apa yang sedang berlangsung di sekitarnya.' },
  { type: 'D-C',       pattern: 'CHALLENGER',               behaviour: ['Mempunyai keputusan yang kuat', 'Kreatif dalam memecahkan masalah', 'Memiliki reaksi yang cepat'],                 jobs: ['Hospital Supervisor', 'Industrial Marketing', 'Investment Banking.'],   description: 'Seorang yang tekun dan memiliki reaksi yang cepat. Ia akan meneliti dan mengejar semua kemungkinan yang ada dalam mencari solusi permasalahan. Ia banyak memberikan ide-ide dengan berfokus pada pekerjaan. Usaha yang keras pada ketepatan akan mengimbangi keinginannya pada hasil yang terukur.' },
  { type: 'D-I-C',     pattern: 'CHANCELLOR',               behaviour: ['Seorang yang ramah secara alami', 'Menggabungkan kesenangan dengan pekerjaan', 'Menyukai hubungan dengan sesama'],              jobs: ['Finance', 'Production Planning', 'Personnel Disciplines.'],               description: 'Ia menggabungkan antara kesenangan dengan pekerjaan/bisnis ketika melakukan sesuatu. Ia kelihatan menyukai hubungan dengan sesama tetapi juga dapat mengerjakan hal-hal detil. Seorang yang ramah secara alami dan menikmati interaksi dengan sesama, akan tetapi ia akan juga menilai orang dan tugas secara hati-hati; persahabatannya akan bergeser sesuai dengan dorongan hatinya pada orang lain di sekitarnya.' },
  { type: 'D-S-I',     pattern: 'DIRECTOR',                 behaviour: ['Ingin terlibat dalam situasi', 'Ingin memberikan bantuan dan dukungan', 'Termotivasi oleh target pribadi'],        jobs: ['Engineering and Production (Directing, Managing, Supervising)', 'Service Manager', 'Distribution.'],           description: 'Seorang yang obyektif dan analitis. Ia ingin terlibat dalam situasi, dan ia juga ingin memberikan bantuan dan dukungan kepada orang yang ia hormati. Secara internal termotivasi oleh target pribadi, ia berorientasi terhadap pekerjaannya tapi juga menyukai hubungan dengan sesama.' },
  { type: 'D-S-C',     pattern: 'DIRECTOR',                 behaviour: ['Ingin terlibat dalam situasi', 'Ingin memberikan bantuan dan dukungan', 'Termotivasi oleh target pribadi', 'Berorientasi terhadap pekerjaannya'],        jobs: ['Office Management', 'Business Consultant', 'Human Resources.'],           description: 'Seorang yang obyektif dan analitis. Ia ingin terlibat dalam situasi, dan ia juga ingin memberikan bantuan dan dukungan kepada orang yang ia hormati. Secara internal termotivasi oleh target pribadi, ia berorientasi terhadap pekerjaannya tapi juga menyukai hubungan dengan sesama.' },
  { type: 'D-C-I',     pattern: 'CHALLENGER',               behaviour: ['Seorang yang tekun', 'Mempunyai keputusan yang kuat', 'Kreatif dalam memecahkan masalah'],                         jobs: ['Technical/Scientific (Directing, Management, Supervision)', 'Engineering', 'Finance.'],             description: 'Seorang yang sensitif terhadap permasalahan, dan memiliki kreativitas yang baik dalam memecahkan masalah. Ia akan meneliti dan mengejar semua kemungkinan yang ada dalam mencari solusi permasalahan. Ia banyak memberikan ide-ide dengan berfokus pada pekerjaan. Usaha yang keras pada ketepatan akan mengimbangi keinginannya pada hasil yang terukur.' },
  { type: 'D-C-S',     pattern: 'CHALLENGER',               behaviour: ['Memiliki reaksi yang cepat', 'Mampu mencari solusi permasalahan', 'Banyak memberikan ide-ide.', 'Usaha yang keras pada ketepatan'], jobs: ['Engineering', 'Scientific', 'Research Planning.'],             description: 'Seorang yang sensitif terhadap permasalahan, dan memiliki kreativitas yang baik dalam memecahkan masalah. Ia dapat menyelesaikan tugas-tugas penting dalam waktu singkat karena mempunyai keputusan yang kuat. Seorang yang tekun dan memiliki reaksi yang cepat.' },
  { type: 'I',         pattern: 'COMMUNICATOR',             behaviour: ['Persuasif', 'Bicara aktif', 'Inspirasional'],                                                                       jobs: ['Promoting', 'Demonstrating', 'Canvassing'],                              description: 'Merupakan seorang yang antusias and optimistik, ia lebih suka mencapai sasarannya melalui orang lain. Ia suka berhubungan dengan sesamanya - ia bahkan suka mengadakan pesta atau kegiatan untuk berkumpul, dan ini menunjukkan kepribadiannya yang ramah. Ia tidak suka bekerja sendirian dan cenderung bersama dengan orang lain dalam menyelesaikan proyek. Perhatian dan fokusnya tidak sebaik apa yang dia inginkan - Ia lebih suka menggunakan gaya manajemen partisipatif yang dibangun berdasarkan hubungan yang kuat.' },
  { type: 'I-S',       pattern: 'ADVISOR',                  behaviour: ['Hangat', 'Simpati', 'Tenang dalam situasi sosial'],                                                                 jobs: ['Personnel-HR', 'Coach', 'Mentor.'],                                       description: 'Seorang yang mengesankan orang akan kehangatan, simpati and pengertiannya. Ia memiliki ketenangan dalam sebagian besar situasi sosial dan jarang tidak menyenangkan orang lain. Jika ia sangat kuat merasakan sesuatu, Ia akan bicara secara terbuka dan terus terang tentang pendiriannya. Ia cenderung menerima kritik atas pekerjaannya sebagai serangan pribadi.' },
  { type: 'I-C',       pattern: 'ASSESSOR',                 behaviour: ['Suka berteman', 'Nyaman walapun dengan orang asing', 'Mudah mengembangkan hubungan baru'],                        jobs: ['Training', 'Inventing', 'Service Engineer or Supervising within a Technical/Specialist Area.'],                             description: 'Merupakan seorang yang ramah dan suka berteman; ia merasa nyaman walaupun dengan orang asing. Ia cenderung perfeksionis secara alamiah, dan akan mengisolasi dirinya jika diperlukan untuk melaksanakan pekerjaan. Kadang-kadang ia salah menilai kemampuan orang lain dikarenakan pandangan-pandangannya yang optimis.' },
  { type: 'I-C-D',     pattern: 'ASSESSOR',                 behaviour: ['Analitis', 'Berwatak hati-hati', 'Ramah pada saat merasa nyaman'],                                                 jobs: ['Financial (Manager, Specialist)', 'Engineering (Manager, Designer, Buyer, Draughtsman)', 'Project Engineer.'],          description: 'Merupakan seseorang yang analitis, berwatak hati-hati dan ramah pada saat merasa nyaman. Ia suka berada pada situasi yang dapat diramalkan dan tidak ada kejutan. Ia sangat berorientasi pada kualitas dan akan bekerja dengan keras untuk menyelesaikan pekerjakan dengan benar. Ia ingin orang-orang berkenan akan pekerjaan yang sudah ia selesaikan dengan baik.' },
  { type: 'I-C-S',     pattern: 'RESPONSIVE & THOUGHTFUL',  behaviour: ['Good Communication Skill', 'To The Point', 'Need Socialism', 'Kurang Fokus'],                                      jobs: ['Customer Services', 'Public Relations', 'Artist'],                       description: 'Merupakan individu yang berorientasi pada orang dan lancar berkomunikasi serta loyal. Ia perlu untuk lebih terus terang dan jangan terlalu subyektif. Ia butuh pengakuan sosial dan perhatian pribadi; ia dapat cepat akrab dengan orang lain. Ia bersahabat, antusias, informal, banyak bicara dan terlalu khawatir terhadap apa yang dipikirkan orang.' },
  { type: 'S-D',       pattern: 'SELF-MOTIVATED',           behaviour: ['Mandiri', 'Good planner', 'Komitmen terhadap target', 'Termotivasi oleh target pribadi'],                          jobs: ['Investigator', 'Researcher', 'Computer Specialist'],                     description: 'Merupakan seorang yang obyektif dan analitis. Karena determinasinya yang kuat, ia sering berhasil dalam berbagai hal; karakternya yang tenang, stabil dan daya tahannya memiliki kontribusi akan keberhasilannya. Ia bisa menjadi tidak ramah walaupun ia pada dasarnya ia yang berorientasi pada orang; dan pada situasi yang tidak membuatnya nyaman, ia lebih suka mendukung pemimpinnya dari pada keterlibatannya dengan situasi.' },
  { type: 'S-I',       pattern: 'ADVISOR',                  behaviour: ['Simpati dan Pengertian', 'Tenang dalam situasi sosial', 'Pendengar yang baik'],                                    jobs: ['Hotelier', 'Travel Agent', 'Therapist.'],                                 description: 'Seorang yang mengesankan orang akan kehangatan, simpati dan pengertiannya. Ia memiliki ketenangan dalam sebagian besar situasi sosial dan jarang tidak menyenangkan orang lain. Ia cenderung menerima kritik atas pekerjaannya sebagai serangan pribadi. Ia merupakan "penjaga damai" yang sebenarnya dan akan bekerja untuk menjaga kedamaian dalam setiap keadaan.' },
  { type: 'S-D-I',     pattern: 'DIRECTOR',                 behaviour: ['Seorang yang obyektif dan analitis', 'Termotivasi oleh target pribadi', 'Berorientasi terhadap pekerjaannya'],    jobs: ['Engineering and Production (Supervision)', 'Service Selling', 'Office Management.'], description: 'Seorang yang obyektif dan analitis. Ia ingin terlibat dalam situasi, dan ia juga ingin memberikan bantuan dan dukungan kepada orang yang ia hormati. Ulet dalam memulai pekerjaan. Ia akan berusaha keras untuk mencapai sasarannya. Seorang yang mandiri dan cermat serta memiliki tindak lanjut yang baik.' },
  { type: 'S-I-D',     pattern: 'ADVISOR',                  behaviour: ['Pendengar yang baik', 'Demonstratif', 'Tidak memaksakan idenya pada orang lain'],                                  jobs: ['Engineering and Production (Supervision)', 'Service Selling', 'Distribution and Warehouse Supervision'], description: 'Seorang yang mengesankan orang akan kehangatan, simpati dan pengertiannya. Faktanya, banyak orang datang padanya karena ia kelihatan sebagai pendengar yang baik. Ia cenderung sangat demonstratif dan emosinya biasanya tampak jelas bagi orang di sekitarnya.' },
  { type: 'S-I-C',     pattern: 'ADVOCATE',                 behaviour: ['Stabil', 'Detail ketika situasi membutuhkan', 'Teguh pendirian'],                                                  jobs: ['Personnel Welfare', 'Technical Instructor', 'Customer Service.'],         description: 'Merupakan orang yang stabil, individu yang ramah yang berusaha keras membangun hubungan yang positif di tempat kerja dan di rumah. Ia dapat menjadi sangat berorientasi detil ketika situasi membutuhkan; tetapi secara keseluruhan ia cenderung individualis, independen dan sedikit perhatian terhadap detil. Sekali dia membuat keputusan, sangat sulit mengubah pendiriannya.' },
  { type: 'S-C-D',     pattern: 'INQUIRER',                 behaviour: ['Sangat berorientasi pada detil', 'Sangat teliti dalam penyelesaian tugas', 'Sangat berhati-hati'],                 jobs: ['Managing or Supervising (in Engineering, Accountancy, Project Engineer, Draughtsman'],               description: 'Seorang yang baik secara alamiah dan sangat berorientasi detil. Ia peduli dengan orang-orang di sekitarnya dan mempunyai kualitas yang membuatnya sangat teliti dalam penyelesaian tugas. Ia mempertimbangkan sekelilingnya dengan hati-hati sebelum membuat keputusan untuk melihat pengaruhnya pada mereka; saat tertentu ia terlalu hati-hati.' },
  { type: 'S-C-I',     pattern: 'ADVOCATE',                 behaviour: ['Stabil', 'Ramah', 'Cenderung individualis'],                                                                        jobs: ['Personnel Welfare', 'Advisers', 'Attorney Counseling'],                  description: 'Merupakan orang yang stabil, individu yang ramah yang berusaha keras membangun hubungan yang positif di tempat kerja dan di rumah. Ia ingin diterima sebagai anggota tim, dan ia menginginkan orang lain menyukainya.' },
  { type: 'C-I',       pattern: 'ASSESSOR',                 behaviour: ['Analitis', 'Berwatak hati-hati', 'Ramah pada saat merasa nyaman'],                                                 jobs: ['Public Relations', 'Lecturer', 'Personnel Administration'],              description: 'Merupakan seseorang yang analitis, berwatak hati-hati dan ramah pada saat merasa nyaman. Ia menampilkan sikap peduli dan ramah, namun mampu memusatkan perhatian pada penyelesaian tugas yang ada.' },
  { type: 'C-D-I',     pattern: 'CHALLENGER',               behaviour: ['Sangat berorientasi pada tugas', 'Sensitif terhadap permasalahan', 'Lebih mempedulikan tugas daripada orang'],    jobs: ['Logistic Support', 'Systems Analyst', 'Lecturer'],                       description: 'Seorang yang sangat berorientasi pada tugas dan sensitif pada permasalahan. Ia lebih mempedulikan tugas yang ada dibanding orang-orang di sekitarnya, termasuk perasaan mereka. Ia cenderung pendiam dan tidak mudah percaya.' },
  { type: 'C-D-S',     pattern: 'CONTEMPLATOR',             behaviour: ['Mempunyai standar tinggi untuk dirinya', 'Selalu berpikir ada ruang untuk kemajuan', 'Ingin menghasilkan mutu yang terbaik'], jobs: ['Accountant', 'Administrator', 'Quality Controller'], description: 'Berorientasi pada hal detil dan mempunyai standard tinggi untuk dirinya. Ia logis dan analitis. Ia ingin berbuat yang terbaik, dan ia selalu berpikir ada ruang untuk peningkatan/kemajuan.' },
  { type: 'C-I-D',     pattern: 'ASSESSOR',                 behaviour: ['Berwatak hati-hati', 'Sangat biasa dengan orang asing', 'Memusatkan perhatian pada penyelesaian tugas'],           jobs: ['Managing or Supervising (Engineering, Research, Finance, Planning), Designer, Work Study'],               description: 'Merupakan seseorang yang analitis, berwatak hati-hati dan ramah pada saat merasa nyaman. Ia sangat biasa dengan orang asing, karena ia dapat menilai dan menyesuaikan diri dalam hubungan mereka.' },
  { type: 'C-S-D',     pattern: 'PRECISIONIST',             behaviour: ['Sistematis dan Prosedural', 'Fokus pada detil', 'Mengharapkan akurasi dan standard tinggi'],                        jobs: ['Engineering, Research Director, Production and Finance (Director, Manager, Supervisor)'],   description: 'Berpikir sistematis dan cenderung mengikuti prosedur dalam kehidupan pribadi dan pekerjaannya. Teratur dan memiliki perencanaan yang baik, ia teliti dan fokus pada detil. Ia bertindak dengan penuh kebijaksanaan, diplomatis dan jarang menentang rekan kerjanya dengan sengaja.' },
]

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
