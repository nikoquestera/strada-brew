---
name: Completed Features
description: All features built and deployed as of 2026-04-24
type: project
---

**HRD Dashboard Full Audit & Bug Fixes (2026-04-24)**
- DB: `employee_timeline_event_type_check` constraint updated to include `'internal_note'` event type
- DB: `happiest_workplace` column added to `employees` (was missing, caused Personalia form submit to fail)
- DB: RLS on `employee_timeline` — added explicit anon+authenticated policies
- Catatan Internal HR: save now uses optimistic update — note appears immediately after Simpan
- Catatan Screening (rekrutmen): same optimistic update fix
- KaryawanDetailClient Profil tab: now shows data from both new AND legacy column names (bpjs_kesehatan_number || bpjs_kesehatan, address_ktp || address, etc.)
- KaryawanDetailClient editForm: initialized with fallbacks so old employees show correct values
- KaryawanDetailClient handleUpdateProfil: now writes to both old and new column names on save
- KaryawanBaruPage: now saves to both old columns (bpjs_kesehatan, bpjs_tk, npwp, address) AND new columns (bpjs_kesehatan_number, bpjs_ketenagakerjaan_number, npwp_number, address_ktp)
- Profil tab: added "Edit Profil" button inline (more discoverable), shows Grade + PKWT Ke-, Nama Bank, Catatan Khusus section

**CV/Resume Upload & Display (2026-04-23)**
- Apply form: optional CV upload in step 3, uploads directly to Supabase storage `cvs` bucket
- `applicants.cv_url` column stores the public URL
- Rekrutmen detail: CV section in left column — shows iframe for PDF, download link; HR can also upload
- Karyawan detail: CV tab shows linked applicant's CV (via `employees.applicant_id` → `applicants.cv_url`)
- HR can update CV from either the rekrutmen or karyawan view

**Catatan Internal HR — dedicated tab (2026-04-23)**
- Moved from Profil tab to its own "Catatan" tab (next to Dokumen)
- Notes saved with timestamp to `employee_timeline` (event_type='internal_note')
- Combined view: pre-hire screening notes (from `applicant_activities`) + post-hire internal notes (from `employee_timeline`) shown together, labeled by phase (Fase Rekrutmen vs Internal HR)
- Requires `employees.applicant_id` link to show pre-hire notes; works without link for standalone employees
- Catatan Screening Internal (rekrutmen page) already existed and saves timestamped entries with actor name

**Profil tab restored (2026-04-23)**
- Employee profile data now visible in Profil tab: Identitas & Kontak, Alamat, Informasi Pekerjaan, Data Keuangan
- Was accidentally removed — now shows read-only cards with all filled employee fields

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
