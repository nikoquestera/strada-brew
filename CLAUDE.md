# BREW — Strada Coffee Internal Portal
## Claude Code Project Prompt · May 2026

---

## WHO YOU ARE WORKING WITH

You are working with **Niko**, the primary technical implementer and de facto CTO for **Strada Coffee Indonesia** (CV Kopi Terbaik Nusantara / CV KTN). Strada is an Indonesian specialty coffee brand founded in 2012 by **Evani Jesslyn**, currently operating 7 outlets across Jakarta and Semarang.

**BREW** (brew.stradacoffee.com) is the internal operations portal — not a public site. It is the single system for HR, finance, ops, warehouse, and purchasing management across all outlets.

Niko makes all technical decisions. When you need clarification, ask one specific question rather than multiple. Default to building complete, production-ready code.

---

## TECH STACK (exact versions — do not assume)

```
Framework:    Next.js 16.2.2 (App Router, NOT pages router)
React:        19.2.4
TypeScript:   5.x
Styling:      Tailwind CSS 4.x (no class-based purge, uses @import)
Database:     Supabase (project: yalgiinueczpmrolisdd)
Auth:         Supabase Auth + SSR (@supabase/ssr 0.10.0)
Hosting:      Vercel (auto-deploy from GitHub main branch)
Repo:         github.com/nikoquestera/strada-brew
AI:           Anthropic API (claude-sonnet-4-20250514)
Email:        Resend (from brew@stradacoffee.com)
Doc gen:      pizzip + docxtemplater (DOCX placeholder fill)
Icons:        lucide-react 1.7.0
```

**Installed packages:**
```json
"@supabase/ssr": "^0.10.0",
"@supabase/supabase-js": "^2.101.1",
"docxtemplater": "^3.68.3",
"lucide-react": "^1.7.0",
"next": "16.2.2",
"pizzip": "^3.2.0",
"react": "19.2.4",
"react-dom": "19.2.4"
```

**Packages to install when needed:**
```bash
npm install googleapis          # Google Sheets API (Ops module)
npm install xlsx                # Excel file parsing (schedule/report parsing)
```

---

## CRITICAL RULES — READ BEFORE WRITING ANY CODE

1. **App Router only.** All routes use `src/app/` directory. Never use `pages/`. Server components are default — add `'use client'` only when needed (state, effects, browser APIs).

2. **Supabase client pattern:**
   - Server components / API routes: `import { createClient } from '@/lib/supabase/server'` → `const supabase = await createClient()`
   - Client components: `import { createClient } from '@/lib/supabase/client'` → `const supabase = createClient()`
   - Never import the wrong one for the context — it will break auth.

3. **Auth pattern for protected pages:**
   ```typescript
   // In layout.tsx or page.tsx (server component)
   const supabase = await createClient()
   const { data: { user }, error } = await supabase.auth.getUser()
   if (error || !user) redirect('/login')
   ```

4. **TypeScript strictly.** All new files must be `.ts` or `.tsx`. No `any` types unless explicitly unavoidable — use proper interfaces.

5. **No inline styles for layout structure** — use Tailwind classes. Inline styles only for brand colors/values that aren't in the Tailwind config.

6. **API routes** go in `src/app/api/[route]/route.ts` and export named `GET`, `POST`, etc. Never use default exports in route files.

