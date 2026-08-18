# Pravyo — Architecture

Status: living document. This is the **contract for where code goes** and why.
`MEMORY.md` at the repo root orients a newcomer to the product; this file defines
the structure. If the code contradicts this document, either the code is a known
deviation (see [Known deviations](#known-deviations) — they are counted, not
hidden) or this document is stale. Both are fixable; silently drifting is not.

---

## 1. Verdict: what exists today

Pravyo has a real architecture, but an **implicit** one. The shape is sound and
conventional for a Next.js App Router product; the problem is that it was never
written down, so it is applied inconsistently — roughly 40–60% of the codebase
follows it and the rest predates it.

**What is already professional:**

| Signal | Evidence |
| --- | --- |
| Clean 3-tier physical layout | `app/` (delivery) → `lib/` (domain, 86 modules / ~13k lines) → `models/` (26 schemas) |
| A standard response envelope | [lib/apiResponse.js](../lib/apiResponse.js) — `successResponse` / `errorResponse` / `APIError` |
| A single auth gate helper | [lib/authz.js](../lib/authz.js) — `requireApiSession(roles)` returns `{ session }` or `{ error }` |
| A hard authorization chokepoint | [lib/parentAccess.js](../lib/parentAccess.js) — `requireParentChild`, never trusts a client `studentId` |
| A genuine design pattern, well executed | [lib/notifications/](../lib/notifications/) — Strategy pattern over delivery channels |
| Infrastructure behind interfaces with fallbacks | [lib/realtimeBus.js](../lib/realtimeBus.js) (Redis → in-memory), [lib/emailService.js](../lib/emailService.js) (SMTP → Resend → no-op) |
| Tests mirroring the layers | `tests/lib/` (pure logic) + `tests/api/` (route contracts) |
| Pure logic extracted for testability | `capacityViolation` exported from [participate/route.js:35](../app/api/events/%5Bid%5D/participate/route.js#L35) and unit-tested |

**What is not yet professional:**

- No data-access layer — 125 of 154 route handlers import Mongoose models directly.
- Two competing conventions for the same job (see the deviation counts in §7).
- No validation layer. `zod` is a declared dependency with **zero imports**.
- 106 of 131 components are `"use client"`; Server Components are barely used, so a
  React 19 / Next 16 app runs largely as a client SPA.
- Four route handlers still exceed 500 lines.

The honest summary: **one exemplary subsystem, a competent conventional skeleton,
and — until now — no enforcement.** The dependency rule is now checked by ESLint
at zero violations; the remaining deviations are counted in §7 and are being
retired in batches. See §10 for what has already been done.

---

## 2. The layers

```
┌─────────────────────────────────────────────────────────────┐
│  DELIVERY            app/**/page.js · components/**          │
│                      app/api/**/route.js                     │
│  HTTP, session, params, rendering. No business rules.        │
├─────────────────────────────────────────────────────────────┤
│  DOMAIN              lib/*.js · lib/notifications/**          │
│  Business rules, policy, orchestration. Framework-free.      │
├─────────────────────────────────────────────────────────────┤
│  PERSISTENCE         models/*.js · lib/db.js                  │
│  Mongoose schemas, indexes, the cached connection.            │
├─────────────────────────────────────────────────────────────┤
│  PLATFORM            proxy.js · lib/realtimeBus.js            │
│                      lib/emailService.js · lib/rateLimit.js   │
│  Edges: middleware, transports, external services.            │
└─────────────────────────────────────────────────────────────┘
```

**The dependency rule: arrows point down, never up.**

- Delivery may import Domain, Persistence, Platform.
- Domain may import Persistence and Platform. **Domain must never import from `app/`.**
- Persistence imports nothing from the layers above it.
- Platform is a leaf; it knows about transports, not about Pravyo's rules.

**This rule is enforced by ESLint** (`eslint.config.mjs`) as an *error*, not a
warning, and currently passes at zero violations. It must stay that way.

It reached zero by moving the NextAuth configuration out of the route: 108
modules — including [lib/authz.js](../lib/authz.js) — imported `authOptions`
from `app/api/auth/[...nextauth]/route`, pointing the whole domain layer at the
delivery layer. The config now lives in [lib/authOptions.js](../lib/authOptions.js)
and the route is a nine-line shim that does nothing but call `NextAuth()`.

### Layer responsibilities in practice

**Delivery — `app/api/**/route.js`**

New routes should use [`defineRoute`](../lib/routeHandler.js), which owns the
plumbing every handler used to repeat by hand — connect, gate, `try/catch`, and
the 500:

```js
export const GET = defineRoute(
  { roles: ["SCHOOL_ADMIN"] },
  async ({ request, params, session }) => {
    const notices = await listNotices(session.user.id);
    return successResponse(200, "Notices loaded", { notices });
  }
);
```

`roles: []` means any signed-in user; `roles: null` declares a PUBLIC route —
stated explicitly, because a missing gate is the one mistake here that fails
silently. It also awaits Next 16's async `params` once, and maps a thrown
`APIError` to its own status, so a domain function deep in `lib/` can raise
`new APIError("Notice not found", 404, "NOT_FOUND")` instead of threading
`{ error }` objects back up by hand.

[app/api/notices/route.js](../app/api/notices/route.js) is the worked example:
zero `try/catch`, zero `connectDB`, zero session boilerplate.

A handler should read like a table of contents. Its whole job:

1. Parse and validate input.
2. Call **one** domain function.
3. Return through `apiResponse`.

If a handler contains a `for` loop over students, a `new RegExp`, or three
`await Model.find()` calls in a row, that logic belongs in `lib/`.

**Delivery — `app/**/page.js` and `components/**`**

Pages compose; components render. A component that computes eligibility, merges
notification streams, or decides workflow state is holding domain logic — those
decisions belong in `lib/` so both the route and the component agree. This is
already done well in places: [lib/eventUiStatus.js](../lib/eventUiStatus.js) and
[lib/parentJourney.js](../lib/parentJourney.js) are presentation policy extracted
out of components.

**Domain — `lib/`**

The substantive layer, and the one to grow. A `lib/` module should be importable
by a route, a page, a script in `scripts/`, and a test without dragging in a
request object. Prefer pure functions; where a database read is unavoidable, call
`connectDB()` yourself rather than assuming a caller did it.

`lib/` is split by execution environment, and the split is ESLint-enforced:

- `lib/*.js` — **server** domain modules. May touch models, mail, Redis.
- `lib/client/*.js` — **browser** code: React hooks and subscriptions, each
  carrying `"use client"`. These must never import a model, `lib/db`,
  `lib/emailService`, or `lib/authOptions`; a server import here ships database
  code (and potentially secrets) to the browser. Fetch through an API route.

**Persistence — `models/`**

Schemas, indexes, and validators only. No cross-model orchestration in a model
file — that is domain work.

---

## 3. Cross-cutting concerns

These have exactly one home each. Using a second mechanism is a bug, not a style choice.

| Concern | The one way | Never |
| --- | --- | --- |
| API responses | `successResponse` / `errorResponse` / `validationError` from [lib/apiResponse.js](../lib/apiResponse.js) | Hand-rolled `NextResponse.json({...})` |
| Session + role gate | `requireApiSession(roles)` from [lib/authz.js](../lib/authz.js) — **ESLint-enforced** | `getServerSession` inline in a handler |
| Resolving the signed-in student | `buildStudentLookupForSession` from [lib/studentIdentity.js](../lib/studentIdentity.js) | Re-typing the four-field `$or` query |
| Parent → child access | `requireParentChild` from [lib/parentAccess.js](../lib/parentAccess.js) | Querying `Student` by a client-supplied id |
| Team vs individual events | `resolveParticipationFormat` from [lib/eventParticipationFormat.js](../lib/eventParticipationFormat.js) | A local `=== "TEAM"` check |
| DB connection | `connectDB()` from [lib/db.js](../lib/db.js) | A second `mongoose.connect` |
| Pagination + regex safety | `parsePagination` / `buildPagination` / `escapeRegex` from [lib/pagination.js](../lib/pagination.js) | Raw user input inside `new RegExp` |
| Notices to families | [lib/notifications/service.js](../lib/notifications/service.js) | Emailing directly from a route |
| Realtime | [lib/realtimeBus.js](../lib/realtimeBus.js) → SSE at `/api/realtime/stream` | Polling loops |
| Email | [lib/emailService.js](../lib/emailService.js), fire-and-forget | `await` on mail in a request path |
| Rate limiting | [lib/rateLimit.js](../lib/rateLimit.js) | Per-route counters |

Three invariants that come from hard-won bugs and must survive any refactor:

1. **Import every model you `.populate()`**, even if the binding is unused
   (`import "@/models/Event";`). A cold Vercel lambda loads only its own route
   graph; dev hides this, production throws `MissingSchemaError`.
2. **Email never throws and is never awaited.** `deliver()` swallows failures so a
   mail outage cannot fail a registration or an approval.
3. **Delivery reporting stays honest.** Email records as `QUEUED`, not `SENT`; a
   paper hand-over never sets `openedAt`.

---

## 4. The reference implementation

When you need to know what "good" looks like in this codebase, read
[lib/notifications/](../lib/notifications/). It is the newest subsystem and the
only one designed rather than accreted.

```
                    Notice (one record, written once)
                              │
                  resolveNoticeRecipients()   ← 4 bulk queries, no N+1
                              │
        ┌─────────┬───────────┼───────────┬──────────┐
     InApp    ParentInbox    Email     Offline      SMS
        └─────────┴───────────┴───────────┴──────────┘
                              │
                       NoticeReceipt (what was attempted, per guardian)
```

What makes it worth copying:

- **An explicit contract.** [NotificationChannel.js](../lib/notifications/NotificationChannel.js)
  is an abstract base class with a documented `DeliveryResult` shape. Every
  channel answers the same four questions.
- **`isConfigured()` and `canReach()` are separate.** A channel can be configured
  but unable to reach one guardian, or reachable in principle but not configured.
  Keeping them apart is what lets the UI say "SMS not configured" instead of
  "guardian unreachable."
- **Channels never throw; errors are returned as data.** A dead SMTP host cannot
  block the in-app notice or fail the school's publish action.
- **Registration order is delivery order,** stated in one array, cheapest path first.
- **Extension is additive.** Adding SMS is a new file plus a config flag — no
  notice route changes.
- **The comments explain *why*,** including the cost of each trade.

Apply the same shape to the next subsystem that has multiple interchangeable
strategies (payment providers, storage backends, certificate renderers).

---

## 5. Request lifecycle

```
Browser
  → proxy.js               auth gate + role redirect (Next 16's middleware, renamed)
  → app/api/**/route.js    requireApiSession → parse → delegate → apiResponse
      → lib/**             business rules; may connectDB()
          → models/**      Mongoose
      → lib/realtimeBus    publish side-effects (SSE fan-out)
      → lib/emailService   fire-and-forget, never awaited
  ← { success, message, data }
```

Two role systems meet here and are the most common source of confusion: `User`
(`SUPER_ADMIN` / `SCHOOL_ADMIN` / `TEACHER`) and the separate `Student` and
`Parent` collections with their own login surfaces. They are distinct
collections, not rows of one table. Auth code must always say which it means.

---

## 6. Rules for new code

A checklist for any new route:

- [ ] Gated by `requireApiSession` (or `requireParentChild` under `/api/parent/**`).
- [ ] Returns exclusively through `lib/apiResponse.js`.
- [ ] Calls `connectDB()` before any model access.
- [ ] Imports every model it populates.
- [ ] Under ~150 lines. Past that, the logic belongs in `lib/`.
- [ ] Any user string reaching `new RegExp` goes through `escapeRegex`.
- [ ] Lists paginate via `parsePagination` / `buildPagination`.
- [ ] Business rules are in a `lib/` function that a test can call directly.
- [ ] Notices to families go through `lib/notifications/service.js`.

For any new `lib/` module:

- [ ] Server modules take plain arguments, not `Request` objects.
- [ ] Client hooks are named `use*.js` and carry `"use client"`.
- [ ] No imports from `app/`.
- [ ] Non-obvious trade-offs are explained in a comment, with the cost named.

### Where does it go?

| I'm adding… | It goes in |
| --- | --- |
| A new endpoint | `app/api/<resource>/route.js` — thin |
| A rule about who may do what | `lib/authz.js` or the feature's `lib/` module |
| A calculation used by both a route and a component | `lib/<feature>.js` |
| A new field on an entity | `models/<Model>.js` + a `scripts/` backfill |
| A new way of reaching families | A channel class in `lib/notifications/channels.js` |
| A one-off data migration | `scripts/*.mjs`, exposed as `npm run db:*` |
| Shared UI | `components/ui/` |
| Feature UI | `components/<feature>/` |

---

## 7. Known deviations

Measured, not estimated. These are the gap between this document and the code.

Counts are refreshed as the migration proceeds. Reproduce them with the commands
in §11 — do not trust a remembered number.

| # | Deviation | Was | Now | Cost |
| --- | --- | --- | --- | --- |
| D1 | Routes import models directly instead of going through domain functions | 126 | **125** | Business rules duplicated per route; a policy change means finding every copy |
| D2 | Hand-rolled `NextResponse.json` instead of `apiResponse` | 84 | **84** (67 comply) | Clients face two response shapes; error handling is per-route guesswork |
| ~~D3~~ | ~~`getServerSession` inline instead of `requireApiSession`~~ | 93 | **RESOLVED** | All 118 call sites converted; now an ESLint **error** at zero |
| D4 | Handlers over 500 lines | 5, largest 1,363 | **3, largest 1,036** | Untestable except through HTTP; merge-conflict magnets |
| D5 | No validation applied at any route boundary | 0 routes | 0 routes (machinery now works) | Malformed input reaches Mongoose |
| ~~D6~~ | ~~`lib/services/` empty~~ | — | **RESOLVED** | Directory deleted. `lib/*.js` **is** the service layer |
| ~~D7~~ | ~~Client hooks share the flat `lib/` namespace~~ | 7 files | **RESOLVED** | Moved to `lib/client/`, boundary now ESLint-enforced |
| D13 | Routes hand-rolling `try/catch` + `console.error` instead of `defineRoute` | 149 routes / 233 logs | **148** | Every route re-invents error handling; 567 raw `NextResponse.json` vs 73 `internalServerError` |
| D14 | `Teacher` is the only model of 33 without `timestamps` | 1 | 1 | No `createdAt`/`updatedAt` on teacher records |
| D8 | Components over 1,000 lines | 6, largest 1,746 | 6, largest 1,746 | Domain logic hiding in JSX |
| D9 | `"use client"` almost everywhere | 106 / 131 | 106 / 131 | Server Components unused; larger bundles, more client fetching |
| ~~D10~~ | ~~Routes that never call `connectDB()`~~ | 40 | **RESOLVED (audited, not a defect)** | Every one delegates to a `lib/` module that connects itself; zero routes touch a model unconnected |
| ~~D11~~ | ~~`lib/` importing from `app/`~~ | 108 imports | **RESOLVED** | `authOptions` moved to `lib/`; now an ESLint **error** at zero |
| ~~D12~~ | ~~The session→Student query hand-copied per call site~~ | 20 copies | **RESOLVED** | One `buildStudentLookupForSession` in `lib/studentIdentity.js` |

D1 and D2 are the ones that compound: every new route written the old way doubles
the eventual conversion work.

**Why D2 went up rather than down.** Extracting the fat handlers left their
existing `NextResponse.json` calls in place, and the count is per-file, so files
that were already non-compliant stayed non-compliant while two more surfaced. D2
is deliberately *not* being fixed by bulk find-and-replace — see §8, Phase 2.

**Three bugs the drift was hiding.** Consolidating duplicates and auditing dead
code surfaced genuine defects, which is the argument for doing this work rather
than leaving the copies alone:

1. `app/api/events/route.js` carried its own `resolveParticipationFormat` that
   compared `value === "TEAM"` **case-sensitively**, while
   `lib/eventParticipationFormat.js` compares case-insensitively. An event created
   with `"team"` was stored as INDIVIDUAL and then read back as TEAM.
2. `app/api/student/history/route.js` had a copy of the student lookup missing
   both `status: "ACTIVE"` and the `userId` branch — so an inactive student could
   read their history, and a `userId`-linked student could not read it at all.
3. `validateWithZod` in `lib/validation.js` read `ZodError.errors`, which **zod 4
   renamed to `.issues`**. That threw a `TypeError` inside its own catch block, so
   the first invalid payload any route received would have returned a 500 instead
   of a 400. It had never fired because nothing imported the module.

All three are fixed and have regression tests.

---

## 8. Migration path

Sequenced so nothing breaks and each phase pays for itself. No big-bang rewrite.

**Phase 0 — stop the bleeding (zero risk) — ✅ DONE**
New code follows §6. Old code is left alone. This alone caps the deviation counts.

**Phase 1 — make the convention mechanical (low risk) — ✅ DONE**
- ✅ `authOptions` moved to `lib/authOptions.js`; 108 import sites repointed; the
  NextAuth route is now a nine-line shim.
- ✅ ESLint enforces the dependency rule as an **error** (zero violations) and the
  `lib/client` server-import ban as an **error**. D3 is surfaced as 86 warnings so
  the count is visible in CI; flip it to `error` when it reaches zero.
- ✅ Empty `lib/services/` deleted.
- ✅ Client hooks moved to `lib/client/`.

**Phase 2 — normalize the edges — 🔄 HALF DONE**

✅ **D3 is complete.** All 118 `getServerSession` call sites now go through
`requireApiSession`. They were byte-identical and every one was already
auth-gated (verified before converting — a route that merely *reads* an optional
session would have broken), so this was mechanical. The one behavioral change:
an unauthenticated request now gets the standard envelope
(`{ success: false, code: "UNAUTHORIZED" }`) instead of whatever bare shape the
route used. Status codes are unchanged. Four tests asserting the old bare body
were updated.

🔄 **D2 is a breaking change, not a refactor** — 84 routes remain. Routes return
bare payloads (`Response.json({ notices, pagination })`) and components read them
directly (`data.notices`). Switching a route to `successResponse` moves the
payload under `data`, so **every consuming component must change in the same
commit**. Never bulk-convert D2 with find-and-replace, and never trust a
"no consumer found" grep: fetch URLs are built dynamically, so a false negative
silently breaks a live screen.

**The worked example is the notices resource** — [notices/route.js](../app/api/notices/route.js),
[notices/[id]/route.js](../app/api/notices/%5Bid%5D/route.js) and their one
consumer [NoticeManager.js](../components/NoticeManager.js), all converted
together. The procedure, per resource:

1. **Find every consumer first.** `grep -rn "api/<resource>" app components`.
   If a route's URL is assembled from variables, read the call site — do not
   assume it has no consumer.
2. **Convert the route.** Success → `successResponse(status, message, payload)`.
   Errors → `errorResponse` / `notFoundError` / `validationError` /
   `internalServerError`.
3. **Move the consumers in the same change.** `data.notices` becomes
   `data.data.notices`. Read it once into a local (`const payload = data.data || {}`)
   rather than repeating `data.data` at every use.
4. **Error handling usually needs no change.** Clients that read
   `payload.error || payload.message` keep working, because every `apiResponse`
   error carries `message`. Verify rather than assume.
5. Run the suite and the build; both must stay green.

Order by consumer count, fewest first — the single-consumer resources are nearly
free, and each one done properly shrinks the count that matters.

**A shortcut that does not work — do not retry it.** The obvious idea is a
client-side accessor (`apiPayload(json)`) that flattens the envelope so every
component reads `payload.notices` regardless of shape, letting all 84 routes be
converted without touching a single component. It was built, tested, applied to
all 147 client `res.json()` sites — and reverted, because it is wrong here:

> **67 routes already return the envelope, and their consumers already read
> `json.data` correctly.** Flattening breaks all of them. The accessor trades
> one set of breakages for a larger one, and it silently converts a wrong read
> into `undefined` rather than an error.

A normalizing accessor only pays off when the client side is uniformly on the
*old* shape. Here it is already split, so there is no shortcut: the conversion
is per-resource, route and consumers together. That is the cost of having let
two conventions coexist, and it is the reason §6 exists.

**Phase 3 — thin the fat handlers (one at a time) — 🔄 IN PROGRESS**
- ✅ [lib/eventParticipation.js](../lib/eventParticipation.js) — extracted from the
  participate route (1,363 → 1,036). 12 exported rules, 26 unit tests.
- ✅ [lib/eventResults.js](../lib/eventResults.js) — extracted from the results
  route (1,022 → 525). 14 exported rules, 17 unit tests.
- ✅ [lib/eventCatalog.js](../lib/eventCatalog.js) — extracted from the events
  route (741 → 662). 4 exported rules, 21 unit tests, one duplication bug fixed.
- ⬜ Next: the handler bodies inside the participate route (POST is still ~500
  lines on its own), then
  [student/writings/[id]/route.js](../app/api/student/writings/%5Bid%5D/route.js) (505).

The pattern to follow: move self-contained helpers to a `lib/` module, export
them, write unit tests against the module, leave the handler as the caller. Every
step keeps the wire format identical, so nothing downstream needs to change.

**Phase 4 — introduce validation — 🔄 MACHINERY READY, SCHEMAS ARE NOT**

The plumbing now exists and is tested: `validateRequestBody(schema, request)` in
[lib/validation.js](../lib/validation.js) returns `{ data }` or `{ error }`,
mirroring `requireApiSession` so a handler reads the same way for both gates:

```js
const { session, error: authError } = await requireApiSession(["TEACHER"]);
if (authError) return authError;
const { data, error: invalid } = await validateRequestBody(schema, request);
if (invalid) return invalid;
```

⚠️ **The schemas in that file are drafts and do not match the live payloads.**
They were written speculatively and never imported, so nothing caught the drift —
`createEventSchema` requires `capacity`, `location`, `startDate` and `endDate`,
none of which `POST /api/events` sends. Wiring them in as-is would reject every
genuine request. Rewrite each against the real handler and model, with a test
feeding it a captured payload, before applying it to a route.

Apply per resource, most-abused endpoint first.

**Phase 5 — reclaim the server**
Split the largest client components: the data-fetching shell becomes a Server
Component, the interactive part stays `"use client"`. Start with
[app/schools/[id]/page.js](../app/schools/%5Bid%5D/page.js) — public, read-heavy,
and the biggest win given the ~69ms cluster RTT.

Track progress by re-running the counts in §7. They are the acceptance criteria.

---

## 9. Constraints that shape the design

Architecture here is not free-floating; three facts drive most of it.

1. **Database latency dominates.** Atlas M0, ~69ms RTT, ~2.4s cold connect,
   functions in `bom1`. Bulk queries over per-item loops is a hard rule, not a
   preference — `resolveNoticeRecipients` is written as four bulk queries for
   exactly this reason. Micro-optimizing handlers is wasted effort by comparison.
2. **Serverless cold starts.** Each lambda loads only its own import graph, hence
   the populate-import rule and the cached connection in `lib/db.js`.
3. **The audience is schools with uneven connectivity.** Every delivery path needs
   a degraded fallback: Redis → in-memory, SMTP → Resend → skip, digital notice →
   printed hand-over. Fallbacks are architecture, not error handling.

---

## 10. Migration log

Newest first. Each entry landed with the full suite green and a clean production build.

### 2026-08-18 — Phases 0 and 1 complete; Phase 2 half done; Phase 3 under way

| Change | Effect |
| --- | --- |
| `authOptions` → [lib/authOptions.js](../lib/authOptions.js) | 108 import sites repointed; the auth route dropped from 491 lines to 9; **D11 resolved** |
| Client hooks → [lib/client/](../lib/client/) | 7 modules moved, 29 importers updated; server/browser boundary now enforceable; **D7 resolved** |
| `lib/services/` deleted | **D6 resolved** — `lib/*.js` is the service layer |
| ESLint architecture rules | Dependency rule, client-import ban, and the session gate all **errors at zero** |
| `requireApiSession` everywhere | 118 call sites across 89 route files; **D3 resolved** |
| [lib/eventParticipation.js](../lib/eventParticipation.js) extracted | Participate route 1,363 → 1,036 |
| [lib/eventResults.js](../lib/eventResults.js) extracted | Results route 1,022 → 525 |
| [lib/eventCatalog.js](../lib/eventCatalog.js) extracted | Events route 741 → 662; fixed the case-sensitive format resolver |
| `buildStudentLookupForSession` consolidated | 20 hand-copied queries → 1; **D12 resolved**; fixed the `student/history` lookup |
| [lib/studentWritings.js](../lib/studentWritings.js) extracted | Writings route 505 → 433 |
| Validation layer repaired | Fixed the zod 4 `.errors`/`.issues` crash; added `validateRequestBody`; schemas flagged as drafts |
| D10 audited | Not a defect — no route touches a model unconnected |
| Notices converted to the envelope | First D2 resource done end-to-end: 2 routes + their consumer, together |

Test suite: **560 → 635** tests (57 → 62 suites), all passing. Lint: **0 errors,
0 warnings**. Production build clean. Three latent bugs fixed (see §7).

The only intentional wire change is the body of an unauthenticated 401; every
other response is byte-identical, so no client code needed to move.

**What is deliberately NOT done, and why.** D2 (86 routes), D8 and D9 are not
one-session work and must not be rushed: D2 changes the wire format for every
consuming component, and D8/D9 mean splitting six 1,000+ line components into
server and client halves. Each needs its own change-plus-callers commits. The
route to follow as a model of the finished state is
[app/api/parent/notifications/route.js](../app/api/parent/notifications/route.js):
zero model imports, all logic delegated to `lib/`, every response through
`apiResponse` — 80 lines that read like a table of contents.

---

## 11. Reproducing the numbers

The §7 counts are the acceptance criteria, so they must be checkable rather than
remembered:

```bash
# D1 — routes reaching straight for a model
grep -rl 'from "@/models/' app/api --include=route.js | wc -l

# D2 — hand-rolled responses vs the envelope
grep -rl 'NextResponse.json\|Response.json' app/api --include=route.js | wc -l
grep -rl 'lib/apiResponse'                   app/api --include=route.js | wc -l

# D3 — inline session vs the gate
grep -rl 'getServerSession'  app/api --include=route.js | wc -l
grep -rl 'requireApiSession' app/api --include=route.js | wc -l

# D4 / D8 — oversized files
find app/api  -name route.js -exec wc -l {} + | sort -rn | awk '$1>500'
find components -name '*.js' -exec wc -l {} + | sort -rn | awk '$1>1000'

# D5 — validation layer adoption
grep -rl 'from "zod"' app lib | wc -l

# The dependency rule itself (must stay at 0 errors)
npx eslint lib models app/api
```
