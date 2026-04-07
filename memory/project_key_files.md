---
name: Key File Locations
description: Important files and what they do — quick navigation reference
type: project
---

**Public / applicant-facing**
- `src/app/apply/page.tsx` — multi-step application form (mobile-first, 3 steps)
- `src/app/jobs/[id]/page.tsx` — public job detail page before apply form
- `src/app/layout.tsx` — root layout; sets Inter font + viewport meta

**HRD Dashboard**
- `src/app/dashboard/hrd/page.tsx` — overview with quick action cards
- `src/app/dashboard/hrd/rekrutmen/page.tsx` — applicant pipeline list
- `src/app/dashboard/hrd/rekrutmen/RekrutmenClient.tsx` — pipeline client; includes QuestScoreWidget
- `src/app/dashboard/hrd/rekrutmen/[id]/page.tsx` — applicant detail server component (fetches data)
- `src/app/dashboard/hrd/rekrutmen/[id]/ApplicantDetailClient.tsx` — full applicant view; edit modal, screening notes, scoring
- `src/app/dashboard/hrd/rekrutmen/weights/WeightsClient.tsx` — scoring weightage UI
- `src/app/dashboard/hrd/jobs/JobsClient.tsx` — job posting management
- `src/app/dashboard/hrd/karyawan/[id]/KaryawanDetailClient.tsx` — employee detail tabs
- `src/components/DashboardShell.tsx` — sidebar nav + mobile header; contains nav list

**API Routes**
- `src/app/api/quest/score/route.ts` — trigger Quest AI scoring; clamps scores server-side
- `src/app/api/quest/templates/route.ts` — generate WhatsApp/email message templates
- `src/app/api/notify/new-applicant/route.ts` — send HRD email via Resend on new application
- `src/app/api/documents/generate/route.ts` — document generation

**Quest AI**
- `src/lib/quest/scorer.ts` — Anthropic API call; holistic narrative prompt; reads scoring weights
- `src/lib/quest/types.ts` — QuestScoringInput, QuestScoringResult, ScoringWeights interfaces

**Shared**
- `src/lib/supabase/client.ts` — browser Supabase client
- `src/lib/supabase/server.ts` — server Supabase client
- `src/lib/types.ts` — PIPELINE_STAGES, PipelineStage type
- `src/app/globals.css` — global hover utility classes (brew-nav-btn, brew-btn-teal, etc.)
- `public/strada-logo.svg` — current placeholder logo (to be replaced with real brand logo)
