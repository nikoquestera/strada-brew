import { QuestScoringInput, QuestScoringResult } from './types'

export async function runQuestScoring(input: QuestScoringInput): Promise<QuestScoringResult> {
  const { applicant, job, scoringWeights } = input

  const w = scoringWeights ?? {
    experience_weight: 25,
    certification_weight: 20,
    education_weight: 15,
    motivation_weight: 20,
    profile_weight: 20,
  }

  // Compute age from birth_date if available
  const age = applicant.birth_date
    ? Math.floor((Date.now() - new Date(applicant.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const candidateNarrative = [
    `${applicant.full_name} melamar untuk posisi ${applicant.position_applied}${job ? ` (${job.title})` : ''}.`,
    `Latar belakang: ${applicant.education_level || 'pendidikan tidak disebutkan'}${age ? `, usia ${age} tahun` : ''}.`,
    `Domisili: ${applicant.domicile || 'tidak disebutkan'}${job?.location ? ` — outlet target di ${job.location}` : ''}.`,
    applicant.has_cafe_experience
      ? `Pengalaman kafe: ${applicant.cafe_experience_years} tahun${applicant.cafe_experience_detail ? ` di ${applicant.cafe_experience_detail}` : ''}.`
      : `Pengalaman kafe: tidak memiliki pengalaman kafe sebelumnya.`,
    applicant.has_barista_cert
      ? `Sertifikasi: memiliki sertifikasi barista${applicant.cert_detail ? ` — ${applicant.cert_detail}` : ''}.`
      : `Sertifikasi: tidak ada sertifikasi barista.`,
    `Kehadiran digital: ${applicant.instagram_url ? 'memiliki profil Instagram aktif' : 'tidak ada profil Instagram tercantum'}.`,
    `Motivasi / catatan: "${applicant.motivation || 'tidak diisi'}"`,
    applicant.screening_notes ? `Catatan HR untuk evaluasi ini: "${applicant.screening_notes}"` : '',
  ].filter(Boolean).join(' ')

  const jobNarrative = job
    ? [
        `Strada Coffee mencari kandidat untuk posisi ${job.title}.`,
        job.location ? `Lokasi: ${job.location}.` : '',
        `Minimum pengalaman: ${job.min_experience_years || 0} tahun di bidang relevan.`,
        job.required_certifications?.length
          ? `Sertifikasi diinginkan: ${job.required_certifications.join(', ')}.`
          : '',
        job.description ? `Deskripsi peran: ${job.description}.` : '',
        job.ai_screening_notes ? `Catatan khusus HR: ${job.ai_screening_notes}.` : '',
      ].filter(Boolean).join(' ')
    : 'Konteks lowongan tidak tersedia — evaluasi kesesuaian umum untuk brand Strada Coffee Indonesia.'

  const systemPrompt = `Kamu adalah Quest, AI talent advisor untuk Strada Coffee Indonesia — specialty coffee brand premium sejak 2012. Tugasmu adalah menilai kesesuaian kandidat dengan posisi yang dilamar secara holistik dan mendalam, seperti seorang HRD senior berpengalaman.

Strada Coffee mencari karyawan yang passionate tentang kopi dan hospitality, detail-oriented, cepat belajar, dan cocok dengan kultur tim yang solid.

PENTING: Nilai kandidat sebagai SATU GAMBARAN UTUH — bukan elemen per elemen. Faktor yang lebih lemah bisa dikompensasi faktor lain yang lebih kuat. Pikirkan: apakah kandidat ini akan sukses di peran ini?

Format response HARUS berupa JSON valid. Tidak ada teks lain di luar JSON.`

  const userPrompt = `Evaluasi kesesuaian kandidat berikut secara holistik:

PROFIL KANDIDAT:
${candidateNarrative}

KONTEKS LOWONGAN:
${jobNarrative}

PANDUAN EVALUASI:
Bayangkan kamu mewawancarai kandidat ini langsung. Pertimbangkan semua faktor bersama-sama — usia, lokasi, pendidikan, pengalaman, sertifikasi, motivasi, kehadiran digital — sebagai satu gambar utuh. Jangan hanya mencocokkan syarat secara mekanis. Pikirkan:
- Apakah kombinasi faktor-faktor ini membuat kandidat kemungkinan sukses di posisi ini?
- Apa yang membuat mereka menonjol? Apa risiko nyata yang perlu diperhatikan HR?
- Bagaimana kelemahan di satu area dikompensasi kekuatan di area lain?

Turunkan sub-score sebagai dimensi holistic fit (bukan checklist terpisah). overall_score mencerminkan probability of success — skor 70+ berarti kandidat solid, 85+ sangat direkomendasikan.

${scoringWeights?.custom_note ? `Panduan bobot khusus HR: "${scoringWeights.custom_note}"` : ''}

BOBOT PENILAIAN YANG DIGUNAKAN (sesuai konfigurasi HR):
- Pengalaman kafe: ${w.experience_weight} poin
- Sertifikasi: ${w.certification_weight} poin
- Pendidikan: ${w.education_weight} poin (digabungkan ke profile_score)
- Motivasi & kepribadian: ${w.motivation_weight} poin
- Profil umum: ${w.profile_weight} poin

Gunakan bobot di atas sebagai panduan prioritas — dimensi berbobot lebih tinggi = lebih penting dalam overall_score.

Berikan response dalam format JSON berikut (TANPA teks lain di luar JSON):
{
  "overall_score": <0-100>,
  "experience_score": <0-${w.experience_weight}, kontribusi pengalaman dan kematangan kerja>,
  "certification_score": <0-${w.certification_weight}, sertifikasi dan kompetensi teknis>,
  "completeness_score": <0-15, kelengkapan dan kualitas informasi yang diberikan>,
  "motivation_score": <0-${w.motivation_weight}, kekuatan motivasi, kecocokan nilai, antusiasme>,
  "profile_score": <0-${w.profile_weight}, kecocokan profil keseluruhan — lokasi, usia, pendidikan, kehadiran digital>,
  "summary": "<1-2 kalimat ringkasan kandidat dalam Bahasa Indonesia>",
  "strengths": ["<kekuatan nyata 1>", "<kekuatan nyata 2>", "<kekuatan nyata 3>"],
  "concerns": ["<risiko atau kekurangan yang perlu diperhatikan HR>"],
  "recommendation": "<Highly Recommended | Recommended | Consider | Not Recommended>",
  "quest_notes": "<analisa mendalam 2-3 paragraf untuk HR dalam Bahasa Indonesia — jelaskan reasoning di balik skor, bagaimana faktor-faktor saling berinteraksi, dan rekomendasi konkret untuk langkah selanjutnya>"
}`

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured in environment variables')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Anthropic API error:', response.status, errorText)
    throw new Error(`Anthropic API returned ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || '{}'

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean) as QuestScoringResult
  } catch {
    return {
      overall_score: 0,
      experience_score: 0,
      certification_score: 0,
      completeness_score: 0,
      motivation_score: 0,
      profile_score: 0,
      summary: 'Gagal memproses scoring.',
      strengths: [],
      concerns: ['Error processing'],
      recommendation: 'Consider',
      quest_notes: 'Terjadi error saat proses scoring. Silakan review manual.'
    }
  }
}