7. **Environment variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL        = https://yalgiinueczpmrolisdd.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY   = [from Supabase dashboard]
   RESEND_API_KEY                  = re_FQBwKdP1_FpChY99xmBtzL4K1eUi1N2MM
   HRD_EMAIL                       = niko.questera@gmail.com
   ANTHROPIC_API_KEY               = [from Anthropic dashboard]
   GOOGLE_SERVICE_ACCOUNT_JSON     = [full JSON string of service account]
   ```
   Never hardcode these. Access via `process.env.VAR_NAME`.

8. **Brand colors** — always use these exact hex values:
   ```
   Strada Blue:  #037894   (primary CTA, active states)
   Coffee Black: #020000   (sidebar background, dark elements)
   Foam White:   #E4DED8   (primary text on dark)
   Light Teal:   #8FC6C5   (secondary accent)
   Charcoal:     #4C4845   (secondary backgrounds)
   Gray:         #8A8A8D   (muted text)
   Coral:        #FF4F31   (warnings, alerts)
   Amber:        #DE9733   (caution states, morning shift)
   Dark Teal:    #005353   (hover states on blue)
   Forest:       #233212   (kitchen division color)
   Olive:        #82A13B   (kitchen accent)
   ```

9. **All money in IDR (Indonesian Rupiah).** Format as `Rp X.XXX.XXX` with dots as thousand separators.

10. **Language:** UI text in Indonesian where it's user-facing operational content. Code, comments, and variable names in English.

---

## PROJECT FILE STRUCTURE

```
strada-brew/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx                       ← Root layout
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── apply/
│   │   │   └── page.tsx                     ← Public job application form
│   │   └── dashboard/
│   │       ├── hrd/
│   │       │   ├── layout.tsx               ← Auth guard + DashboardShell
│   │       │   ├── page.tsx                 ← HRD Overview
│   │       │   ├── karyawan/
│   │       │   │   ├── page.tsx             ← Employee list
│   │       │   │   ├── baru/page.tsx        ← Add new employee
│   │       │   │   └── [id]/
│   │       │   │       ├── page.tsx
│   │       │   │       └── KaryawanDetailClient.tsx
│   │       │   ├── rekrutmen/
│   │       │   │   ├── page.tsx             ← ATS (now client-side w/ Realtime)
│   │       │   │   ├── RekrutmenClient.tsx
│   │       │   │   └── [id]/
│   │       │   │       ├── page.tsx
│   │       │   │       └── ApplicantDetailClient.tsx
│   │       │   ├── jobs/
│   │       │   │   ├── page.tsx
│   │       │   │   └── JobsClient.tsx
│   │       │   ├── dokumen/
│   │       │   │   └── page.tsx
│   │       │   └── payroll/
│   │       │       └── page.tsx
│   │       └── ops/                         ← NEW: Ops Manager module (in build)
│   │           ├── layout.tsx
│   │           ├── page.tsx                 ← Ops Overview (redirect to performance)
│   │           ├── performance/
│   │           │   └── page.tsx             ← 7-outlet performance dashboard
│   │           └── schedule/
│   │               └── page.tsx             ← Daily schedule viewer
│   ├── components/
│   │   └── DashboardShell.tsx               ← Sidebar nav, role-aware, mobile responsive
│   ├── lib/
│   │   ├── types.ts                         ← All shared TypeScript types
│   │   ├── quest/
│   │   │   ├── index.ts
│   │   │   ├── scorer.ts                    ← Claude API scoring logic
│   │   │   └── templates.ts
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   └── ops/
│   │       ├── performanceParser.ts         ← Google Sheets row parser (7 outlets × 3 periods)
│   │       └── scheduleParser.ts            ← Schedule Excel parser (5 outlet formats)
│   └── proxy.ts
├── supabase/
│   └── functions/
│       └── contract-reminder/
│           └── index.ts                     ← Daily cron for contract expiry alerts
├── CLAUDE.md                                ← This file
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## DATABASE SCHEMA

**Supabase project:** `yalgiinueczpmrolisdd`
**URL:** `https://yalgiinueczpmrolisdd.supabase.co`

### Tables

