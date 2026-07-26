# Pravyo — project orientation

Written so a new session can get productive without reading the whole codebase.
If something here contradicts the code, the code wins — update this file.

## What it is

Pravyo is a school-life platform — think "LinkedIn for school life". Schools run
events and competitions, students build a verified portfolio (results,
certificates, published writing, magazine articles), and the public can browse
and verify any of it. Certificates carry a code plus a verification URL, so a
printed copy can be checked against the live site.

Live at **https://pravyo.infobytesnepal.com** (Vercel). The brand and the domain
are both "pravyo" — an older domain spelled "pratyo" was retired and now returns
`DEPLOYMENT_NOT_FOUND`. There should be no "pratyo" anywhere in the repo.

## Stack

- **Next.js 16** App Router, React 19, JavaScript (no TypeScript).
- **Tailwind CSS v4** via `@tailwindcss/postcss`; global tokens in `app/globals.css`.
- **MongoDB Atlas** through Mongoose 9 (`lib/db.js` holds the cached connection).
- **NextAuth v4**, credentials provider only, JWT sessions.
- **Resend** for transactional email; **Upstash Redis** for rate limiting and the
  realtime bus. Both are optional and degrade gracefully when unset.
- **Jest** for tests (`npm test`, 26 suites / 118 tests, runs serially).
- **k6** for load tests in `load-tests/`.

## Layout

| Path | What lives there |
| --- | --- |
| `app/` | Routes. `app/api/**/route.js` is the backend — ~125 route handlers. |
| `components/` | React components, grouped by feature (`certificates/`, `public/`, `student/`, `school/`, `events/`, `ui/`). |
| `lib/` | Business logic and helpers — the substantive layer, ~60 modules. |
| `models/` | 26 Mongoose schemas. |
| `scripts/` | One-off `.mjs` migrations and backfills, exposed as `npm run db:*`. |
| `docs/` | Design and audit notes (`REDESIGN.md`, `DEEP_AUDIT.md`, `WORK_INDICATORS.md`, `REALTIME_AND_NOTICES.md`, `ACADEMIC_YEAR_AND_PORTFOLIO.md`, `load-testing.md`). |
| `proxy.js` | **This is the Next.js middleware.** Next 16 renamed `middleware.js` to `proxy.js`. It does auth gating and role-based redirects. Do not delete it as a stray. |

## Roles and auth

Four roles on the `User` model: `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`,
`STUDENT`. Students are a separate `Student` collection with their own login
surface (`/student/login`) — `User` and `Student` are distinct, which is the
single most common source of confusion when reading auth code.

Schools carry a lifecycle status: `PENDING` → `APPROVED` / `REJECTED`, plus
`SUBSCRIBED` / `UNSUBSCRIBED`. Access is granted for `APPROVED` and `SUBSCRIBED`
only; a suspended school lands on `/school/suspended`.

`proxy.js` redirects an authenticated user hitting `/` straight to their
role dashboard, which keeps the public homepage cacheable.

## Conventions worth matching

- API handlers return through `lib/apiResponse.js` (`successResponse`,
  `errorResponse`, `validationError`) — don't hand-roll `NextResponse.json`
  shapes in new routes.
- Any user-supplied string interpolated into a `new RegExp` must go through
  `escapeRegex` from `lib/pagination.js`. An unescaped `(` otherwise throws and
  500s the route.
- Pagination goes through `buildPagination` / `parsePagination` in the same module.
- Grade values are messy in the data — "9", "Grade 9", "Class 9" all occur, so
  grade queries fan out across those variants deliberately.
- Dates support both AD and BS (Nepali) calendars; see `lib/nepaliDate.js` and
  `lib/academicYear.js`.
- Realtime updates flow through `lib/realtimeBus.js` over SSE at
  `/api/realtime/stream`, with in-memory fallback when Redis is absent.

## Deployment

Vercel, region `bom1` (see `vercel.json`). `.env.local` is **not** deployed —
production env lives in the Vercel dashboard and changes need a redeploy.
`.env.example` documents every variable.

Required: `MONGODB_URI`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`.
`NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` must both be the live origin with no
trailing slash.

Two deployment gotchas that have bitten before:

1. **Secure-cookie mismatch.** In `app/api/auth/[...nextauth]/route.js`,
   `useSecureCookies` must match what NextAuth's reader computes
   (`NEXTAUTH_URL?.startsWith("https://") ?? !!process.env.VERCEL`). When it
   only checked `NEXTAUTH_URL`, Vercel wrote a non-`__Secure-` cookie while the
   reader expected `__Secure-`, so login silently reloaded forever. Already
   fixed — don't reintroduce it. Affected browsers need their cookies cleared.
2. **`NEXT_PUBLIC_SITE_URL` is baked into the client bundle** and feeds
   canonical/OG metadata, `robots.txt`, `sitemap.xml`, email links, and the
   verification host printed on certificates. If it is stale, printed
   certificates point at a dead domain. Verify after any domain change with
   `curl https://pravyo.infobytesnepal.com/robots.txt` — the `Sitemap:` line
   must show the current host.

Admin bootstrap is fail-closed: `POST /api/admin/bootstrap` returns 403 unless
`SUPER_ADMIN_BOOTSTRAP_TOKEN` is set. The auto-seed in `lib/seedSuperAdmin.js`
refuses to run in production unless explicitly overridden.

## Performance

The dominant cost is database latency, not application code — Atlas M0 with
~69ms RTT and ~2.4s cold connect. Functions run in `bom1`; the fix is moving
the cluster region closer, not micro-optimizing handlers. The Mongo connection
timeout was deliberately raised to survive M0 cold resume (commit `446a3ae`).

## Commands

```bash
npm run dev              # dev server
npm run build            # production build
npm test                 # jest, serial
npm run lint             # eslint
npm run db:ensure-indexes
npm run load:smoke       # k6, needs BASE_URL or defaults to prod
```

## Housekeeping

`NEXTAUTH_SECRET` and the Atlas URI in `.env.local` were exposed in a chat
transcript on 2026-06-29 and should be rotated if that hasn't happened yet.
