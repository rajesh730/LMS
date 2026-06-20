# Pravyo — Product & Redesign Blueprint

This is the working plan for taking Pravyo from "functional" to a professional,
emotionally engaging product. It captures the north star, the decisions on what to
keep / cut / add, the design system, and a phased roadmap. Update it as phases land.

## North star

> **Pravyo is the verified achievement portfolio for schools and students** —
> LinkedIn for school life. Schools build a public identity through events,
> results, and student talent; students build a verified record of achievements,
> certificates, and writing; parents and the public can explore and trust it
> before anyone logs in.

Everything we build should serve one of three jobs:

1. **School job** — run events/notices/magazines, recognize students, and grow a
   public profile that builds trust and attracts families.
2. **Student job** — participate, write, earn verified achievements, and own a
   portfolio worth sharing.
3. **Public/parent job** — discover schools and students, verify achievements,
   and decide to trust/join — all pre-login (this is the marketing engine).

## Design system (universal UI for every role)

The foundation already exists — the gap is *consistent use*, not missing pieces.

- **Tokens**: `app/globals.css` `:root` (`--brand-primary`, `--brand-ink`,
  `--brand-muted`, radii, shadows). Use these instead of ad-hoc hex values.
- **Primitives**: `components/ui/` (`Button`, `Input`, `AlertBanner`, `PageHeader`,
  `ConfirmDialog`, `LoadingState`, `LifecycleTimeline`). Extend this set; do not
  re-invent buttons/cards per page.
- **Shell**: one `DashboardLayout` + one role-aware `Sidebar` already serve all
  roles. Keep it; never fork per role.
- **One theme**: light. Brand ink `#10142f/#17120a`, muted `#526071`, surfaces
  white / `#f8fbff`, primary accent `#4326e8` (or `--brand-primary`). The dark
  student/event UI has been migrated to this — no role should look different.

**Rule of thumb:** super admin, school admin, and student should feel like the
same product with different data — same chrome, same cards, same buttons.

## Keep / Cut / Add

### Events (the operational core)
- **Keep**: unified management dashboard (admin + school), rounds, results,
  certificates, the revived participant roster + approvals.
- **Cut**: dead/duplicate components (done — 8 removed). Next: collapse the three
  event-list implementations (`EventHub`, `SchoolOwnedEventsManager`, student
  wrapper) into one shared `EventCard` + `EventList`.
- **Add**: a clean read-only **student event detail** (rounds progress, notices,
  their own result/certificate) instead of inline expansion only.

### Portfolios (the differentiator)
- **Add (started)**: public **Student Portfolio** (`/students/[id]`) aggregating
  verified achievements, certificates, and published writing. Gated to students
  with genuinely public content.
- **Strengthen**: public **School profile** (`/schools/[id]`) already exists —
  cross-link it with student portfolios and make metrics live.
- **Decision needed (privacy)**: confirm the visibility model for minors — opt-in
  vs. opt-out, what fields are ever public (never DOB/contact/parent info).

### Content & trust
- **Add**: public **certificate verification by code** (the code on the new
  certificate should be verifiable by anyone — employers, parents).
- **Keep/clean**: magazines, student-voices, winners — wire author/recipient names
  to portfolios everywhere (started: student-voices, writing reader, school page).

### Emotional connection & notifications
- Make wins feel like wins: when results publish, the student should get a
  celebratory moment (toast + dashboard highlight + "share your certificate").
- Notifications should be **outcome-oriented**, not system-oriented: "You earned a
  Finalist certificate in X" > "results updated". Consolidate the existing
  realtime/notification stack around this voice.
- Pre-login: lead with real student/school stories and verified achievements to
  build trust (the homepage feed + portfolios are the funnel).

## Roadmap

- [x] Certificate redesign (Certificate of Recognition, portrait, print-ready)
- [x] Participant roster + approvals wired into management (role-aware)
- [x] Unify event UI to the light theme across all roles
- [x] Delete dead event components (~1,700 lines)
- [x] **Public Student Portfolio** `/students/[id]` + entry points (student-voices,
      writing reader, school achievements)
- [x] Certificate verification by code — public `/verify?code=` + "Verify" link on
      the certificate
- [x] "Celebrate the win" — festive, dismissible certificate banner on the student
      dashboard when a result is recently published
- [x] Outcome-oriented notifications when results publish ("You earned a Finalist
      certificate in X" → links to the certificate; per-student, idempotent)
- [x] Student dashboard "Your public profile" card (view + share), gated to
      students whose public profile exists
- [~] Standardize dashboards on shared primitives — canonical `components/ui/StatTile`
      created and adopted in the student dashboard + student portfolio. Admin/School
      "command center" overviews still use bespoke cards; converge them to StatTile +
      `PageHeader` with the app running (cosmetic-only, needs a visual pass).
- [ ] Shared `EventCard` / `EventList`; retire `SchoolOwnedEventsManager` duplication
      (needs visual testing — do with the app running)
- [ ] Student event detail (read-only rounds/notices/result)
- [ ] Extend outcome voice to remaining notice types + school-admin side

## Canonical UI primitives (use these — do not re-roll)

- Stat tile: `components/ui/StatTile` (white card, optional icon, value + label).
- Page header: `components/ui/PageHeader`.
- Buttons: `components/ui/Button` (`Button`, `ButtonLink`).
- Banners/empty/loading: `AlertBanner`, `EmptyState`, `LoadingState`.
- Tokens: `:root` `--brand-*` in `globals.css`.
- [ ] Standardize all dashboards on `components/ui` primitives + tokens
- [ ] Privacy/visibility model for student portfolios (product decision)

## Honest scope note

A full ground-up rebuild is multi-week, not single-day. The approach is
incremental and always-shippable: each item above lands behind a green build and
keeps the working platform working. Ship value every step instead of a risky
big-bang rewrite.
