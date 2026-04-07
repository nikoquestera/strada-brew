---
name: DNS & Infrastructure Notes
description: DNS config, Vercel domain setup, known gotchas
type: project
---

**DNS provider:** WordPress.com (ns1/ns2/ns3.wordpress.com) manages stradacoffee.com
**Where to add DNS records:** wordpress.com/domains → stradacoffee.com → DNS records

**Current DNS records (as of 2026-04-07)**
- stradacoffee.com → WordPress.com (A records: 192.0.78.211, 192.0.78.154)
- brew.stradacoffee.com → CNAME cname.vercel-dns.com (added during this project; was missing and caused outage)

**Vercel domain aliases on production deployment**
- brew.stradacoffee.com ✓
- strada-brew.vercel.app ✓
- strada-brew-nikoquestera-2926s-projects.vercel.app ✓

**For future subdomains (e.g. career.stradacoffee.com)**
1. Add CNAME in WordPress.com DNS: `career` → `cname.vercel-dns.com`
2. Add domain alias in Vercel: `vercel domains add career.stradacoffee.com`
3. Add Next.js middleware to route by hostname

**Outage history**
- 2026-04-06: brew.stradacoffee.com went down — CNAME record was missing from DNS
  Resolved by user adding CNAME in WordPress.com dashboard
- stradacoffee.com/apply Safari error was caused by this same outage (button linked to brew)

**Why:** Reference before any DNS or domain work to avoid repeating the outage.
**How to apply:** Any new subdomain needs both a DNS record AND a Vercel alias. Do both steps.
