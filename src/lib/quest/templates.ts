export interface MessageTemplateOptions {
  applicant_name: string
  position: string
  outlet?: string
  stage: string
  interview_date?: string
  interview_location?: string
  hr_name?: string
}

export async function generateMessageTemplates(
  options: MessageTemplateOptions,
  channel: 'whatsapp' | 'email'
): Promise<{ option1: string; option2: string; option3: string }> {
  const supabase = (await import('@/lib/supabase/server')).createClient()
  const { data: settings } = await supabase
    .from('hrd_settings')
    .select('quest_ai_system_prompt')
    .eq('id', 'default')
    .single()

  const systemPrompt = settings?.quest_ai_system_prompt || `Kamu adalah Quest, AI assistant HR untuk Strada Coffee Indonesia. Tugasmu membuat template pesan komunikasi dengan kandidat yang profesional, hangat, dan on-brand dengan Strada Coffee.

Strada Coffee brand tone: profesional namun hangat, specialty coffee focused, proud of Indonesian coffee culture.`

  const finalSystemPrompt = `${systemPrompt}

Buat 3 variasi pesan yang berbeda tone: (1) Formal & profesional, (2) Hangat & friendly, (3) Singkat & to-the-point.

Response HARUS berupa JSON valid saja, tidak ada teks lain.`

  const userPrompt = `Buat template ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'} untuk stage: ${options.stage}

Info kandidat:
- Nama: ${options.applicant_name}
- Posisi: ${options.position}${options.outlet ? ` · ${options.outlet}` : ''}
${options.interview_date ? `- Jadwal interview: ${options.interview_date}` : ''}
${options.interview_location ? `- Lokasi: ${options.interview_location}` : ''}
- Dikirim oleh: ${options.hr_name || 'Tim HR Strada Coffee'}

Format JSON:
{
  "option1": "<teks pesan formal>",
  "option2": "<teks pesan hangat>",
  "option3": "<teks pesan singkat>"
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      system: finalSystemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  })

  const data = await response.json()
  const text = data.content?.[0]?.text || '{}'

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return {
      option1: `Yth. ${options.applicant_name}, terima kasih atas lamaran Anda untuk posisi ${options.position} di Strada Coffee.`,
      option2: `Halo ${options.applicant_name}! Tim HR Strada Coffee di sini.`,
      option3: `Hi ${options.applicant_name}, Strada Coffee HR di sini.`
    }
  }
}