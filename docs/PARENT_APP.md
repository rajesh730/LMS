# The Parent App

A dedicated, mobile-first experience for parents and guardians. Separate from
the Admin, Teacher and Student surfaces — none of those were changed.

Product principles: **See the child. Understand the journey. Know what needs
attention. Celebrate progress. Communicate with the school.**

---

## 1. Where things live

| Path | What |
| --- | --- |
| `app/parent/**` | 12 parent pages. `layout.js` chooses shell vs. bare. |
| `app/api/parent/**` | 17 route handlers, all gated by `lib/parentAccess.js`. |
| `app/api/school/guardians/route.js` | School-side guardian authorisation. |
| `app/school/guardians/page.js` | School UI for inviting/permissioning/revoking. |
| `components/parent/**` | Shell, bottom nav, child switcher, cards, chat, TTS. |
| `lib/parent*.js` | Access, journey, home priority, notices, messaging, i18n. |

## 2. Data model

**New collections**

- `Parent` — guardian account. Its own collection (like `Teacher`/`Student`),
  not a `User` role, because a guardian is not scoped to one school. Embeds
  `preferences` (Simple Mode, language, calendar, data saver, channels).
- `ParentStudentLink` — **the authorisation edge**. The only thing that grants a
  parent access to a child. Carries `relationshipType`, `accessLevel`, five
  permission booleans, `isPrimaryGuardian`, `status`.
- `GuardianInvitation` — school-issued, code stored **hashed**, 30-day TTL.
- `NoticeReceipt` — per (notice × parent × student): `deliveredAt`, `openedAt`,
  `acknowledgedAt`, consent decision + guardian snapshot.
- `Conversation` / `Message` — parent↔school threads, topic-routed.

**Extended (additive only — no destructive migration)**

- `User.role` enum `+ PARENT` (legacy/compat; real guardians live in `Parent`).
- `Student.photoUrl` (new, empty everywhere, initials fallback).
- `Notice` `+ requiresAcknowledgement`, `requiresConsent`, `actionDeadline`,
  `targetStudents[]`. All default to today's behaviour.
- `UserNotification` `+ PARENT` target, `recipientParent`, `priority`, more
  categories.
- `SchoolConfig.parentMessaging` — topic → staff routing.

**Reused, not duplicated:** `Student` (+`enrollments[]`), `Achievement`
(certificates live here), `SchoolMagazineArticle`, `Event`,
`ParticipationRequest`, `Notice`, `UserNotification`, `Teacher`, `User`
(= school), `lib/apiResponse`, `lib/pagination`, `lib/schoolGrades`,
`lib/certificates`, `lib/nepaliDate`, `lib/rateLimit`, `lib/writingCategories`.

**No `JourneyEntry` collection.** See §4.

## 3. Security — the single gate

Every parent API passes through `lib/parentAccess.js`:

```
session → Parent (ACTIVE) → ParentStudentLink (ACTIVE) → Student → permission
```

Rules enforced there, not per-route:

- **A `studentId` from the client is a claim, never a fact.** Handlers use the
  `student`/`context` the guard returns, and never re-read the request for
  identity.
- **School comes from the student record**, never the request — this is what
  makes multi-school families safe (§36).
- **Unauthorised and nonexistent students return the identical 403**, so the
  endpoint cannot be used to probe which student ids exist.
- Only `status: "ACTIVE"` links match, so a school revocation takes effect on
  the guardian's very next request.

Permissions (`canViewPortfolio`, `canReceiveNotices`, `canRegisterEvents`,
`canGiveConsent`, `canMessageSchool`) are per-link, so two guardians of the same
child legitimately differ — the separated-family case in §20.

## 4. Journey is derived, not stored

`lib/parentJourney.js` projects the timeline from `Achievement`,
`SchoolMagazineArticle`, `ParticipationRequest` and `Student.enrollments[]` on
read.

Why: §35 requires no duplicate entries and references to source entities. A
stored timeline needs a write on every award/article/result path; one missed
hook or one replayed backfill produces exactly the duplicates the spec forbids.
Deriving makes duplication structurally impossible, and a corrected achievement
is corrected on the timeline for free.