```sql
-- Auth
brew_users (
  id uuid PK,
  email text,
  role text CHECK role IN ('hrd', 'ops_manager', 'finance', 'warehouse', 'purchasing', 'admin'),
  full_name text,
  created_at timestamptz
)

-- HR Core
employees (
  id uuid PK,
  employee_id text UNIQUE,          -- STD00001 format
  full_name text,
  position text,
  department text,
  outlet text,
  join_date date,
  contract_type text,               -- PKWT | PKWTT
  contract_start date,
  contract_end date,
  contract_period_text text,
  pkwt_ke integer,
  trial_position text,
  trial_period text,
  trial_salary numeric,
  base_salary numeric,
  tunjangan jsonb,
  grade text,
  sp_status integer DEFAULT 0,      -- 0=none, 1=SP1, 2=SP2, 3=SP3
  sp_period text,
  status text DEFAULT 'active',
  -- Personal
  nik_ktp text,
  npwp text,
  place_of_birth text,
  date_of_birth date,
  marital_status text,
  address text,
  phone_number text,
  email text,
  emergency_contact_name text,
  emergency_contact_phone text,
  education text,
  -- Benefits
  bpjs_tk text,
  bpjs_kesehatan text,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  -- Internal
  supervisor_name text,
  office_location text,
  gdrive_link text,
  pkwt_doc_number text,
  pkwt_link text,
  training_checklist jsonb,
  case_notes text,
  created_at timestamptz,
  updated_at timestamptz
)

-- Recruitment
job_postings (
  id uuid PK,
  job_id text UNIQUE,               -- JOB-001 format
  title text,
  department text,
  location text,
  type text,                        -- Full-time | Part-time | Contract
  status text DEFAULT 'active',     -- active | closed | draft
  description text,
  requirements text,
  min_experience_years integer,
  required_certifications text[],
  ai_screening_notes text,          -- Quest AI uses this for scoring context
  created_at timestamptz
)

applicants (
  id uuid PK,
  job_id uuid REFERENCES job_postings,
  full_name text,
  email text,
  phone text,
  domicile text,
  has_cafe_experience boolean,
  cafe_experience_years integer,
  cafe_experience_detail text,
  has_barista_cert boolean,
  cert_detail text,
  education_level text,
  instagram_url text,
  motivation text,
  pipeline_stage text DEFAULT 'baru_masuk',
  hr_notes text,
  created_at timestamptz
)

applicant_quest_scores (
  id uuid PK,
  applicant_id uuid REFERENCES applicants,
  status text DEFAULT 'pending',    -- pending | scored | error
  overall_score integer,
  experience_score integer,
  certification_score integer,
  motivation_score integer,
  profile_score integer,
  completeness_score integer,
  recommendation text,
  summary text,
  strengths text[],
  concerns text[],
  quest_notes text,
  scored_at timestamptz,
  created_at timestamptz
)

applicant_activities (
  id uuid PK,
  applicant_id uuid REFERENCES applicants,
  activity_type text,
  note text,
  created_by text,
  created_at timestamptz
)

-- Documents
document_templates (
  id text PK,                       -- anti_suap, nda, etc.
  name text,
  type text,                        -- generate | view_only
  description text,
  storage_path text,
  placeholders text[],
  created_at timestamptz
)

employee_document_status (
  id uuid PK,
  employee_id uuid REFERENCES employees,
  doc_id text REFERENCES document_templates,
  status text DEFAULT 'pending',    -- pending | generated | signed | viewed
  generated_at timestamptz,
  storage_path text
)

document_checklist_templates (
  id uuid PK,
  doc_id text,
  label text,
  required boolean,
  phase text                        -- onboarding | probation | permanent
)

-- Employee tracking
employee_timeline (
  id uuid PK,
  employee_id uuid REFERENCES employees,
  event_type text,                  -- hired | promoted | contract_renewed | sp | terminated
  description text,
  effective_date date,
  created_by text,
  created_at timestamptz
)

employee_evaluations (id, employee_id, period, score, notes, created_at)
employee_kpis (id, employee_id, period, metric, target, actual, created_at)
employee_leaves (id, employee_id, type, start_date, end_date, status, notes, created_at)
employee_leave_balance (id, employee_id, year, annual_quota, used, remaining)

-- Payroll
payroll_runs (id, period, status, run_by, created_at)
payroll_items (id, run_id, employee_id, base, tunjangan, deductions, net, created_at)

-- Other
whatsapp_contacts (id, phone, name, tags, created_at)
communication_templates (id, stage, type, subject, body, created_at)
contract_reminders (id, employee_id, contract_end, reminded_at, created_at)
attendance_uploads (id, period, filename, status, imported_count, created_at)
```

