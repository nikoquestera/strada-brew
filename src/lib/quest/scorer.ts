import { QuestScoringInput, QuestScoringResult } from './types'

export async function runQuestScoring(input: QuestScoringInput): Promise<QuestScoringResult> {
  const { applicant, job } = input

  const systemPrompt = `Kamu adalah Quest, AI recruiter assistant untuk Strada Coffee Indonesia — specialty coffee brand premium yang berdiri sejak 2012. Tugasmu adalah menganalisa profil pelamar kerja secara objektif dan memberikan skor serta rekomendasi untuk tim HR.

Strada Coffee mencari karyawan yang:
- Passionate tentang kopi dan hospitality
- Detail-oriented dan konsisten dalam kualitas
- Punya kemampuan belajar yang cepat
- Cocok dengan kultur tim yang solid dan supportif

Format response HARUS berupa JSON valid. Tidak ada teks lain di luar JSON.`

  const userPrompt = `Analisa profil pelamar berikut untuk posisi ${applicant.position_applied}${job ? ` (${job.title})` : ''}:

DATA PELAMAR:
- Nama: ${applicant.full_name}
- Posisi: ${applicant.position_applied}
- Pengalaman kafe: ${applicant.has_cafe_experience ? `${applicant.cafe_experience_years} tahun${applicant.cafe_experience_detail ? ` di ${applicant.cafe_experience_detail}` : ''}` : 'Tidak ada'}
- Sertifikasi barista: ${applicant.has_barista_cert ? `Ada (${applicant.cert_detail || 'tidak dispesifikasi'})` : 'Tidak ada'}
- Pendidikan: ${applicant.education_level || 'Tidak disebutkan'}
- Instagram: ${applicant.instagram_url ? 'Ada' : 'Tidak ada'}
- Domisili: ${applicant.domicile || 'Tidak disebutkan'}
- Motivasi: ${applicant.motivation || 'Tidak diisi'}

${job?.ai_screening_notes ? `CATATAN SCREENING DARI HR:\n${job.ai_screening_notes}` : ''}
${job?.min_experience_years ? `MINIMUM PENGALAMAN DIBUTUHKAN: ${job.min_experience_years} tahun` : ''}

Berikan analisa dalam format JSON berikut:
{
  "overall_score": <0-100>,
  "experience_score": <0-25>,
  "certification_score": <0-20>,
  "completeness_score": <0-15>,
  "motivation_score": <0-20>,
  "profile_score": <0-20>,
  "summary": "<1-2 kalimat ringkasan kandidat dalam Bahasa Indonesia>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "concerns": ["<concern 1>", "<concern 2>"],
  "recommendation": "<Highly Recommended | Recommended | Consider | Not Recommended>",
  "quest_notes": "<analisa detail 2-3 paragraf untuk HR dalam Bahasa Indonesia>"
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
      max_tokens: 1000,
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