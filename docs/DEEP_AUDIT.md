# Pravyo — Deep Technical Audit

Status: living document. Findings are grounded in the actual code (file:line refs).
Severity: **P0** (security / data loss / trust), **P1** (correctness / scale),
**P2** (consistency / quality). Companion to `UX_AUDIT.md` (product/UX side).

---

## P0 — Security

### S1. Student & teacher passwords are stored in plaintext
- **Evidence:** `visiblePassword` is saved alongside the bcrypt hash —
  [students/register/route.js:126](../app/api/students/register/route.js#L126),
  [students/bulk-register/route.js:102](../app/api/students/bulk-register/route.js#L102),
  [students/fix-credentials/route.js:65](../app/api/students/fix-credentials/route.js#L65),
  [teachers/route.js:77](../app/api/teachers/route.js#L77). Login even falls back to a
  **plaintext compare**: `credentials.password === teacher.visiblePassword`
  ([auth route:79](../app/api/auth/%5B...nextauth%5D/route.js#L79)).
- **Why it's bad:** one DB leak exposes every student/teacher password in cleartext.
  The bcrypt hash becomes pointless.
- **Fix:** stop persisting `visiblePassword`. The generated password is already
  returned in the create response — show it **once** in the UI at creation, never
  store it. Remove the plaintext login fallback. Migrate: null out the field and
  drop it from the schema.

### S2. Default passwords are predictable
- **Evidence:** students get `${firstName}@123`
  ([students/route.js:138](../app/api/students/route.js#L138),
  [bulk-register:67](../app/api/students/bulk-register/route.js#L67)); teachers get
  `Teacher@123` ([teachers/bulk-register:49](../app/api/teachers/bulk-register/route.js#L49)).
- **Why it's bad:** usernames are derived from name+roll (also guessable). Predictable
  password + guessable username = trivial account takeover, even with login rate limiting.
- **Fix:** generate random passwords (the project already has
  `lib/credentialGenerator` / `generateStrongPassword`) and force a change on first login.

### S3. Rate limiter is per-instance (in-memory)
- **Evidence:** [lib/rateLimit.js](../lib/rateLimit.js) uses a module-level `Map`.
- **Why it's bad:** on serverless / multi-instance hosting each instance has its own
  counter, so the effective limit is N× higher. Login (now limited) and register rely on it.
- **Fix:** back it with the same Upstash Redis used by `lib/realtimeBus.js` (INCR + EXPIRE),
  fall back to in-memory when Redis is absent.

### S4. No Content-Security-Policy
- **Evidence:** [next.config.mjs](../next.config.mjs) now sets baseline headers but no CSP.
- **Fix:** add a tuned CSP (needs allowances for Next inline scripts, EventSource, Google
  Drive image host). Left out of the headers pass to avoid breaking the app blindly.

---

## P1 — Correctness & data integrity

### C1. Event capacity checks have a check-then-act race
- **Evidence:** [participate/route.js](../app/api/events/%5Bid%5D/participate/route.js) counts
  with `countDocuments` then `create` (lines ~430, ~613, ~656). Two concurrent
  registrations can both pass and exceed `maxParticipants` / `maxParticipantsPerSchool`.
- **Note:** *duplicate* registration is safely blocked by a unique index
  `{student, event, school}` ([ParticipationRequest.js:92](../models/ParticipationRequest.js#L92)) —
  good. Only the **capacity ceiling** is racy.
- **Fix:** enforce capacity atomically (capacity counter via `$inc` guarded by a
  conditional update, or a transaction), or accept small overflow with admin reconciliation.

### C2. Results publishing isn't transactional
- **Evidence:** [results/route.js](../app/api/events/%5Bid%5D/results/route.js) inserts
  achievements, flips certificate state, and sets `event.resultsPublished` as separate
  writes. A mid-way failure can leave results half-published.
- **Fix:** wrap the publish mutations in a Mongo transaction (DB is Atlas, so supported —
  same pattern already applied to transfer/promotion).

### C3. Auth is hand-rolled in most routes
- **Evidence:** 93 of 122 routes call `getServerSession` directly with ad-hoc role /
  ownership checks; only 15 use `requireApiSession`. Ownership helpers exist
  (`canManageEventRecord`, `getSessionSchoolId`) but aren't used uniformly.
- **Why it matters:** inconsistency is where authorization bugs hide. (Spot-checked
  `students/[id]`, `student/writings/[id]`, `notices/[id]` — those are correctly scoped,
  but the pattern isn't enforced.)
- **Fix:** standardize on `requireApiSession([...roles])` + shared ownership helpers; add
  a lint/test guard so new routes can't skip it.

### C4. Events have no academic-year stamp
- **Evidence:** `Event` has no `academicYearStart`; the new analytics buckets events by
  date window ([school/analytics/route.js](../app/api/school/analytics/route.js)).
- **Fix:** stamp events with `academicYearStart` at creation for exact year reporting.

---

## P1 — Scale & performance

### P1a. Work indicators run many sequential queries per request
- **Evidence:** [lib/workIndicators.js](../lib/workIndicators.js) builds the full
  notification payload + several `countDocuments` on **every** page load (sidebar).
- **Fix:** cache per user for a few seconds, or consolidate into fewer aggregations.

### P1b. Analytics loads all lifetime students into memory
- **Evidence:** [school/analytics/route.js](../app/api/school/analytics/route.js) does
  `Student.find({ "enrollments.school": schoolId })` then computes in JS. Fine for small
  schools, poor at scale.
- **Fix:** move the in/out computation to an aggregation pipeline.

### P1c. Unbounded / inconsistent list pagination
- **Evidence:** ~60 `.find()` calls; many cap at `.limit(50/500)`, some don't. No cursor
  pagination on student/event lists.
- **Fix:** standard pagination (limit + skip/cursor) on all list endpoints.

---

## P2 — Consistency & quality

- **U1. Duplicate surfaces** (also `UX_AUDIT` P0): School Wall and School Magazine render
  the same ~875-line component; students vs schools browse events through two separate
  systems. Biggest "not one product" issue.
- **U2. No per-year roster/headcount** drill-in — analytics shows flows, not the enrolled
  total per session or the named lists behind each number.
- **Q1. Test coverage is thin** — 8 test files; **none** cover transfer, promotion, auth,
  registration, or events (the highest-risk flows).
- **Q2. Validation is ad-hoc** — `lib/validation.js` is imported by ~0 routes; each route
  hand-rolls checks.
- **Q3. No `global-error.js`** boundary (only `app/error.js`).

---

## Already fixed (this audit cycle)
- Transfer notifications for every transition + sidebar transfer badge + reject-reason capture.
- Login rate limiting; baseline security headers + conservative CSP (**S4**).
- Atomic (transactional) student move and academic-year rollover; **results publishing now
  transactional too** (**C2**) — a failed insert can no longer wipe an event's achievements.
- AcademicYearManager aligned to the light theme.
- **S1**: removed the dead plaintext-login fallback and the `visiblePassword` no-op writes
  (confirmed: Mongoose `strict` mode was already dropping the field, so nothing was persisted).
- **S2**: student auto-generated passwords are now random (`generateStrongPassword`), matching
  teachers; the generated value is returned once for the school to distribute.
- **S3**: rate limiter now uses Redis (Upstash) across instances, with in-memory fallback.
- **C4**: school events are stamped with `academicYear`/`academicYearStart`; analytics prefers
  the stamp over date-bucketing (legacy events still fall back to dates).
- **Q3**: added `app/global-error.js` for root-layout crashes.

## Still open (need dedicated, tested passes — not safe to bulk-fix blind)
- **C1** event-capacity over-enrollment race — **student self-registration is now cap-safe**
  (insert → verify → compensate guard via `capacityViolation`, unit-tested). The school-admin
  *bulk* paths still rely on pre-checks (single-actor, low concurrency); a full atomic-counter
  redesign across the team/global/per-school branches is the remaining work.
- **C3** auth standardization across ~93 hand-rolled routes — large mechanical refactor; do
  behind tests.
- **P1a/b/c** work-indicator caching, analytics aggregation, list pagination — perf work that
  needs profiling.
- **U1/U2** merge Wall/Magazine + dual event systems; per-year roster drill-in.
- **Q1/Q2** test suite for transfer/promotion/auth/events; shared input-validation layer.
