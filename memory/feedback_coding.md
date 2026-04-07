---
name: Coding Approach Feedback
description: How to write code for this project — patterns that worked and ones to avoid
type: feedback
---

Always commit AND push after completing a batch of features. Deploying via `vercel --yes` (CLI) uploads local files but does NOT update the git commit shown in Vercel dashboard — user checks Vercel dashboard for commit messages to verify deploys.

**Why:** User noticed the dashboard still showed old commit `b74d5a1` after a CLI deploy; changes were live but looked undeployed.
**How to apply:** After every significant batch of changes: `git add`, `git commit`, `git push origin main`. Vercel Git integration will auto-deploy from the push. Only use `vercel --yes` for quick preview checks.

---

Next.js 16 App Router: `params` is a `Promise<{id: string}>` — must `await params` before accessing `id`.

**Why:** Breaking change in Next.js 16 vs earlier versions. Causes runtime errors if not awaited.
**How to apply:** Every `[id]/page.tsx` must have `const { id } = await params`.

---

Use `export const dynamic = "force-dynamic"` on all dashboard pages that fetch live data.

**Why:** Without it, Next.js may statically render the page at build time with no data.
**How to apply:** Add to all server component pages in `/dashboard/hrd/`.

---

CSS hover states must use `<style>` tags with class selectors — inline styles don't support `:hover`.

**Why:** All BREW pages use inline styles for layout; hover effects require a `<style>` block.
**How to apply:** Add a `<style>{`...`}</style>` block at the top of each page/component with hover rules. Use `globals.css` for shared utility hover classes.

---

Score clamping must happen server-side, not in the AI prompt.

**Why:** Claude ignores max constraints in prompts (returned 23/20 for a 0-20 dimension). Prompt guidance is insufficient — must clamp after receiving response.
**How to apply:** After `runQuestScoring()`, clamp each sub-score with `Math.min(max, Math.max(0, value))` and compute `overall_score` as their sum.

---

Inputs on mobile must have `font-size: 16px` minimum.

**Why:** iOS Safari auto-zooms when an input has font-size < 16px. Non-negotiable for the public apply page.
**How to apply:** Set `fontSize: '16px'` on all `<input>`, `<select>`, `<textarea>` in apply/public pages.
