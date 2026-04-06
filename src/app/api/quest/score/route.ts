import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runQuestScoring } from '@/lib/quest'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { applicant_id, employee_id } = body

  if (!applicant_id && !employee_id) {
    return NextResponse.json({ error: 'Missing applicant_id or employee_id' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch subject — applicant or employee
  let subject: Record<string, any> | null = null
  let jobContext: Record<string, any> | null = null

  if (applicant_id) {
    const { data } = await supabase
      .from('applicants')
      .select('*, job_postings(*)')
      .eq('id', applicant_id)
      .single()
    subject = data
    jobContext = data?.job_postings ?? null
  } else {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employee_id)
      .single()
    subject = data
  }

  if (!subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
  }

  // Fetch default scoring weights
  const { data: defaultWeights } = await supabase
    .from('scoring_weights')
    .select('*')
    .eq('is_default', true)
    .single()

  // INSERT a new score record — gives us history per run
  const { data: scoreRecord, error: insertError } = await supabase
    .from('applicant_quest_scores')
    .insert({
      ...(applicant_id ? { applicant_id } : {}),
      ...(employee_id ? { employee_id } : {}),
      status: 'processing',
    })
    .select('id')
    .single()

  if (insertError || !scoreRecord) {
    console.error('Failed to create score record:', insertError)
    return NextResponse.json({ error: 'Failed to create score record' }, { status: 500 })
  }

  const scoreId = scoreRecord.id

  try {
    const result = await runQuestScoring({
      applicant: applicant_id ? {
        full_name: subject.full_name,
        has_cafe_experience: subject.has_cafe_experience || false,
        cafe_experience_years: subject.cafe_experience_years || 0,
        cafe_experience_detail: subject.cafe_experience_detail,
        has_barista_cert: subject.has_barista_cert || false,
        cert_detail: subject.cert_detail,
        education_level: subject.education_level,
        instagram_url: subject.instagram_url,
        motivation: subject.hr_notes,
        domicile: subject.domicile,
        position_applied: subject.position_applied,
        birth_date: subject.birth_date,
        screening_notes: subject.screening_notes,
      } : {
        full_name: subject.full_name,
        has_cafe_experience: false,
        cafe_experience_years: 0,
        has_barista_cert: false,
        position_applied: subject.position,
        domicile: subject.outlet || subject.entity,
        motivation: `Karyawan aktif dengan posisi ${subject.position} di ${subject.outlet || subject.entity}`,
      },
      scoringWeights: defaultWeights ?? undefined,
      job: jobContext ? {
        title: jobContext.title,
        min_experience_years: jobContext.min_experience_years,
        ai_screening_notes: jobContext.ai_screening_notes,
        location: jobContext.location,
        description: jobContext.description,
        required_certifications: jobContext.required_certifications,
      } : undefined,
    })

    // Clamp sub-scores to their configured maximums — AI sometimes exceeds them
    const expMax = defaultWeights?.experience_weight ?? 25
    const certMax = defaultWeights?.certification_weight ?? 20
    const motivMax = defaultWeights?.motivation_weight ?? 20
    const profMax = defaultWeights?.profile_weight ?? 20
    const compMax = 15

    const clampedExp  = Math.min(expMax,   Math.max(0, result.experience_score    || 0))
    const clampedCert = Math.min(certMax,  Math.max(0, result.certification_score || 0))
    const clampedMotiv= Math.min(motivMax, Math.max(0, result.motivation_score    || 0))
    const clampedProf = Math.min(profMax,  Math.max(0, result.profile_score       || 0))
    const clampedComp = Math.min(compMax,  Math.max(0, result.completeness_score  || 0))
    // overall_score is the authoritative sum — no more AI-invented totals
    const computedOverall = clampedExp + clampedCert + clampedMotiv + clampedProf + clampedComp

    const sanitisedResult = {
      ...result,
      experience_score:    clampedExp,
      certification_score: clampedCert,
      motivation_score:    clampedMotiv,
      profile_score:       clampedProf,
      completeness_score:  clampedComp,
      overall_score:       computedOverall,
    }

    // UPDATE the specific record by ID — preserves history
    await supabase
      .from('applicant_quest_scores')
      .update({
        ...sanitisedResult,
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', scoreId)

    // Cache latest score on the parent record
    if (applicant_id) {
      await supabase
        .from('applicants')
        .update({ quest_score: sanitisedResult.overall_score })
        .eq('id', applicant_id)
    }

    return NextResponse.json({ success: true, score: sanitisedResult.overall_score, score_id: scoreId })
  } catch (err) {
    console.error('Quest scoring error:', err)
    await supabase
      .from('applicant_quest_scores')
      .update({ status: 'failed' })
      .eq('id', scoreId)
    return NextResponse.json({ error: 'Scoring failed', detail: String(err) }, { status: 500 })
  }
}
