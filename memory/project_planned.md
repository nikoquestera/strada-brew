---
name: Planned Features (Roadmap)
description: Features discussed but not yet built, from the 10-feature roadmap
type: project
---

**Feature 4 & 5 — Tests System (largest remaining feature)**
- Tests list/builder page: `/dashboard/hrd/tests/page.tsx`
  - HR creates tests with title, instructions, time limit, passing score
  - Questions: multiple choice or text input; text or image content
- Send test API: `POST /api/tests/send` — generates unique access code (e.g. "X1283"), sends email to applicant
  - Code stored in `applicant_tests.access_code` (UNIQUE constraint exists)
  - Email includes code + link to test-taking page
- Submit test API: `POST /api/tests/submit` — marks code as used, saves answers + score
- Public test-taking page: `/test/[code]/page.tsx` — accessible without login
  - Code is one-time use only; expires on completion or after 7 days
- "Send Test" button in applicant detail page → modal to pick which test
- Add "Tests" to sidebar navigation in DashboardShell
- DB tables already created: `tests`, `test_questions`, `applicant_tests`
- RLS already set: anon can SELECT tests/questions and UPDATE applicant_tests

**Feature 8 — career.stradacoffee.com subdomain**
- Change career site from `brew.stradacoffee.com/apply` to `career.stradacoffee.com`
- Approach: Next.js middleware checks hostname → serves public career pages under career subdomain
- User needs to add DNS CNAME: `career` → `cname.vercel-dns.com` (same as brew)
- Vercel domain alias needs to be added for `career.stradacoffee.com`

**Feature 10 — Meeting Invite with Google Calendar**
- "Undang Meeting" button in applicant detail page
- UI: pick date/time, add meeting link or location, optional message
- API: `POST /api/invite/meeting`
  - Sends email to applicant + HR with .ics calendar attachment
  - .ics format: plain text, includes DTSTART, DTEND, SUMMARY, DESCRIPTION, ATTENDEES
  - Google Calendar invite via mailto: link or direct API (requires OAuth)

**Logo Update (immediate)**
- User wants to replace current SVG placeholder (`public/strada-logo.svg`) with actual Strada Coffee brand logo
- Pending: user needs to upload the logo file (PNG or SVG)
- Once uploaded, place at `public/strada-logo.svg` (or .png) and update all references:
  - `src/components/DashboardShell.tsx` (sidebar desktop + mobile header)
  - `src/app/apply/page.tsx` (header + footer)
  - `src/app/jobs/[id]/page.tsx` (top bar)
  - `src/app/api/notify/new-applicant/route.ts` (email — currently text-based, no img)

**Possible Future Additions (mentioned, not committed)**
- Payroll module (currently placeholder in sidebar)
- Finance, Warehouse, Purchasing, Audit modules (listed as "Segera Hadir" in sidebar)
- `career.stradacoffee.com` as dedicated career subdomain for public job browsing

**Why:** Track scope so features aren't forgotten between sessions.
**How to apply:** Start with Tests (Feature 4/5) as it has DB tables ready. Logo update is immediate once file is provided.
