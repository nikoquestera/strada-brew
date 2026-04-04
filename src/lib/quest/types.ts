export interface QuestScoringInput {
  applicant: {
    full_name: string
    has_cafe_experience: boolean
    cafe_experience_years: number
    cafe_experience_detail?: string
    has_barista_cert: boolean
    cert_detail?: string
    education_level?: string
    instagram_url?: string
    motivation?: string
    domicile?: string
    position_applied: string
  }
  job?: {
    title: string
    min_experience_years: number
    required_certifications?: string[]
    ai_screening_notes?: string
    location?: string
  }
}

export interface QuestScoringResult {
  overall_score: number
  experience_score: number
  certification_score: number
  completeness_score: number
  motivation_score: number
  profile_score: number
  summary: string
  strengths: string[]
  concerns: string[]
  recommendation: 'Highly Recommended' | 'Recommended' | 'Consider' | 'Not Recommended'
  quest_notes: string
}

export interface QuestMessageOptions {
  applicant_name: string
  position: string
  stage: string
  company_context?: string
}

export interface MessageTemplateOptions {
  applicant_name: string
  position: string
  outlet?: string
  stage: string
  interview_date?: string
  interview_location?: string
  hr_name?: string
}