export type UserRole = 'hrd' | 'finance' | 'warehouse' | 'purchasing' | 'audit' | 'management'

export type Entity = 'CV_KTN' | 'CV_PRI' | 'PT_BSB'

export type EmploymentType = 'PKWT' | 'PKWTT' | 'Freelance' | 'Magang'

export type EmployeeStatus = 'active' | 'inactive' | 'resigned' | 'terminated'

export type ApplicantStatus =
  | 'new' | 'screening' | 'shortlisted' | 'interview_scheduled'
  | 'interviewed' | 'offered' | 'accepted' | 'rejected' | 'withdrawn'

export interface Employee {
  id: string
  employee_id: string
  full_name: string
  nick_name?: string
  email?: string
  phone?: string
  position: string
  department: string
  entity: Entity
  outlet?: string
  employment_type?: EmploymentType
  contract_start?: string
  contract_end?: string
  join_date: string
  base_salary?: number
  status: EmployeeStatus
  created_at: string
  updated_at: string
}

export interface Applicant {
  id: string
  full_name: string
  email: string
  phone: string
  position_applied: string
  outlet_preference?: string
  entity_target?: Entity
  source?: string
  apply_date: string
  has_cafe_experience: boolean
  cafe_experience_years: number
  has_barista_cert: boolean
  screening_score: number
  status: ApplicantStatus
  cv_file?: string
  instagram_url?: string
  hr_notes?: string
  created_at: string
}

export interface PayrollItem {
  id: string
  employee_id: string
  working_days: number
  present_days: number
  absent_days: number
  late_count_under_30: number
  late_count_over_30: number
  base_salary: number
  overtime_pay: number
  service_charge: number
  late_deduction: number
  absent_deduction: number
  gross_salary: number
  total_deductions: number
  net_salary: number
}

// ============================================
// QUEST AI BOT TYPES
// ============================================

export type PipelineStage =
  | 'baru_masuk' | 'perlu_direview' | 'sedang_direview' | 'shortlisted'
  | 'dihubungi' | 'interview_dijadwalkan' | 'sudah_diinterview' | 'pertimbangan_akhir'
  | 'penawaran_dikirim' | 'menunggu_jawaban' | 'diterima' | 'menunggu_onboarding'
  | 'onboarded' | 'probation_berjalan' | 'probation_hampir_selesai' | 'karyawan_tetap'
  | 'tidak_cocok' | 'mengundurkan_diri' | 'tidak_hadir_interview'
  | 'penawaran_ditolak' | 'on_hold'

export const PIPELINE_STAGES: { key: PipelineStage; label: string; color: string; group: 'active' | 'closed' }[] = [
  { key: 'baru_masuk',              label: 'Baru Masuk',              color: '#8FC6C5', group: 'active' },
  { key: 'perlu_direview',          label: 'Perlu Direview',          color: '#DE9733', group: 'active' },
  { key: 'sedang_direview',         label: 'Sedang Direview',         color: '#037894', group: 'active' },
  { key: 'shortlisted',             label: 'Shortlisted',             color: '#005353', group: 'active' },
  { key: 'dihubungi',               label: 'Dihubungi',               color: '#037894', group: 'active' },
  { key: 'interview_dijadwalkan',   label: 'Interview Dijadwalkan',   color: '#82A13B', group: 'active' },
  { key: 'sudah_diinterview',       label: 'Sudah Diinterview',       color: '#82A13B', group: 'active' },
  { key: 'pertimbangan_akhir',      label: 'Pertimbangan Akhir',      color: '#DE9733', group: 'active' },
  { key: 'penawaran_dikirim',       label: 'Penawaran Dikirim',       color: '#005353', group: 'active' },
  { key: 'menunggu_jawaban',        label: 'Menunggu Jawaban',        color: '#8A8A8D', group: 'active' },
  { key: 'diterima',                label: 'Diterima',                color: '#005353', group: 'active' },
  { key: 'menunggu_onboarding',     label: 'Menunggu Onboarding',     color: '#037894', group: 'active' },
  { key: 'onboarded',               label: 'Onboarded',               color: '#82A13B', group: 'active' },
  { key: 'probation_berjalan',      label: 'Probation Berjalan',      color: '#DE9733', group: 'active' },
  { key: 'probation_hampir_selesai',label: 'Probation Hampir Selesai',color: '#FF4F31', group: 'active' },
  { key: 'karyawan_tetap',          label: 'Karyawan Tetap',          color: '#005353', group: 'active' },
  { key: 'tidak_cocok',             label: 'Tidak Cocok',             color: '#8A8A8D', group: 'closed' },
  { key: 'mengundurkan_diri',       label: 'Mengundurkan Diri',       color: '#8A8A8D', group: 'closed' },
  { key: 'tidak_hadir_interview',   label: 'Tidak Hadir Interview',   color: '#FF4F31', group: 'closed' },
  { key: 'penawaran_ditolak',       label: 'Penawaran Ditolak',       color: '#FF4F31', group: 'closed' },
  { key: 'on_hold',                 label: 'On Hold',                 color: '#4C4845', group: 'closed' },
]

export interface JobPosting {
  id: string
  job_id: string
  title: string
  department: string
  entity: Entity
  outlet?: string
  location: string
  employment_type: string
  salary_display?: string
  description: string
  requirements: string
  responsibilities: string
  benefits?: string
  ai_screening_notes?: string
  min_experience_years: number
  is_active: boolean
  is_urgent: boolean
  deadline?: string
  applicant_count: number
  created_at: string
}

export interface QuestScore {
  id: string
  applicant_id: string
  overall_score?: number
  experience_score?: number
  certification_score?: number
  completeness_score?: number
  motivation_score?: number
  profile_score?: number
  summary?: string
  strengths?: string[]
  concerns?: string[]
  recommendation?: 'Highly Recommended' | 'Recommended' | 'Consider' | 'Not Recommended'
  quest_notes?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  processed_at?: string
}

export interface ApplicantActivity {
  id: string
  applicant_id: string
  activity_type: string
  from_stage?: string
  to_stage?: string
  note?: string
  metadata?: Record<string, unknown>
  created_at: string
}