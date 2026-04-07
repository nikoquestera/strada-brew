---
name: Completed Features
description: All features built and deployed as of 2026-04-07
type: project
---

**Quest AI Scoring (fully working)**
- Route: `POST /api/quest/score` — fetches applicant + job context, runs Claude, saves to `applicant_quest_scores`
- Holistic narrative prompt (not element-by-element) — evaluates candidate as a whole picture
- Sub-scores clamped server-side to configured maxes; `overall_score` = computed sum (fixes AI overflow bug, e.g. 23/20)
- Reads default `scoring_weights` from DB and adjusts score ranges + prompt priority
- Incorporates `screening_notes` from HR into prompt
- Scoring history preserved per run (multiple rows per applicant)
- Real-time polling (3s interval) on both rekrutmen list and applicant detail pages
- Fix: spinner now stays until fresh score fetched from DB (was disappearing before data arrived)

**Scoring Weightage UI** — `/dashboard/hrd/rekrutmen/weights`
- Visual slider per dimension (Pengalaman, Sertifikasi, Pendidikan, Motivasi, Profil)
- Total must equal exactly 100 — save button disabled otherwise
- Multiple named configs; one marked as default, used by Quest AI automatically
- "Scoring Weights" added to sidebar nav

**Edit Applicant (Features 3 & 7)**
- "Edit Data" button in applicant detail top bar
- Modal form with all editable fields (name, contact, experience, certs, education, motivation)
- Saves to DB, updates UI immediately without page reload

**Screening Notes (Feature 6)**
- Card in applicant detail left column
- HR types guidance for Quest AI (e.g. "prioritize specialty coffee for Senopati outlet")
- Saves to `screening_notes` column, included in next scoring run prompt

**Email Notification Fix (Feature 1)**
- `apply/page.tsx` now sends full form data alongside `applicant_id` to notify route
- Route accepts both `{ applicant: {...} }` and inline fields via `body.applicant ?? body`
- Returns HTTP 200 even on Resend failure (non-blocking for applicant)
- Logs Resend errors with status code for debugging

**Mobile-ready Apply Page**
- All grids collapse to 1 column on <540px
- Input font-size: 16px everywhere (prevents iOS Safari auto-zoom)
- Buttons min-height: 52px, full-width on mobile
- Toggle switches enlarged, smooth scroll on step transitions

**Job Detail Page before Apply (Feature 9)**
- `/jobs/[id]` — public page showing full job description, salary, location, requirements
- Apply job list cards now link to `/jobs/[job_id]` ("Lihat →") instead of directly opening the form
- "Lamar Sekarang →" on detail page goes to `/apply?job=xxx` which pre-selects the job

**UI/UX Hover Fixes**
- `globals.css` — added `.brew-nav-btn`, `.brew-btn-teal`, `.brew-btn-dark`, `.brew-table-row`, `.brew-card`, `.brew-action-link` hover classes
- KaryawanDetailClient tab hover fixed: was `color: #020000` on dark bg (invisible) → now `color: #fff`
- All action buttons across karyawan, rekrutmen, jobs pages have proper hover feedback

**Strada Logo in Sidebar**
- `public/strada-logo.svg` — coffee circle mark + STRADA wordmark + COFFEE tagline
- Used in: DashboardShell sidebar, apply page header/footer, email notification
- **User wants to replace this with their actual brand logo** — pending file upload

**HRD Dashboard**
- Pipeline stages with color-coded kanban
- Message templates (WhatsApp/Email) via Quest AI
- Job Posting management (create, toggle active/inactive, preview)
- Karyawan (employee) detail with tabs: Profil, Timeline, Evaluasi, KPI, Cuti, Dokumen