Two de-duplication rules:

- A **certificate is an attachment on its achievement**, not a second node.
  The "Certificates" filter selects entries carrying one.
- **Participation is suppressed when the same event produced an award** —
  "took part in the debate" and "won Best Speaker at the debate" are one
  milestone.

**Transfer safety:** every entry carries the school from its *source record*,
never the student's current school. Grouping by year shows `2025 Orbit`,
`2026 Green Village`. The new school cannot reattribute or edit old entries.

## 5. Read receipts — the rule that matters

§11: *do not mark a notice read simply because it appears in a list.*

- `listNoticesForStudent` writes **only** `deliveredAt`, via `$setOnInsert`.
- `markNoticeOpened` is the **only** writer of `openedAt`, called from exactly
  one place: the notice **detail** route, after the notice is confirmed
  deliverable to that child. A probe with a known notice id creates nothing.
- First open wins — a re-read filters on `openedAt: null`.
- State is per (guardian × child), so the mother reading it leaves the father's
  row untouched, and leaves the sibling's copy untouched.

Consent snapshots the guardian's name and relationship onto the receipt, so the
record stays interpretable after a link is revoked.

## 6. Messaging routing

A parent picks a **topic**, never a person. `SchoolConfig.parentMessaging.routes`
maps topic → staff inbox. Unconfigured schools fail **open** to the school admin
(a parent unable to reach the school at all is worse than a message landing in
the office). Topics the school does not offer are rejected, not silently
rerouted. Staff are refs; no personal phone numbers or emails are ever exposed.

## 7. Accessibility and reach

- **Simple Parent Mode** — root font scale, larger icons/targets, body prose
  dropped, one CTA per card, Home capped at 5 cards.
- **Listen** — browser `SpeechSynthesis`, no paid service. Tagged with the
  guardian's locale; falls back to the default voice when `ne-NP` is absent.
  Hides itself where unsupported.
- **Language** — `lib/parentI18n.js`, flat dictionaries, `en` + `ne`. Missing
  key → English → the key. Never blank.
- **Status system** — colour is never alone. `StatusCard` cannot render a colour
  without its icon and text. RAG is for attention only; learning uses the
  separate, always-affirming 🌱📈⭐🏆 scale.
- **Low bandwidth** — server-sliced previews, paginated history, lazy images,
  thumbnails first, denormalised unread counts (one query per thread list),
  skeletons over spinners.

## 7a. Parent Access — identity without a phone, an email, or a PIN

The core rule: **a phone, email or smartphone may improve the experience, but
must never be required for a guardian to have legitimate access.** Identity and
contact method are separate concepts.

**The whole flow:** school creates the guardian → Pravyo issues a Parent Access
Card → parent scans the QR, or types the Parent ID on it → they are in. There is
no activation step, no confirmation wizard, and no PIN. The first sign-in and
the hundredth are identical.

### The Parent ID is the credential

This is the single most important fact about parent auth, and it reverses the
original design. Guardians used to choose a 6-digit PIN during activation, with
the Parent ID as an identifier only. That was correct on paper and wrong in the
field: it put "invent, confirm and remember a secret" between a guardian and
their own child, and the guardians this product exists for are exactly the ones
for whom that is a wall. **The second factor was traded for reach, knowingly.**

What the trade costs, stated so nobody has to infer it:

- **Anyone holding the card — or the ID off it — can sign in.** The card is a
  key and must be handed over like one. The printed card says so in both
  languages.
- **The Parent ID is no longer safe to treat as public.** Staff see it (they
  issue it); it must not go in shared URLs, logs, or the audit trail.
- **A lost card is killed by issuing a new one**, which ROTATES the Parent ID
  and bumps `authVersion`. That is the only thing that makes a leaked ID stop
  working, and it is why "New card" is confirmed and worded as destructive
  while everything else about cards is repeatable.

The remaining defences are the ID's own entropy (32⁶ ≈ 1.07 billion, random and
non-sequential, so the space stays sparse), the IP rate limit on the sign-in
route, and `accessState` — a Parent row that was never issued a card cannot be
signed into, which matters because registration auto-linking and the backfill
both mint Parent rows nobody was ever given access to.