### Realtime enabled tables
```sql
alter publication supabase_realtime add table applicants;
alter publication supabase_realtime add table applicant_quest_scores;
```

### Pipeline stages (21 total)
```
Active:
  baru_masuk → perlu_direview → sedang_direview → shortlisted → dihubungi
  → interview_dijadwalkan → sudah_diinterview → pertimbangan_akhir
  → penawaran_dikirim → menunggu_jawaban → diterima → menunggu_onboarding
  → onboarded → probation_berjalan → probation_hampir_selesai → karyawan_tetap

Closed:
  tidak_cocok | mengundurkan_diri | tidak_hadir_interview | penawaran_ditolak | on_hold
```

---

## COMPLETED MODULES (do not rebuild — only extend or fix)

### ✅ Auth + RBAC
- Login page at `/login`
- Supabase Auth with session via SSR cookies
- Middleware at `src/middleware.ts` protects `/dashboard/*`
- `brew_users` table stores roles

### ✅ HRD Module (`/dashboard/hrd/*`)
- **Overview** — contract expiry alerts, headcount by outlet, recent activity
- **Karyawan list** — 115 employees imported, filterable by outlet/dept/status
- **Karyawan detail** — 6 tabs: Profil, Timeline, KPI, Evaluasi, Cuti, Dokumen
- **Add employee** — full accordion form, writes to `employees` table
- **Rekrutmen (ATS)** — kanban-style pipeline, Supabase Realtime live updates, batch Quest scoring button
- **Applicant detail** — Quest score display, stage changer, message template generator
- **Jobs** — job posting CRUD, Quest AI screening notes field
- **Dokumen** — template registry, upload DOCX, generate button per employee
- **Payroll** — placeholder, pending Talenta CSV calibration

### ✅ Quest AI (`/api/quest/*`)
- Model: `claude-sonnet-4-20250514`
- Scoring: 5 dimensions (Experience 25, Certification 20, Motivation 20, Profile 20, Completeness 15)
- Recommendations: Highly Recommended (75+) | Recommended (60-74) | Consider (40-59) | Not Recommended (<40)
- Endpoints: `/api/quest/score` (single), `/api/quest/score-batch` (10/call with 1.5s delay), `/api/quest/templates`
- Auto-trigger: on new applicant submit
- Manual trigger: "Run Score" button on applicant detail
- Batch trigger: "✦ Run Quest Batch" button in Rekrutmen page

### ✅ Document Generator
- API: `POST /api/documents/generate` → `{ employee_id, doc_id }`
- Templates in Supabase Storage bucket: `document-templates`
- Path: `templates/{doc_id}.docx`
- Generated files: `generated/{employee_id}/{doc_id}_{timestamp}.docx`
- Placeholders: `{{NAMA_LENGKAP}}`, `{{JABATAN}}`, `{{GAJI_POKOK}}` etc. (see list below)
- Empty fields → auto becomes `[___________]`
- Library: pizzip + docxtemplater (already installed)

### ✅ Contract Reminder Edge Function
- Location: `supabase/functions/contract-reminder/index.ts`
- Runs daily, emails HRD 14 days before contract end
- **NOT YET DEPLOYED** — deploy with:
  ```bash
  supabase login
  supabase link --project-ref yalgiinueczpmrolisdd
  supabase functions deploy contract-reminder
  supabase secrets set RESEND_API_KEY=re_FQBwKdP1_FpChY99xmBtzL4K1eUi1N2MM
  supabase secrets set HRD_EMAIL=niko.questera@gmail.com
  ```

---

## IN-PROGRESS: OPS MANAGER MODULE

