# Academic Year, Promotion, Transfer & Persistent Student Portfolio

Status: in progress. This document is the source of truth for the design. Read it
before touching any of the files it references.

## Problem

- A `Student` document is identity bound to **one** school (`school` is a single
  required ref; `grade` is a free string). Every achievement, writing, and event
  result references `Student._id`.
- A transfer today means the new school creates a **new** `Student` doc → new
  `_id` → all prior achievements/writings stay attached to the old doc → the new
  profile is empty and the journey is lost.
- There is no academic-year concept: no batch/year, no promotion, no school
  history, no way to answer "what grade in 2025", "how many schools changed".

## Core principle

> **The portfolio follows the person. Content stays owned by the school that
> created it.**

This works because every achievement/writing already carries its own `school`
field, independent of the student's *current* school. Keep `Student._id` stable
across transfers and:

- the **profile page** aggregates everything across all schools, each item
  labelled by school + year (full journey, nothing lost);
- a writing made at Orbit stays in Orbit's magazine/wall, owned and labelled
  "Orbit" — the new school never re-posts, edits, or claims it.

## Model (Approach A — one Student doc = the lifelong person)

### Student (extended)
Top-level `school` / `grade` / `rollNumber` remain as the **current enrollment**
(so all existing `Student.find({ school })` queries keep working). Add:

```
enrollments: [{
  school, grade, rollNumber,
  academicYear,        // display, e.g. "2082/83" or "2025-26"
  academicYearStart,   // numeric AD start year — canonical cross-calendar sort key
  status,              // CURRENT | PROMOTED | RETAINED | TRANSFERRED | GRADUATED
  startedAt, endedAt,
}]
```

`status` on the Student also gains `GRADUATED` (alumni who passed out of the top
grade) alongside the existing ACTIVE / SUSPENDED / INACTIVE / ALUMNI.

### AcademicYear (new collection) — one row per school per session
```
{ school, year (display), yearStart (AD num), calendar (AD|BS),
  status (ACTIVE|CLOSED), startedAt, closedAt,
  summary: { admitted, promoted, retained, graduated, transferredIn, transferredOut } }
```
- The school's **current** academic year = its single `ACTIVE` row.
- The **school settings history section** lists these rows (newest first) with
  their summaries — "what happened each academic year".
- Promotion closes the ACTIVE row (writing its summary) and opens the next one.

### StudentTransfer (new collection) — claim + approve
```
{ student, platformStudentId, fromSchool, toSchool,
  requestedBy, status (PENDING|APPROVED|REJECTED|CANCELLED),
  toGrade, toAcademicYear, dobVerified, reason, decidedBy, decidedAt }
```

## Flows

### Academic year (per-school AD or BS)
Each school picks its calendar (AD/BS) and sets/initialises its current academic
year. `academicYearStart` (AD number) is stored next to the display string so the
platform can sort/compare batches across calendars.

### Promotion (reviewable bulk; handles repeaters + graduation)
1. School opens "Promote to next academic year"; sees each grade's ACTIVE
   students **pre-checked** for promotion.
2. **Repeaters**: unchecked students stay in the same grade → `RETAINED`.
3. **Top grade** (highest in `SchoolConfig.grades`): promoting out of it →
   `GRADUATED` (status ALUMNI) instead of a non-existent grade.
4. Commit closes the current `AcademicYear` (summary filled), opens the next,
   appends an enrollment entry per student, and updates each student's current
   grade. Nothing commits until the school confirms.
5. `+2` / 11–12 / bachelor need **no schema change** later — grade is just a
   label and the max grade comes from each school's config. A +2 college is
   another school offering grades 11–12; a graduate joining it is a normal
   transfer into grade 11.

### Transfer (claim + approve, person doc reused)
1. New school searches by `platformStudentId` + DOB (DOB guards against leaks).
2. New school files a `StudentTransfer` (PENDING) with target grade.
3. Origin school approves → close origin enrollment (`TRANSFERRED`), open new
   enrollment at the new school (new roll number + new per-school username), flip
   top-level `school`/`grade`. **Same `_id`, same `platformStudentId`.**
4. Origin school keeps the student in a "transferred out / past students" view
   plus all achievements they earned there; they leave the active roster.
- "How many schools changed" = distinct schools across `enrollments`.

## UI