| Piece | Where | Notes |
| --- | --- | --- |
| **Parent ID** | `lib/parentIdentity.js` | `PRV-P-X7K4Q9`. Random, non-sequential, not derived from any id. Alphabet excludes O/0/I/1 — it gets read aloud. Case- and hyphen-insensitive on entry. Rotated only by `issueParentAccess({ purpose: "REISSUE" })`. |
| **Sign-in** | `lib/parentCredentials.js` | `verifyParentId` (typed) and `verifyParentCardToken` (scanned legacy card). One opaque failure for every rejection, so the form is not an ID-existence oracle. |
| **Card** | `components/school/ParentAccessCard.js` | Server-rendered inline SVG QR via the existing `qrcode` package. **No new dependency, no external QR service.** Black-and-white safe, bilingual. QR encodes `/parent/login?id=…`. |
| **Print** | `app/globals.css` | The project had no print styles; `@media print` + `@page` added. Browser print, not a paid PDF service. |
| **Legacy cards** | `models/ParentActivation.js` | **Read-only.** Cards printed under the old flow encode `/parent/activate?t=…`; that route redirects into sign-in and the token still resolves. Nothing creates new rows. |

**Reprinting is free.** The card carries only the Parent ID, which is stored in
readable form, so `/school/guardians/card?link=…` renders on demand and a bulk
run never rotates an existing ID. Under the old one-time-PIN design every
reprint silently killed the previous batch — that trap is gone.

**Three access states are kept distinct** (§59), because conflating them is how
a school revokes the wrong thing:

- `Parent.accessState` — can they sign in at all?
- `Parent.status` — is the account alive?
- `ParentStudentLink.status` — are they linked to *this* child?

Removing one child is a link operation; revoking sign-in is an account
operation. A father losing Child A keeps Child B. Revocation does **not** rotate
the ID, so restoring access makes the guardian's existing card work again.

**Shared devices** (§12) are enforced server-side in `lib/parentAccess.js`: a
`SHARED` session stops being trusted after 30 idle minutes and returns
`SESSION_EXPIRED`, and `ParentAppContext` sends any 401 back to sign-in. A
client-side timer would be bypassed by not running the JavaScript.

**Login** is `/parent/login` and nothing else — `/parent/access` and
`/parent/activate` redirect into it. The old email/password form is kept behind
"Other ways to sign in" (§57 — existing guardians are never forced to migrate).

## 7b. Publish once — the channel architecture

`lib/notifications/` implements §24/§70: a school writes ONE `Notice` and the
service resolves who it reaches and how.

```
Notice ──▶ NotificationService
             ├─ InAppNotificationChannel   (always on, all priorities)
             ├─ EmailNotificationChannel   (optional; reuses emailService)
             ├─ OfflineDeliveryChannel     (produces the follow-up list)
             └─ SmsNotificationChannel     ← INERT. isConfigured() === false
```

**No paid SMS provider is installed or called** (§61). `SmsNotificationChannel`
is an interface stub. Enabling SMS later = implement `send`, point
`isConfigured` at real credentials, done. **No notice route changes.**

Honesty rules that are tested, not just documented:

- Email reports `QUEUED`, never `SENT` — handing a message to a transport is
  not delivery (§40).
- A **paper hand-over never sets `openedAt`** (§39). Giving someone a sheet is
  not evidence they read it.
- An in-person acknowledgement is stamped `acknowledgementMethod: "IN_PERSON"`
  with the staff member who recorded it — never mistaken for the guardian
  tapping the button.
- A guardian with **no email and no phone is "🟢 Connected"** if they have
  activated Pravyo access (§36). Lacking contact details is not being
  unreachable.

## 7c. Offline inclusion

| Feature | Route |
| --- | --- |
| Delivery overview + metrics | `/school/notices/[id]/delivery` |
| Offline follow-up list (printable) | same page |
| Record paper hand-over | `PATCH …/delivery` |
| Printable Parent Summary | `/school/students/[id]/summary` |
| School-Assisted Parent View | `POST /api/school/assisted-access` |

