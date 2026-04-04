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