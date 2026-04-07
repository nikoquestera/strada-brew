---
name: Project Overview — Strada BREW
description: What BREW is, its tech stack, domains, and deployment setup
type: project
---

BREW is Strada Coffee Indonesia's internal HR system — a Next.js 16 App Router web app deployed on Vercel. It has two sides: a public-facing career/apply portal and a private HRD dashboard.

**Domains**
- `brew.stradacoffee.com` → the Next.js app (Vercel, alias configured)
- `stradacoffee.com` → separate WordPress.com site; `/apply` is a marketing landing page with a button linking to `brew.stradacoffee.com/apply`
- DNS managed via WordPress.com nameservers (ns1/ns2/ns3.wordpress.com)

**Stack**
- Next.js 16.2.2 with App Router (Turbopack)
- Supabase (PostgREST, RLS, server + client helpers)
- Anthropic claude-sonnet-4-6 for Quest AI scoring and message templates
- Resend for transactional email (from: brew@stradacoffee.com)
- Vercel CLI for deploys; Git integration auto-deploys main → production

**Repo**
- GitHub: nikoquestera/strada-brew
- Branch: main (production)
- Vercel project: nikoquestera-2926s-projects/strada-brew

**Key env vars (set in Vercel)**
- ANTHROPIC_API_KEY
- RESEND_API_KEY
- HRD_EMAIL (defaults to hrd@stradacoffee.com)
- NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY

**Why:** Internal HR tool purpose-built for Strada Coffee to manage recruiting pipeline, employee records, AI scoring, and documents.
**How to apply:** All new features go into src/app/dashboard/hrd/ (HRD portal) or src/app/ (public pages). Deploy by pushing to main — Vercel auto-deploys.