**Assisted access does not impersonate.** Staff stay signed in as themselves and
a read-only projection renders. All seven §55 safeguards fire in order —
authentication, same-school, explicit student, relationship validation, a
required written reason, an audit row written *before* any data is returned, and
an allow-listed payload. The guardian's own permissions still apply, so an
assisted session can never show more than that guardian would see at home. There
is deliberately **no "view any parent" entry point**.

## 8. Known gap — attachment storage

**Voice messages, photos and documents cannot be sent yet.**

This project has no object storage: every existing "upload" is a user-pasted
URL. Voice/photo/document need real binary storage, and adding a provider needs
credentials and infrastructure decisions outside this work.

What *is* built and working: the hold-to-talk recorder (`MediaRecorder` capture,
cancel-on-slide, duration), the attachment schema, the chat rendering for all
three kinds, and validated upload endpoint (`/api/parent/uploads`) with auth,
MIME allow-list and an 8 MB cap.

What is missing: `putObject` in `lib/parentUploads.js`. It currently throws
`StorageNotConfiguredError`, which the route turns into a 503 and the recorder
shows verbatim ("File attachments are not available yet. Please send a text
message.") — so the failure is honest rather than silent.

**To enable:** implement `putObject` and `isStorageConfigured` in
`lib/parentUploads.js`. That file is the only thing that needs to change.

## 8a. Deprecation path for the old invitation flow (§57)

Nothing was deleted. `/parent/register`, `/parent/link` and existing
`GuardianInvitation` codes all still work.

- **Phase 1–2 (done):** Parent Access Card is the default in the school UI.
- **Phase 3 (done):** the old flow is labelled "Use invitation code" and carries
  a note steering staff to the card flow.
- **Phase 4 (later):** deprecate after usage review. Do not remove until
  outstanding codes have expired and no school is mid-rollout.

`Parent.password` is now **optional**. Guardians created via Parent Access never
have one; guardians who already had one keep signing in with it.

**The guardian PIN was removed entirely** (see §7a). `Parent.pinHash`,
`pinSetAt`, `failedPinAttempts` and `lockedUntil` are still declared but inert —
dropping fields from a schema does not remove them from documents already in
Atlas, and a half-migrated collection is worse than four dead columns. Safe to
drop in a deliberate migration.

## 9. Other deferred work

- **SMS/email delivery of notifications** (§21). Preferences are recorded and
  the SMS toggle is labelled "Coming soon". Only in-app notifications deliver.
- **Web-push deep links** (§17). Notifications carry correct `href` deep links
  and render in-app; no service worker / push subscription yet.
- **School-side reply UI.** Parents can start and reply to threads; staff
  replies need a school inbox screen. The `Conversation`/`Message` models and
  `appendMessage` already support `senderType: "STAFF"`.
- **School UI for `parentMessaging.routes`.** The schema and resolver exist;
  routes must currently be seeded directly. Unconfigured schools fail open to
  the admin, so messaging works meanwhile.
- **Realtime.** Parent screens poll on navigation. `lib/realtimeBus.js` +
  `/api/realtime/stream` exist and could carry parent channels.
- **Translation / transcription of messages.** Fields reserved on `Message`.

## 10. Running it

```bash
npm run dev
npm test          # 45 suites / 398 tests
npm run lint
npm run build
```

**Guardian setup (current flow):** School → **Parents & Guardians** → pick a
student → *Invite guardian* → **New guardian** → name + relationship (phone and
email optional) → **Add guardian & print card**. The card opens in a new tab
with the QR and the Parent ID. Print it and hand it over.

The parent then scans the QR with their phone camera, or goes to `/parent/login`
and types the Parent ID. That is the entire journey.

**Reprint any time** from the guardian's access panel → **Show card**. It is
non-destructive. **New card** is the destructive one: it changes the Parent ID,
signs the guardian out, and is only for a card that was lost or seen by the
wrong person.

Indexes: the new collections declare their own; run `npm run db:ensure-indexes`
after deploying if that script is extended to cover them.