**Route:** `/dashboard/ops/*`
**User role:** `ops_manager` (add to `brew_users.role` CHECK constraint and `DashboardShell` nav)
**Primary user:** Rinda (create account: rinda@stradacoffee.com, role: ops_manager)

### Architecture decisions (already made — follow these)
- **Google Sheets direct pull** — no Supabase caching. Data is read live from the outlet's actual Google Sheets.
- **Manual refresh** — Rinda clicks Refresh. No cron, no polling.
- **Same Google Service Account** for all Sheets. Store credential as `GOOGLE_SERVICE_ACCOUNT_JSON` env var.
- **Install:** `npm install googleapis`

### Sub-module 1: Performance Dashboard

**Route:** `/dashboard/ops/performance`

**Data sources:** 21 Google Sheets (7 outlets × 3 report types)

| Outlet | Outlet ID |
|--------|-----------|
| La Piazza | `la-piazza` |
| BSD | `bsd` |
| MKG | `mkg` |
| SMS | `sms` |
| SMB | `smb` |
| SMB Gold Lounge | `smb-gl` |
| Panen Semarang | `panen` |

**Report types:** monthly (`Report_Monthly_`), weekly (`Report_Weekly_`), daily (`Report_Daily_`)

**API route:** `GET /api/ops/refresh`
- Reads all 21 sheets in parallel via Google Sheets API
- Returns normalized JSON per outlet per report type
- Uses `performanceParser.ts` in `src/lib/ops/`

**Parser — confirmed row indices (0-based) from actual files:**

Monthly format (`Report_Monthly_-_Strada_La_Piazza.xlsx`):
```
Row 4:   Net Sales Target
Row 5:   Net Sales Actual
Row 6:   Achievement %
Row 20:  AT Target
Row 21:  AT Actual
Row 59:  Top Beverage (TOP 1)
Row 65:  Bottom Beverage
Row 71:  Top Main Course
Row 77:  Bottom Main Course
Row 84:  Top Cake
Row 90:  Bottom Cake
Row 96:  Top Waste Bar
Row 102: Top Waste Kitchen
Row 108: Top Waste Floor
Row 114: COGS Bar   → raw string: "22.97 % = Rp. 76.839.056"
Row 115: COGS Kitchen
Row 116: COGS Floor
Row 117: COGS Merch & Cake
Row 135: Top Merchandise Seller
```

Weekly format (`Report_Weekly_-_SMS.xlsx`):
```
Row 5:  Net Sales Target
Row 6:  Net Sales Quinos (actual)
Row 7:  Net Sales Point (actual)
Row 8:  Total Net Sales Actual
Row 9:  Achievement %
Row 26: AT Target
Row 27: AT Actual
Row 52: Top Beverage
Row 58: Bottom Beverage
Row 64: Top Cake
Row 70: Bottom Cake
Row 76: Top Waste
```

Daily format (`Report_Daily_-_Strada_Summitmas.xlsx`):
```
Row 5:  Net Sales Target
Row 6:  Net Sales Actual
Row 7:  Achievement %
Row 17: AT Target
Row 18: AT Actual
```

COGS parser: `"22.97 % = Rp. 76.839.056"` → `{ pct: 22.97, amount: 76839056 }`

Sheet tab finder logic:
- Monthly: year tabs ("2026") → find column where row[2] matches current month
- Weekly: month tabs ("MEI 26", "APR 26") → find column whose row[3] date range contains today
- Daily: week tabs ("11 - 17 AGUSTUS") → find column where row[3] matches today

**Note:** SMS weekly has no Main Course section.

### Sub-module 2: Schedule Dashboard

**Route:** `/dashboard/ops/schedule`
**File:** `src/app/dashboard/ops/schedule/page.tsx` renders `ScheduleClient` component

**Parser file:** `src/lib/ops/scheduleParser.ts` — **already written and delivered**. Copy from output.

**API route:** `GET /api/ops/schedule?date=YYYY-MM-DD` — **already written and delivered**. Copy from output.

