# Pravyo — Deep UX / Product Audit

Goal: take Pravyo to a LinkedIn-grade, "every screen feels like one product" standard.
This audit is grounded in the actual code (files referenced). Each item: **What's
wrong → How it should be → What to do**. Priorities: **P0** (breaks the "one product"
feel / blocks trust), **P1** (clear polish), **P2** (nice-to-have / vision growth).

---

## A. Information architecture — naming & duplication

### A1 (P0) "School Wall" and "School Magazine" are the same feature
- **Now:** `app/student/school-wall/page.js` renders `StudentSchoolMagazine` with
  `initialView="school-wall"`; `app/student/magazine/page.js` renders the *same*
  component in magazine mode. Two sidebar entries point at one 875-line component,
  and "magazine" wording leaks onto the wall.
- **Should be:** one clear concept with one vocabulary. Recommended model:
  - **School Wall** = the live stream of *approved student writing* (social, ongoing).
  - **School Magazine** = *curated issues* (periodic, editorial).
  Keep both only if they're genuinely distinct surfaces; otherwise merge into one
  "Writing" hub with two tabs (Wall / Issues).
- **Do:** decide the model, then make labels/headers/empty-states say exactly that.
  Remove the duplicate nav entry if merged.

### A2 (P1) Sidebar groups differ by role
- Student/admin get a flat nav; school gets grouped sections. Fine, but the group
  titles and item names should follow one naming style across roles.

---

## B. Events — the biggest "not universal" problem

### B1 (P0) Two parallel event-browsing systems
- **Now:** students browse via `components/events/EventHub.js` (1348L); the school
  dashboard uses `components/events/SchoolOwnedEventsManager.js` (896L). Different
  card layouts, different filters, different button sets, different copy.
- **Should be:** ONE shared `EventList` + `EventCard` + `EventFilterBar`, driven by a
  `role`/`mode` prop. Students, schools, and admins all render the same components
  with role-appropriate actions. This is the single highest-leverage fix for the
  "UI not matching" feeling.
- **Do:** extract `EventCard` (presentational) + `EventFilterBar` (shared filter
  model) and refactor both surfaces onto them. Needs visual testing on the running
  app. Retire `SchoolOwnedEventsManager` duplication.

### B2 (P0) Filter taxonomy is inconsistent
- **Now:** student = {Live, Registration Open, All, Completed}; school = {ALL,
  ACTIVE, REGISTRATION, COMPLETED, ARCHIVED} + type + grade + visibility.
- **Should be:** one taxonomy, progressively disclosed:
  - **Status** (shared): Open for Registration · Live · Completed · All (+ Archived
    for managers).
  - **Type** (shared): competition / showcase / workshop…
  - **Grade / Visibility** (manager-only).
- **Do:** define the taxonomy once in a small helper and render the same filter bar
  everywhere; hide manager-only facets for students.

### B3 (P1) Registration is a 1730-line mega-form
- `EventParticipationForm.js` branches student-enroll vs school-roster vs team setup
  in one file, with copy that reads differently per path.
- **Should be:** a clear, stepped flow with consistent microcopy ("Who's
  competing?" → "Confirm"). Split team-setup, student-select, and review into
  small components.
- **Do:** decompose incrementally; unify button labels and helper text first (cheap
  win), structural split later.

### B4 (P1) Rounds handling clarity
- **Now:** rounds advance manually per round; status spread across `RoundsTab`.
- **Should be:** a visual **pipeline** (Round 1 → Round 2 → Final) showing counts at
  each stage, with one clear "Advance selected" action + confirmation. Keep it
  **manual** — auto-advance is risky for a credibility product.

### B5 (P1) Student event detail is thin
- Students only get inline expansion. A real read-only detail (event info, round
  progress, notices, *their* result + certificate) would match the polish of the
  management view. Reuse the shared `EventCard` + `StudentEventCertificatesPanel` +
  `PublicEventNoticeList`.

---

## C. Notifications — make them "nested" and outcome-led

### C1 (P1) Flat, ungrouped list
- **Now:** `StudentNotificationCenter` renders a flat time-sorted list; no grouping,
  no type filter, no threading.
- **Should be (LinkedIn-grade):**
  - **Date groups**: Today · This week · Earlier.
  - **Type filter tabs**: All · Achievements · Events · Notices.
  - **Nesting/threading**: collapse multiple notices from the same event into one
    expandable item ("3 updates in 'Platform Event 24'").
- **Do:** add grouping + filter tabs to the shared `useNotificationInbox`/inbox UI;
  thread by `event.id`.

### C2 (done) Outcome-oriented voice
- Achievement notifications now say "You earned a Finalist certificate in X" and link
  to the certificate. Extend this voice to other notice types and the school side.

---

## D. Workflow decisions (your open questions)

### D1 Result publish — automated or manual?
- **Recommendation: keep it MANUAL** (organizer confirms). For a portfolio/credential
  product, certificates must be deliberate — auto-publishing risks wrong/early
  certificates and destroys trust. **Improve the manual flow** into an explicit
  **Review → Confirm → Publish** wizard: show exactly who gets which placement +
  certificate before the single publish action; keep the republish-with-reason audit.

### D2 Rounds — automated or manual?
- **Recommendation: manual advance** with a clear pipeline and confirmation (see B4).
  Optionally allow "auto-close registration at deadline" (low risk) but never
  auto-decide who advances.

---

## E. Content, detailing & consistency (small things that read as "unfinished")

- **Date formatting** is inconsistent: some screens use `toLocaleDateString()`, others
  `Intl.DateTimeFormat`. **Do:** one `formatDate` helper used everywhere.
- **Placement labels** differ by screen (`FINALIST` vs `Finalist` vs `1st Runner Up`).
  **Do:** one shared label/title-case helper.
- **Empty states / skeletons**: standardize on `EmptyState` + `LoadingState` + the
  `Skeletons` set everywhere (some screens roll their own).
- **Buttons**: route all through `components/ui/Button`; today many are raw
  `<button className="bg-[#4326e8] …">`.
- **Stat tiles**: now standardized via `components/ui/StatTile` — extend to the
  admin/school overviews (visual pass).
- **Microcopy voice**: define a short voice guide (warm, achievement-led, never
  system-jargon like "results updated").

---

## F. Missing "necessary" features for the LinkedIn-for-schools vision

- **P1 Student profile editing**: a student/school-controlled headline, photo/avatar,
  and short bio on the portfolio (today it's auto-only).
- **P1 "Add to your profile" share**: one-click share of a certificate/portfolio
  (LinkedIn-style), plus Open Graph images per portfolio for rich link previews.
- **P2 Search**: public search across students, schools, events.
- **P2 Endorsements / verified-by**: schools/teachers vouching for a student skill.
- **P2 Portfolio visibility controls**: opt-in/opt-out per student (minors policy —
  product/legal decision still open).

---

## Recommended sequence

1. **P0 — A1**: fix School Wall vs Magazine naming/duplication (fast, high clarity).
2. **P0 — B1 + B2**: shared `EventCard`/`EventFilterBar`; unify student & school
   events (the core "universal UI" fix; do with the app running).
3. **P1 — C1**: grouped + filterable + threaded notifications.
4. **P1 — D1**: Review→Confirm→Publish results wizard (keep manual).
5. **P1 — E**: consistency pass (date/label/button/empty-state helpers).
6. **P1 — B4/B5**: rounds pipeline + student event detail.
7. **P1/P2 — F**: profile editing, share-to-profile, search.

Everything ships incrementally behind a green build; the visual items (B1/B2,
overviews) are done with the dev server up for verification.
