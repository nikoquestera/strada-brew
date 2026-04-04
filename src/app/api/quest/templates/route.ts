import { NextRequest, NextResponse } from 'next/server'
import { generateMessageTemplates } from '@/lib/quest'

export async function POST(request: NextRequest) {
  const { applicant_name, position, outlet, stage, channel, hr_name } = await request.json()

  const templates = await generateMessageTemplates(
    { applicant_name, position, outlet, stage, hr_name },
    channel
  )

  return NextResponse.json(templates)
}