**UI component:** `ScheduleClient.tsx` — **already written and delivered**. Copy from output.

**The 5 outlet formats (confirmed from actual files):**

**BSD** (`SCHEDULE_STRADA_BSD.xlsx`):
- Sheet tabs: `"MEI 26"`, `"APR 26"` (month + 2-digit year)
- Row 2: date numbers (col D+)
- Row 3: day names
- Col B: division/role label (PIC, BAR, BARISTA, FLOOR, KOORDINATOR, SERVER)
- Col C: staff name
- Col D+: shift values
- Kitchen section starts row ~29 (no col B label, numeric times 6.0/14.0)

**La Piazza** (`JADWAL_STRADA_LAPIAZZA.xlsx`):
- Sheet tabs: `"SCHEDULE MEI"`, `"SCHEDULE APRIL"`
- Row 3: date numbers
- Row 4: day names
- Col A: name or role section label
- Col B: PH count (ignored)
- Col C+: shift values
- Kitchen section is lower half of same sheet (row ~37+)

**MKG** (`Schedule_Tim_Strada_MKG.xlsx`):
- Sheet tabs: `"4MEI-10MEI"`, `"30MAR-5APL"` (weekly date ranges, no spaces)
- Row 0: section label in col A (Head, Cashier, Floor, Housekeeping)
- Row 1: dates in col C+ (`"09/12"` or Date objects)
- Col A: section (applies to all rows until next section)
- Col B: full name
- Col C+: shift values

**SMB** (`JADWAL_STRADA_SMB.xlsx`):
- Sheet tabs: `"27 Apr - 24 Mei 2026"` (full date ranges)
- Two sections in same sheet (service rows 5–25, kitchen rows 31+)
- Row 3: date numbers
- Row 4: day names
- Col A: name or role label
- Col B: PH count (ignored)
- Col C+: shift values
- Kitchen section has its own date/day header rows (repeat around row 31)
- Staff names sometimes have `"// hours"` suffix — strip it

**SMB Gold Lounge** (`JADWAL_STRADA_SMB_GL.xlsx`):
- Sheet tabs: `"MAY 26"`, `"APRIL 26"` (month + 2-digit year)
- **Weekly blocks stacked vertically** in same sheet — each block is ~8 rows
- Block structure: Row 0 = `NAMA`/header, Row 1 = date numbers, Row 2 = day names, Row 3+ = staff
- Find the right block by scanning for `NAMA` rows, then checking if date numbers match
- Col A: name or role label
- Col B+: shift values

**Shift value formats to handle:**
```
"06:00:00"  → 06:00
"6.0"       → 06:00
"14"        → 14:00
"06:00 // SMS" → backup (SMS store)
"OFF"       → off
"OFFDAY"    → off
"CUTI"      → leave
"PH"        → leave (public holiday)
"SAKIT"     → leave
"IZIN"      → leave
"SMS", "LPZ", "MKG", "ACA" → backup
null/empty  → empty
```

**Division mapping:**
```
PIC:     PIC, HEAD, KOORDINATOR, CO.
BAR:     BARISTA, JR BARISTA, CASHIER, BAR
FLOOR:   SERVER, FLOOR, HF, HEADFLOOR
KITCHEN: COOK, HEAD KITCHEN, COOK HELPER, STEWARD, KITCHEN
HK:      HK, HOUSEKEEPING
```

**Shift badge colors:**
- Pagi (< 08:00): Amber `#DE9733`
- Siang (08:00–11:59): Strada Blue `#037894`
- Sore (≥ 12:00): Coral `#FF4F31`

**IMPORTANT: All 5 sheet IDs are placeholders in the delivered file.** When wiring up, replace `'YOUR_SHEET_ID_*'` in `OUTLET_SCHEDULE_FILES` with actual Google Sheet file IDs from the outlet managers' Google Drive.