- **School settings → Academic Year & History**: set calendar + current year,
  run promotion, and a history list of `AcademicYear` rows with summaries.
- **StudentManager**: "Promote year" (reviewable) and "Transfer in" (claim) +
  "Transferred out" view.
- **Student dashboard → My Journey/History**: enrollments + achievements +
  writings, filterable by academic year.
- **Public portfolio** (`/students/[id]`): multi-school journey, items grouped /
  labelled by school + year.

All UI follows the existing light theme + components (StatTile, AlertBanner,
EmptyState, LoadingState, ConfirmDialog, Button, Input, Skeletons).

## Content ownership: the writing is the student's, the school is where it was written

Revised principle (supersedes "content stays owned by the creating school" for
*student writing*): **a student's writing is her own property and follows her.**
The `school` ref records **where it was written** (provenance, fixed), not who
controls it. So:

- **My Writing and edit/delete/hide match by `authorStudent` only**, never by
  current school — she keeps full control of pieces written at a school she has
  left (read, **edit to improve**, hide, delete). See
  `app/api/student/writings/route.js` + `.../[id]/route.js`.
- A piece written at a school she has **left** is **portfolio-owned**: she edits
  it directly with **no school re-review** (`handleTransferredOutWriting`); it
  never re-enters a school wall/review queue. Detected by
  `article.school !== student.school`.
- **On transfer** (`moveStudent` in `app/api/students/transfer/[id]/route.js`)
  her pieces **detach from the origin school's live student wall + global wall**
  so they stop reading as that school's current content, but stay **public in
  her portfolio** (`isPublished`) labelled "written at X", and stay in any
  already-**published magazine issue** as a dated archive.
- The school keeps moderation only **while she is enrolled**, and keeps its
  **published magazine issues** (a dated artifact). It cannot edit/claim her work
  after she leaves. Platform-level moderation still covers all public content.
- **Magazine freeze note:** a published issue renders the live article. We did
  *not* snapshot issue content (would require restructuring all magazine readers
  + duplicating content). Instead the existing "make private before editing
  published work" guard means a magazine-published piece only leaves/changes an
  issue when the student **explicitly** withdraws it — so issues stay intact by
  default. Full per-issue snapshotting is a deferred option if needed.

## Authoring-era provenance (content reads as history after transfer)

A piece written at the old school must not render as a stale *current*
affiliation. The reader is **author-first**: the byline leads with the student +
their **current** school ("now at X"); the **origin** school ("written at X ·
grade · year", with logo + link) is shown as provenance at the **bottom**. See
`components/public/PublicWritingReader.js`.

Fix — label content by **where + when it was written**, not just by school:

- `SchoolMagazineArticle` carries an authoring-era snapshot, frozen at creation
  and never overwritten on edit: `authorSchoolNameSnapshot`, `authorGrade`,
  `authorAcademicYear`, `authorAcademicYearStart`. Sourced from the student's
  CURRENT enrollment via `buildAuthoredEraSnapshot()` (`lib/studentEnrollment.js`).
- `lib/writingProvenance.js` formats it: `formatAuthoredAt` →
  "Nepal Model School · Grade 9 · 2026", `formatAuthoredEra` → "Grade 9 · 2026",
  `serializeAuthoredEra` exposes the fields from API serializers. All degrade
  gracefully when fields are missing.
- Surfaces: student-voices feed, public writing reader ("**Written at** X", past
  tense), magazine cards/reader (`MagazineArticleMeta`), and the portfolio, which
  groups writings into **per-school chapters** ordered by the journey timeline.
- Backfill existing docs once: `npm run db:backfill-article-author-era`
  (`scripts/backfill-article-author-era.mjs`; idempotent, never bumps `updatedAt`).

## Build order / status
1. [x] Schema: Student.enrollments, AcademicYear, StudentTransfer + lib helpers
2. [x] Academic year settings + promotion API
3. [x] Transfer claim/approve API
4. [x] School settings history + promotion UI (AcademicYearManager)
5. [x] Transfer UI in StudentManager (StudentTransferPanel)
6. [x] Student history section with year filter (/student/journey)
7. [x] Portfolio multi-school journey (/students/[id])
8. [x] Authoring-era provenance: content labelled "written at X · grade · year",
       portfolio grouped per school (run the backfill once on deploy)
