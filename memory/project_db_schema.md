---
name: Supabase DB Schema
description: All tables, columns, and RLS rules relevant to BREW
type: project
---

**Core tables**

`applicants` — job applicants
- id, full_name, email, phone, birth_date, domicile, instagram_url
- position_applied, outlet_preference, job_posting_id (FK → job_postings)
- has_cafe_experience (bool), cafe_experience_years (int), cafe_experience_detail
- has_barista_cert (bool), cert_detail
- education_level, hr_notes (applicant motivation text)
- screening_notes (TEXT) — HR guidance for Quest AI scoring
- source, status, pipeline_stage, quest_score (cached overall score)
- created_at

`job_postings` — open positions
- id, job_id (slug), title, department, location, outlet
- employment_type, salary_display, description, requirements
- min_experience_years, required_certifications (array), ai_screening_notes
- is_active (bool), is_urgent (bool), created_at

`applicant_quest_scores` — scoring history (one row per run)
- id, applicant_id (FK), employee_id (FK)
- status: pending | processing | completed | failed
- overall_score, experience_score, certification_score, completeness_score, motivation_score, profile_score
- summary, strengths (array), concerns (array), recommendation, quest_notes
- processed_at, created_at

`scoring_weights` — HR-configurable scoring weight presets
- id, name, is_default (bool)
- experience_weight, certification_weight, education_weight, motivation_weight, profile_weight (all int, must sum to 100)
- custom_note (guidance text for Quest AI)
- created_at

`tests` — HR-created assessments
- id, title, description, instructions, time_limit_minutes, passing_score, is_active, created_at

`test_questions` — questions inside a test
- id, test_id (FK), question_text, question_image_url, question_type (multiple_choice | text)
- options (JSONB), correct_answer, points, order_index

`applicant_tests` — test sessions sent to candidates
- id, applicant_id (FK), test_id (FK)
- access_code (UNIQUE) — one-time code like "X1283"
- status: pending | started | completed | expired
- score, score_percentage, total_points, answers (JSONB)
- sent_at, started_at, completed_at, expires_at (default NOW()+7days)

`employees`, `employee_timeline`, `employee_evaluations`, `employee_kpis`, `employee_leaves`, `employee_document_status` — karyawan module

**RLS policies**
- All tables: `authenticated` role has full access
- `tests`, `test_questions`, `applicant_tests`: `anon` can SELECT
- `applicant_tests`: `anon` can UPDATE (for test submission)
- New tables created 2026-04-06; `screening_notes` column added to `applicants`

**Why:** Reference before any DB queries or migrations to avoid recreating existing columns/tables.
**How to apply:** Use `supabase db query --linked` for migrations. Always check existing schema before ALTERing.