### DashboardShell — add Ops module
When `ops_manager` role is detected, show an Ops nav section:
```typescript
const opsNav = [
  { label: 'Performance', href: '/dashboard/ops/performance', icon: BarChart2 },
  { label: 'Jadwal', href: '/dashboard/ops/schedule', icon: Calendar },
]
```
Import `BarChart2, Calendar` from lucide-react.

---

## PENDING FEATURES (build these next)

### Priority 1 — Ops Module wiring
1. Create `src/app/dashboard/ops/layout.tsx` (auth guard + DashboardShell, same pattern as HRD layout)
2. Create `src/app/dashboard/ops/page.tsx` (redirect to `/dashboard/ops/performance`)
3. Create `src/app/dashboard/ops/performance/page.tsx` (renders `OpsClient` component)
4. Create `src/app/dashboard/ops/schedule/page.tsx` (renders `ScheduleClient` component — already built)
5. Create `src/app/api/ops/refresh/route.ts` (performance data fetch)
6. Create `src/app/api/ops/schedule/route.ts` (schedule data fetch — already built)
7. Copy `scheduleParser.ts` to `src/lib/ops/scheduleParser.ts`
8. Write `performanceParser.ts` to `src/lib/ops/performanceParser.ts`
9. Update `DashboardShell.tsx` — add Ops nav for `ops_manager` role
10. Create `brew_users` entry for Rinda (email: rinda@stradacoffee.com, role: ops_manager)

### Priority 2 — ATS improvements
- Action buttons per pipeline stage: send WhatsApp/email using Quest templates
- Stage transition with auto-log to `applicant_activities`
- Bulk stage move for multiple selected applicants

### Priority 3 — Karyawan detail polish
- Editable fields with save button (currently read-only)
- SP (Surat Peringatan) management — issue SP1/SP2/SP3, track period
- Document checklist status per employee — mark as viewed/signed

### Priority 4 — Contract reminder deploy
- Deploy Edge Function (commands above under ✅ Contract Reminder section)

### Priority 5 — Purchasing & Warehouse Module (Phase 2)
- 14 DB tables designed (see separate spec)
- Roles: Chris (PO creation), Aaron (warehouse), Vetris (approver), Selena (finance)
- Par stock agent with 14/28/90-day rolling window
- AI-powered PDF price list import

---

## DOCUMENT PLACEHOLDER REFERENCE

Full list of `{{PLACEHOLDER}}` variables for DOCX templates:
```
{{NAMA_LENGKAP}}          {{ID_KARYAWAN}}           {{JABATAN}}
{{DEPARTEMEN}}            {{OUTLET}}                {{TANGGAL_BERGABUNG}}
{{GAJI_POKOK}}            {{TUNJANGAN}}             {{TIPE_KONTRAK}}
{{MULAI_KONTRAK}}         {{AKHIR_KONTRAK}}         {{PERIODE_KONTRAK}}
{{GOLONGAN}}              {{NIK_KTP}}               {{NPWP}}
{{ALAMAT}}                {{TEMPAT_LAHIR}}          {{TANGGAL_LAHIR}}
{{NO_HP}}                 {{EMAIL}}                 {{STATUS_PERNIKAHAN}}
{{NO_BPJS_KESEHATAN}}     {{NO_BPJS_TK}}            {{BANK}}
{{NO_REKENING}}           {{NAMA_REKENING}}         {{NOMOR_PKWT}}
{{SUPERVISOR}}            {{TANGGAL_HARI_INI}}      {{BULAN_INI}}
{{TAHUN_INI}}             {{NAMA_PERUSAHAAN}}       {{BRAND}}
{{PIMPINAN}}              {{KOTA_KANTOR}}
```
Empty/null fields are replaced with `[___________]`.

---

## COMPANY + OUTLET REFERENCE

