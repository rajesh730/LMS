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

## 7a. Parent Access — identity without a phone or an email

The core rule: **a phone, email or smartphone may improve the experience, but
must never be required for a guardian to have legitimate access.** Identity and
contact method are separate concepts.

**Onboarding is now:** school creates the guardian → Pravyo issues a Parent
Access Card → parent scans the QR (or types Parent ID + PIN) → confirms the
child → picks a language → chooses a 6-digit PIN → done. No email, no password,
no self-registration form, no long code to copy.

| Piece | Where | Notes |
| --- | --- | --- |
| **Parent ID** | `lib/parentIdentity.js` | `PRV-P-X7K4Q9`. Random, non-sequential, not derived from any id. Alphabet excludes O/0/I/1 — it gets read aloud. Case- and hyphen-insensitive on entry. **Identifier, never a credential** (§53). |
| **Activation** | `models/ParentActivation.js` | One-time. QR token = 32 random bytes, SHA-256 at rest. Activation PIN = 6 digits, **bcrypt** at rest (weak secret ⇒ needs the work factor). Both unreadable after the card prints. |
| **Guardian PIN** | `Parent.pinHash` (`select: false`) | bcrypt. Weak-PIN rejection (`000000`, `123456`, runs). 5 attempts → 15-minute lock. |
| **Card** | `components/school/ParentAccessCard.js` | Server-rendered inline SVG QR via the existing `qrcode` package. **No new dependency, no external QR service.** Black-and-white safe, bilingual. |
| **Print** | `app/globals.css` | The project had no print styles; `@media print` + `@page` added. Browser print, not a paid PDF service. |

**Three access states are kept distinct** (§59), because conflating them is how
a school revokes the wrong thing:

- `Parent.accessState` — can they sign in at all?
- `Parent.status` — is the account alive?
- `ParentStudentLink.status` — are they linked to *this* child?

Removing one child is a link operation; revoking sign-in is an account
operation. A father losing Child A keeps Child B.

**Shared devices** (§12) are enforced server-side in `lib/parentAccess.js`: a
`SHARED` session stops being trusted after 30 idle minutes and returns
`PIN_REQUIRED`. A client-side timer would be bypassed by not running the
JavaScript.

**Login** now leads with Parent ID + PIN; the old email/password form is kept
behind "Other sign-in options" (§57 — existing guardians are never forced to
migrate).

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
with the QR, Parent ID and activation PIN. Print it and hand it over.

The parent then scans the QR with their phone camera, or goes to
`/parent/access` and types the Parent ID + PIN.

⚠️ **The activation PIN is shown once.** It is stored hashed and cannot be
re-rendered. If it is lost, use **Reissue card** — which invalidates the old one.

Indexes: the new collections declare their own; run `npm run db:ensure-indexes`
after deploying if that script is extended to cover them.
