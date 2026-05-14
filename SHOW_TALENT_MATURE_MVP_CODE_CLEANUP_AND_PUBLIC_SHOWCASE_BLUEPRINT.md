# Show Talent Mature MVP: Code Cleanup and Public Showcase Blueprint

Date: April 24, 2026

## 1. Objective

Turn this repository into a focused, sellable product:

multi-school talent, extracurricular, competition, and public showcase platform.

This blueprint converts the research recommendation into build and cleanup execution.

## 2. Product Guardrail

Keep only features that answer:

"How active, creative, competitive, and vibrant is this school beyond academics?"

If a module does not support this question, freeze or retire it.

## 3. Current Reality (Code Evidence)

The platform has strong talent/event foundations, but ERP-era surface area still exists.

Examples of leftover academic framing:

- Some secondary docs/comments still mention ERP-era history instead of pure market-facing talent language.
- Grade-heavy assumptions remain in selected APIs/UI (`eligibleGrades`, grade filters, grade-focused messaging).
- Teacher/staff data still uses `subject` in many flows where `focusArea` or `mentoringAreas` is more aligned.
- Some forms still rely on static grade assumptions where school-config-driven options are better.

This is not fatal, but it creates strategic drift and UX inconsistency.

## 4. Mature MVP Scope (In Exact Priority Order)

Build and harden in this sequence:

1. public event pages
2. public school profile pages
3. talent/extracurricular categories
4. talent profiles
5. submissions
6. judging/scorecards
7. achievements/certificates
8. platform-run flagship event flow

## 5. What to Keep, Freeze, Remove

### Keep (core platform assets)

- Auth and role controls (`SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`)
- School onboarding/approval
- Event ownership model (`SCHOOL_EVENT`, `PLATFORM_EVENT`)
- Submissions, judging, results publication, achievements/certificates
- Parent communication, notices, support

### Freeze now (no new feature investment)

- Attendance, exams, marks, grading-scale/report-card concepts
- Curriculum-heavy content (subject/chapter/MCQ flows)

### Remove progressively

- Dead APIs and components tied only to frozen modules
- Leftover nav labels and copy implying ERP/LMS positioning

## 6. Cleanup Backlog (Execution-Ready)

### Track A: Language and UX cleanup

Target:

- Replace ERP/LMS vocabulary with talent/extracurricular vocabulary.

Initial files to update:

- `README.md`
- role dashboards with transition copy still referencing removed modules

Acceptance:

- No primary surfaces market attendance/exam/marks as value proposition.

### Track B: Grade/subject normalization

Goal:

- Keep grade metadata where operationally required, but remove grade-as-product-center assumptions.
- Migrate mentor terminology from `subject` to broader `focus area` semantics in user-facing forms.

High-impact areas:

- Event participation and eligibility APIs using strict `eligibleGrades` checks
- Teacher registration/update APIs that require/center `subject`
- Static grade option lists in forms and notices

Acceptance:

- Grade is optional contextual metadata, not the organizing concept of the product.

### Track C: Dead code retirement

Goal:

- Remove routes/components no longer reachable from active navigation.

Method:

- Inventory by route + sidebar entries
- Mark each module as: `active`, `frozen`, `retire-candidate`
- Remove in small batches with regression QA after each batch

Acceptance:

- No orphaned APIs for retired modules.

## 7. Public Showcase Blueprint

### 7.1 Public Landing (`/`)

Must show:

- Featured upcoming public events
- Highlighted schools
- Recent winners/highlights
- Active categories this season
- Platform flagship event CTA

Must avoid:

- vanity-only leaderboards
- private student details

### 7.2 Public School Pages (`/schools`, `/schools/[id]`)

Must show:

- School story and identity
- Active categories and clubs
- Upcoming and recent showcase events
- Participation and recognition history
- Balanced activity metrics over time

### 7.3 Public Event Pages (`/events`, `/events/[id]`)

Must show:

- Organizer and scope (school/platform)
- Categories and schedule
- Published submissions/highlights (when allowed)
- Published results/winners
- Gallery/highlight assets

## 8. Data and Model Hardening

Use existing model base and add constraints where missing.

### Event

Required product fields:

- `eventScope: SCHOOL | PLATFORM`
- `ownerType: SCHOOL | PLATFORM`
- `ownerId`
- `visibility: PRIVATE | INVITED | PUBLIC`
- `registrationMode: DIRECT | THROUGH_SCHOOL`
- `resultsPublished`, `publicShowcaseEnabled`

Rules:

- `PLATFORM_EVENT` requires platform ownership.
- Public pages only render from publish-approved states.

### Submission and Judging

Rules:

- Submission lifecycle states are explicit.
- Judge assignment is explicit and auditable.
- Result publication is idempotent and version-safe.

### Achievement/Certificate

Rules:

- Achievements derive from published results, not ad hoc edits.
- Public visibility flag required for showcase rendering.

## 9. Security and Trust Requirements

### Child safety and publication control

- School-controlled publish flags for student media/profiles
- Consent-aware public visibility workflow
- Moderation override by platform admins

### Credential hygiene

- Remove `visiblePassword` from active flows
- Keep one-way credential handling and reset-only UX

## 10. Release Plan

### Milestone 1 (1-2 weeks): Messaging and cleanup baseline

- README and core UI copy alignment
- Module inventory and freeze labels
- Dead-code candidate list finalized

Exit criteria:

- Product story is consistent across public and role surfaces.

### Milestone 2 (2-4 weeks): Public showcase hardening

- Public landing, school pages, event pages polished
- Publication controls tightened
- Activity metrics balanced and non-gameable

Exit criteria:

- Public pages are pilot-ready and safe by default.

### Milestone 3 (3-6 weeks): Talent workflow maturity

- Categories, profiles, submissions, judging, achievements hardened end-to-end
- Platform flagship event flow finalized

Exit criteria:

- One full school event and one full platform event run successfully in staging.

## 11. QA Gate (Must Pass Before Pilot)

Use and expand `MANUAL_QA_CHECKLIST.md` with these mandatory additions:

- Public visibility and consent checks for minors
- Result publication integrity checks (no duplicate awards)
- Role isolation checks for judging and moderation actions
- Regression checks after each cleanup batch

## 12. Done Definition for "Mature MVP"

The MVP is mature when all are true:

1. Public event and school pages are stable, useful, and safe.
2. Event -> Submission -> Judging -> Result -> Achievement works without manual DB repair.
3. Platform-owned flagship event can run end-to-end.
4. ERP/LMS module drift is frozen/retired and no longer drives roadmap decisions.
5. Positioning across docs and UI is consistently talent/extracurricular focused.