```
Brand:          Strada Coffee
Legal entity:   CV Kopi Terbaik Nusantara (CV KTN) — Jakarta
                CV PRI — Semarang
                PT BSB — Roastery
Founder:        Evani Jesslyn (signs all contracts personally, not as CV KTN)
Trademark:      IDM000632538 (registered under Evani Jesslyn personally)

Outlets:
  La Piazza     (Jakarta)
  BSD           (Bumi Serpong Damai, Tangerang)
  MKG           (Mall Kelapa Gading, Jakarta)
  SMS           (Summarecon Mal Serpong)
  SMB           (Summarecon Mal Bekasi)
  SMB Gold Lounge (Summarecon Mal Bekasi — premium section)
  Panen         (Semarang)

Also:
  Roastery      (Production/roasting facility)
  Coffee Academy (Training facility)
```

---

## KEY PEOPLE (for document generation / notifications)

| Name | Role | Notes |
|---|---|---|
| Evani Jesslyn | Owner / Founder | Signs all legal docs |
| Niko | Ops/Tech lead | You are working with Niko |
| Bu Cipta (Angela Dwi) | HR Manager | STD00087 |
| Reza | Head of Academy | STD00097 |
| Bu Cecil | Finance / Accounting | |
| Chris | Purchasing/Fresh | |
| Ndah/Endah | Production/Roastery | STD00039 |
| Rinda | Ops Manager | Add as `ops_manager` in brew_users |

---

## KNOWN ISSUES (be aware)

1. **`address` column** does NOT exist on `applicants` table — only `domicile`. Never query `applicants.address`.
2. **Clara Cindy STD00152** — salary Rp 50,000,000 in DB, likely data entry error. Don't flag as bug.
3. **DOCX generator** — requires `npm install pizzip docxtemplater` if running fresh install.
4. **`applicant_quest_scores` pending queue** — run this SQL before batch scoring on fresh installs:
   ```sql
   INSERT INTO applicant_quest_scores (applicant_id, status)
   SELECT id, 'pending' FROM applicants
   WHERE id NOT IN (SELECT applicant_id FROM applicant_quest_scores);
   ```
5. **Realtime** — must enable via SQL if not already done:
   ```sql
   alter publication supabase_realtime add table applicants;
   alter publication supabase_realtime add table applicant_quest_scores;
   ```
6. **Google Sheets IDs** — all `'YOUR_SHEET_ID_*'` placeholders in `scheduleParser.ts` must be replaced with actual IDs from Google Drive.
7. **`ops_manager` role** — add to `brew_users` CHECK constraint before creating Rinda's account.
8. **Contract reminder Edge Function** — written but not deployed. See deploy commands above.

---

## HOW TO RUN LOCALLY

```bash
# Clone and install
git clone https://github.com/nikoquestera/strada-brew.git
cd strada-brew
npm install

# Create .env.local
NEXT_PUBLIC_SUPABASE_URL=https://yalgiinueczpmrolisdd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[from Supabase > Settings > API]
RESEND_API_KEY=re_FQBwKdP1_FpChY99xmBtzL4K1eUi1N2MM
HRD_EMAIL=niko.questera@gmail.com
ANTHROPIC_API_KEY=[from console.anthropic.com]
GOOGLE_SERVICE_ACCOUNT_JSON=[stringified JSON from Google Cloud service account]

# Run
npm run dev
# → http://localhost:3000
```

---

## DEPLOY

Vercel auto-deploys from `main` branch push. No manual deploy needed.
Set all env vars in Vercel project settings (same keys as `.env.local`).

---

## FINAL NOTES FOR CLAUDE CODE

- When you see `// TODO` or placeholder comments in existing files, those are intentional — fill them in
- Always check existing DB schema before adding new columns — the schema above is current
- If adding a new page, always add auth guard via the layout pattern (see `layout.tsx`)
- All financial figures in IDR, formatted as `Rp X.XXX.XXX`
- Prefer server components. Only use `'use client'` when you need useState, useEffect, or browser APIs
- When in doubt about a UI pattern, look at how `DashboardShell.tsx` and `KaryawanDetailClient.tsx` are structured — they represent the established patterns for this project
