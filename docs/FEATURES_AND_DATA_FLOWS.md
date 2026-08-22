# Pravyo: Features and End-to-End Data Flows

Status: living implementation guide  
Last verified against the repository: 2026-08-22

This document explains what the Pravyo application currently does, who can do
it, where the implementation lives, which records are read or written, and how
data moves between the four primary product layers:

1. Super Admin
2. School (including the supporting Teacher role)
3. Student
4. Parent / Guardian

It describes implemented behavior. It is not a product roadmap. When this file
and the code disagree, verify the code and update this file in the same change.

Related specialist documents:

- [Architecture](./ARCHITECTURE.md)
- [Parent App](./PARENT_APP.md)
- [Academic Year and Portfolio](./ACADEMIC_YEAR_AND_PORTFOLIO.md)
- [Realtime and Notices](./REALTIME_AND_NOTICES.md)

---

## 1. Product boundary

Pravyo is a multi-school platform for school administration, student identity,
events and competitions, writing and magazines, notices, achievements,
certificates, guardian access, and public school/student discovery.

The four layers are user experiences, not four isolated systems. They share the
same application, MongoDB database, domain modules, notification system, and
public publishing surface.

```text
Super Admin
  | approves/configures schools and owns platform-wide events/notices
  v
School + Teachers
  | enroll students, operate school events, review writing, contact guardians
  v
Student
  | writes, participates, receives notices, builds a lifelong portfolio
  v
Parent / Guardian
  | receives school communication and views an explicitly linked child

All approved public content -> Public website -> visitors without an account
```

### Technology and physical layers

| Layer | Responsibility | Main locations |
| --- | --- | --- |
| Delivery | Pages, components, HTTP parsing and responses | `app/`, `components/` |
| Domain | Business rules and orchestration | `lib/` |
| Persistence | Mongoose schemas and indexes | `models/`, `lib/db.js` |
| Platform | Authentication, proxy gates, realtime, email, push and rate limits | `proxy.js`, `lib/authOptions.js`, `lib/realtimeBus.js`, `lib/emailService.js`, `lib/webPush.js`, `lib/rateLimit.js` |

The normal request path is:

```text
Browser action
  -> proxy.js route/role gate
  -> page or app/api/**/route.js
  -> requireApiSession() or parent-child authorization
  -> lib/** business policy
  -> models/** through the cached MongoDB connection
  -> optional realtime/email/push side effects
  <- API response
  <- client state and UI refresh
```

---

## 2. Identity, authentication and authorization

### 2.1 Identity stores

The roles do not all live in one collection.

| Experience | Session role | Identity source | Primary sign-in |
| --- | --- | --- | --- |
| Super Admin | `SUPER_ADMIN` | `User` | `/login` |
| School Admin | `SCHOOL_ADMIN` | `User` | `/login` |
| Teacher | `TEACHER` | `Teacher` (with school ownership) | `/login` |
| Student | `STUDENT` | `Student` | `/student/login` or scoped credential login |
| Parent | `PARENT` | `Parent` | `/parent/login`, normally with a printed Parent ID |

NextAuth credentials, password comparison, token refresh, account-status checks,
school context, session revocation, and login throttling are centralized in
`lib/authOptions.js`. The session uses a long-lived JWT, but database-backed
status and authorization version are periodically revalidated.

### 2.2 Route protection

`proxy.js` protects the page namespaces:

| Namespace | Allowed role |
| --- | --- |
| `/admin/**` | Super Admin |
| `/school/**` | School Admin; selected operational access for Teacher |
| `/teacher/**` | Teacher or School Admin |
| `/student/**` | Student, except public `/student/login` |
| `/parent/**` | Parent, except access/login/registration/activation entry points |

API routes must independently authorize requests. Page protection is not a
substitute for API authorization. Staff APIs use `requireApiSession()` from
`lib/authz.js`. Parent APIs must resolve the signed-in guardian and verify the
requested child through `lib/parentAccess.js`; they must never trust a submitted
student ID by itself.

### 2.3 Ownership boundaries

- A School Admin may access records belonging to its own school.
- A Teacher is part of the School layer but is not equivalent to a School
  Admin. Event management is limited to school events the teacher created or
  was assigned to mentor.
- A Student may mutate their own writing and participation state, not another
  student's records.
- A Parent may see only children connected by an active `ParentStudentLink`.
- A Super Admin has platform scope, but platform scope should still be explicit
  in every API gate and audit trail.
- Public visitors receive serialized, published fields only; database records
  and private workflow fields are not public contracts.

---

## 3. Super Admin layer

Primary navigation is defined by `ADMIN_NAV_LINKS` in
`components/navigation/appNavigation.js`.

### 3.1 Feature map

| Feature | User surface | Primary APIs / domain | Main data |
| --- | --- | --- | --- |
| School registration approval | `/admin/dashboard?tab=approvals` | `/api/admin/users`, `/api/schools/[id]/status` | `User`, `ActivityLog` |
| School directory management | `/admin/dashboard?tab=schools` | `/api/admin/users/[id]`, `/api/schools/[id]/reset-password`, `/api/admin/school-config` | `User`, `SchoolConfig` |
| Platform events | `/admin/dashboard?tab=events`, `/admin/events/[id]/manage` | `/api/events`, event management, rounds, notices and result APIs | `Event`, `EventRound`, `RoundParticipant`, `RoundSubmission`, `Achievement`, `EventNotice` |
| Platform notices | `/admin/dashboard?tab=notices` | `/api/notices` and `/api/notices/[id]` | `Notice`, `NoticeReceipt`, `UserNotification` |
| School spotlight promotion | `/admin/dashboard?tab=spotlight` | `/api/admin/school-promotions` | `SchoolPromotion`, `SchoolShowcaseProfile`, `User` |
| Diagnostics | `/admin/diagnostics` | `/api/admin/diagnostics`, `/ping`, `/api/realtime/stream` | runtime diagnostics; no user content created by pings |
| Feedback triage | `/admin/feedback` | `/api/feedback`, `/api/feedback/[id]` | `Feedback` |
| Platform settings and audit | `/admin/settings` | `/api/admin/settings`, `/audit` | `PlatformSetting`, `AuditLog` |
| Support surface | `/admin/support` | support UI and configured communication paths | Operational support data |
| Bootstrap and migration operations | Admin-only APIs under `/api/admin/bootstrap` and `/migrations/**` | bootstrap/cleanup domain functions | affected platform records plus audit evidence |

### 3.2 School onboarding and lifecycle flow

```text
School submits registration
  -> POST /api/register
  -> User created with SCHOOL_ADMIN role and pending status
  -> Super Admin sees approval queue
  -> Super Admin approves or rejects
  -> /api/schools/[id]/status updates User.status
  -> approved school can enter /school/dashboard
  -> school config, grades, profile and users are then managed by the school
```

Important rules:

- School status controls access; an unsubscribed school is redirected to
  `/school/suspended`.
- Password reset and status changes are privileged operations and must be
  auditable.
- `User` is the account and school identity for a School Admin. School-owned
  records normally reference that `User` document as `school`.

### 3.3 Platform event flow

1. Super Admin creates a platform-scoped `Event`.
2. Visibility and registration policy determine whether schools discover the
   event publicly, through invitations, or through a participation request.
3. Invited schools receive `EventSchoolInvitation` records and notifications.
4. Schools approve invitations or request participation.
5. Eligible students or school staff register individual/team participants.
6. The manager creates `EventRound` records and generates
   `RoundParticipant` records.
7. Online rounds collect `RoundSubmission`; offline/live rounds are scored by
   authorized managers.
8. Advancing a round updates participant workflow state.
9. Final results create or update `Achievement` records.
10. Student and school certificates are generated from the event/result data.
11. Public events/results are serialized to the public event hub and winners
    pages when visibility and lifecycle rules allow it.

High-signal policy modules include `lib/eventWorkflow.js`,
`lib/eventParticipation.js`, `lib/competitionFlow.js`, `lib/eventResults.js`,
`lib/eventRoundAccess.js`, `lib/eventCapacity.js`, and `lib/certificates.js`.

### 3.4 Platform notice flow

```text
Super Admin drafts/publishes Notice(scope=PLATFORM)
  -> target audience and visibility are resolved
  -> notification service resolves recipients in bulk
  -> in-app/parent inbox/email/offline channels are attempted
  -> NoticeReceipt records delivery attempts where applicable
  -> realtime events publish to student/school/parent surfaces
  -> recipients fetch updated lists and persist read state
```

Delivery channels return results as data and should not cause the publish action
to fail when an optional channel such as email is unavailable.

### 3.5 Promotions, diagnostics and platform governance

- `SchoolPromotion` controls paid/editorial placements such as home and schools
  spotlights. Public click tracking is handled by
  `/api/public/promotions/[id]/click`.
- Diagnostics report database/realtime health and can issue non-persistent
  channel pings. They are not a replacement for infrastructure monitoring.
- `PlatformSetting` contains platform policy such as approval behavior.
- Setting changes are exposed through audit history; sensitive mutations should
  record actor, previous value, new value, and time.

---

## 4. School layer

The School layer includes School Admin functionality and the narrower Teacher
workspace. Primary School Admin navigation is `SCHOOL_NAV_LINKS`; Teacher
navigation is `TEACHER_NAV_LINKS`.

### 4.1 Feature map

| Feature | User surface | Primary APIs / domain | Main data |
| --- | --- | --- | --- |
| Dashboard overview and analytics | `/school/dashboard` | `/api/school/dashboard/stats`, `/api/school/analytics` | aggregated school, student, event and publishing data |
| Student roster | dashboard Students tab, `/school/register-student` | `/api/students`, registration/bulk/status APIs | `Student`, `ActivityLog` |
| Student credentials | student manager and registration flows | `/api/auth/generate-credentials`, credential email/fix routes | `Student`, email delivery side effect |
| Teacher roster | dashboard Teachers tab, `/school/register-teacher` | `/api/teachers` and registration/bulk APIs | `Teacher` |
| Student transfer | dashboard Transfer tab | `/api/students/transfer/**`, `lib/studentEnrollment.js`, `lib/transferNotifications.js` | `StudentTransfer`, `Student`, enrollment history |
| Academic year and promotion | School Settings | `/api/school/academic-year/**`, `lib/academicYear.js`, `lib/promotionCorrection.js` | `AcademicYear`, `Student.enrollments`, `SchoolConfig` |
| School events | dashboard School Events tab, `/school/events/[id]/manage` | school event and event-management APIs | event/round/participation/result models |
| Platform event participation | dashboard Platform Events tab | invitation, request, participation and capacity APIs | `EventSchoolInvitation`, `ParticipationRequest`, event records |
| Notices to students/parents | Student Notices tab | `/api/notices`, notification service | `Notice`, `NoticeReceipt`, `UserNotification` |
| Received platform notices | Received Notices tab | `/api/school/notifications` and read API | notice and read-state data |
| Publishing desk | dashboard Magazine tab | `/api/school/magazine`, submissions and issue APIs | `SchoolMagazineArticle`, `MagazineIssue` |
| Public school profile | dashboard Public Profile tab | `/api/school/showcase-profile` | `SchoolShowcaseProfile` |
| Guardian access | `/school/guardians`, access-card pages | `/api/school/guardians/**`, guardian domain modules | `Parent`, `ParentStudentLink`, invitation/activation records |
| Parent messaging | `/school/messages` | `/api/school/messages/**`, `lib/parentMessaging.js` | `Conversation`, `Message` |
| Certificates | school event management and certificate pages | `/api/school/certificates`, event certificate APIs | `Achievement`, event/student/school data |
| School settings | `/school/settings` and dashboard Settings tab | school settings/config/grade/education APIs | `User`, `SchoolConfig`, `AuditLog` |
| Feedback and support | dashboard Feedback tab, `/school/support` | `/api/feedback`, FAQ/support data | `Feedback`, `FAQ` |

### 4.2 Student enrollment and credential flow

```text
School enters one student or uploads a bulk file
  -> validation and duplicate checks
  -> Student created with school, grade, roll and platformStudentId
  -> CURRENT enrollment entry records school/year/grade provenance
  -> username/password credentials are generated
  -> optional email is queued without blocking registration
  -> student appears in the school's active roster
  -> student can authenticate into the Student layer
```

The top-level `Student.school`, `grade`, and `rollNumber` describe current
enrollment. `Student.enrollments[]` is the historical record. The student's
MongoDB `_id` and `platformStudentId` must remain stable across transfers.

Bulk operations must report per-row failures instead of silently dropping
students. School scoping must be taken from the authenticated session, never
from an arbitrary client-supplied school ID.

### 4.3 Academic year promotion flow

1. The school configures an AD or BS calendar and one active academic year.
2. The promotion screen loads active students grouped by configured grade.
3. Students selected to advance receive a `PROMOTED` enrollment outcome.
4. Unselected students remain in grade with `RETAINED` history.
5. Students advancing beyond the school's highest configured grade become
   alumni/graduated.
6. The current `AcademicYear` closes with summary counts.
7. The next `AcademicYear` opens.
8. Each affected student's current fields and enrollment history are updated.

Promotion is a reviewed bulk operation. It must not partially commit silently.
The correction API exists for controlled repair of promotion mistakes and must
preserve an audit trail.

### 4.4 Transfer flow

```text
Destination school searches platformStudentId + DOB
  -> limited identity match; DOB prevents open student enumeration
  -> destination creates StudentTransfer(PENDING) with target grade/year
  -> origin school approves or rejects
  -> on approval, origin enrollment closes as TRANSFERRED
  -> same Student record moves to destination school
  -> new enrollment and destination credentials/roll are assigned
  -> origin and destination receive transfer notifications
```

Existing achievements and writings remain attached to the same student. Writing
provenance stays frozen to the school/year in which it was authored; transfer
must not rewrite history or let the new school claim old content.

### 4.5 School event flow

School events use the same event engine as platform events but have school
ownership:

1. School Admin or authorized Teacher creates `Event(eventScope=SCHOOL)`.
2. The event can be private, invited, or public according to its visibility.
3. Eligible students are selected directly or register under the configured
   participation method.
4. Capacity rules prevent over-enrollment.
5. Managers configure rounds, participants, submissions and scoring.
6. Final results create achievements and certificate eligibility.
7. Publicly visible school events/results feed the school's public profile and
   platform public surfaces.

`canManageEventRecord()` in `lib/authz.js` is the ownership gate. A Teacher must
be the creator or an assigned mentor; being a teacher at the school alone is
not enough.

### 4.6 Writing review and magazine publication flow

```text
Student creates draft
  -> submits to school
  -> School Publishing Desk reviews submission
  -> approve: article may enter school/global wall according to visibility
     reject: review state returns to student with the recorded decision
  -> approved article can be selected into a MagazineIssue draft
  -> school publishes issue
  -> issue becomes available to students and eligible public readers
```

The article is the student's work. The school moderates it while the student is
enrolled and owns the published issue as a dated artifact. Authoring-era fields
on `SchoolMagazineArticle` preserve school, grade and academic-year provenance.

### 4.7 Guardian access flow

1. The school identifies the student and guardian relationship.
2. It creates or reuses a `Parent` identity and an active/pending
   `ParentStudentLink` with an explicit access level.
3. The school generates a printable access card containing a Parent ID (and
   supports legacy activation artifacts where required).
4. The guardian signs in through the Parent-specific credential scope.
5. Parent APIs verify the active link on every child-scoped request.
6. The school can reissue access or revoke a link without deleting the child or
   unrelated guardian links.

Guardian linking is a safeguarding boundary. Similar names, phone numbers, or a
client-submitted child ID are not sufficient authorization.

### 4.8 Parent messaging flow

```text
Parent or school opens/creates a child-context conversation
  -> Conversation records school, student, participants, topic and status
  -> Message records sender type, content and optional attachment
  -> conversation summary/lastMessageAt updates
  -> recipient notification and realtime refresh are published
  -> authorized participant fetches the thread
```

Attachments use constrained parent upload handling. Conversation membership and
school ownership must be checked on every read and send action.

---

## 5. Student layer

Primary navigation is defined by `STUDENT_NAV_LINKS`; mobile quick navigation
uses a subset defined by `STUDENT_QUICK_NAV_LINKS`.

### 5.1 Feature map

| Feature | User surface | Primary APIs / domain | Main data |
| --- | --- | --- | --- |
| Activity overview | `/student/dashboard` | `/api/student/activity-summary` | aggregated events, writing, achievements and notifications |
| Event discovery and participation | `/student/events`, `/student/events/[id]` | eligible-events, participation status and event participation APIs | `Event`, `ParticipationRequest`, round/result data |
| Notices and notification center | `/student/notices`, dashboard bell | `/api/student/notifications`, read API | `Notice`, `UserNotification`, read-state fields |
| Transfer request/status | `/student/transfer` | `/api/student/transfer` | `StudentTransfer` |
| Writing workspace | `/student/writing` | `/api/student/writings` and `[id]` | `SchoolMagazineArticle` |
| Lifelong journey | `/student/journey` | `/api/student/history` | `Student.enrollments`, `Achievement`, writing provenance |
| School wall | `/student/school-wall`, article detail | `/api/student/school-wall` | approved school-visible articles |
| Global wall | `/student/global-wall`, detail | `/api/student/global-wall` | approved registered-school-visible articles |
| Magazine library | `/student/magazine`, issue/article readers | student magazine and issue APIs | `MagazineIssue`, `SchoolMagazineArticle` |
| Feedback | `/student/feedback` | `/api/feedback` | `Feedback` |
| Public portfolio | `/students/[id]` | server-side public serialization | public student identity, achievements, journey and writing |

### 5.2 Writing lifecycle

1. The signed-in student is resolved through
   `buildStudentLookupForSession()`; APIs do not accept another student identity.
2. A draft article is created with category, content, visibility, student ID,
   school, and a frozen authoring-era snapshot.
3. The student may edit/delete their own eligible draft.
4. Submission changes review status to `SUBMITTED` for school moderation.
5. School approval/rejection changes review state and publishing eligibility.
6. Approved content may appear on the school wall, global registered-school
   wall, magazine issue, public voices feed, and public portfolio according to
   separate visibility/publication flags.
7. After transfer, the student retains control of their writing. It detaches
   from the origin school's live walls but remains in the student's portfolio
   and in already-published issue history unless explicitly withdrawn under
   the publication rules.

Relevant policy lives in `lib/studentWritings.js`, `lib/writingProvenance.js`,
`lib/studentEnrollment.js`, and `lib/magazineIssues.js`.

### 5.3 Event participation flow

```text
Student opens eligible events
  -> API resolves current student and school
  -> event visibility, dates, grade eligibility and capacity are evaluated
  -> student submits individual/team participation action
  -> ParticipationRequest or direct enrollment is created
  -> school/platform manager approves where policy requires
  -> round participant records are generated
  -> student views round/submission/result state
  -> final placement creates Achievement and certificate access
```

Team and individual events use different participant shapes. The canonical
format resolver is `lib/eventParticipationFormat.js`; UI code should not invent
its own interpretation.

### 5.4 Journey and portfolio flow

`/api/student/history` combines:

- the stable Student identity;
- chronological `enrollments[]` across schools;
- achievements tied to that student;
- writings grouped by authoring school and year.

The private journey is shown at `/student/journey`. The public portfolio at
`/students/[id]` contains only public-safe fields and public achievements/
writings. The current school and historical origin school are intentionally
different concepts.

### 5.5 Student notices

School and platform notices are filtered by scope, audience, grade/student
targeting, active status, visibility, and expiry. Opening or acting on the
notification surface updates persistent read state. Realtime events cause a
silent refresh and a toast only for genuinely new items.

---

## 6. Parent / Guardian layer

The Parent App has its own layout, child switcher, mobile bottom navigation,
language/calendar preferences, and strict child-link authorization.

### 6.1 Feature map

| Feature | User surface | Primary APIs / domain | Main data |
| --- | --- | --- | --- |
| Parent ID access and authentication | `/parent/login`, `/access`, `/activate`, `/register`, `/link` | parent register/link/access domain | `Parent`, `ParentActivation`, `GuardianInvitation`, `ParentStudentLink` |
| Home summary | `/parent` | `/api/parent/home`, `lib/parentHome.js` | child summary, unread/action counts, recent activity |
| Child profile/portfolio | `/parent/child` | `/api/parent/portfolio` | linked child's allowed profile, achievement and writing data |
| Journey timeline | `/parent/journey` | `/api/parent/journey`, `lib/parentJourney.js` | enrollments and achievements |
| Notices and consent | `/parent/notices`, `/parent/notices/[id]` | parent notice/read/respond APIs | `Notice`, `NoticeReceipt` |
| Events and registration | `/parent/events` | parent event list/register APIs | eligible `Event`, participation records |
| Messaging | `/parent/messages`, thread page | parent message APIs | `Conversation`, `Message` |
| Notifications | `/parent/notifications` | `/api/parent/notifications` | `UserNotification` |
| Preferences | `/parent/settings` | `/api/parent/preferences`, push subscription API | `Parent.preferences`, `PushSubscription` |
| Media upload | message/response flows | `/api/parent/uploads`, `lib/parentUploads.js` | constrained uploaded media metadata |

### 6.2 Parent access and child switching

1. The school creates guardian identity/link data and provides a Parent ID card.
2. The guardian signs in with `loginScope=parent`, preventing a staff identity
   with the same email from being selected accidentally.
3. `lib/parentCredentials.js` verifies the Parent ID or supported legacy token.
4. The JWT receives role `PARENT`, status, auth version, language/calendar and
   device-mode information.
5. The Parent App loads active links and selects one child context.
6. Every child-specific API calls the parent access guard again. Switching the
   client UI does not itself grant access.

Personal/shared device mode affects session behavior. Revocation or auth-version
change invalidates access without requiring deletion of historical records.

### 6.3 Parent home aggregation

`/api/parent/home` resolves the selected linked child, then builds a compact
dashboard from recent notices, events, writing/portfolio activity, journey
signals, and unread/action counts. The endpoint is an aggregation surface; it
does not duplicate those source records.

### 6.4 Notice receipt and consent flow

```text
School publishes a parent-targeted Notice
  -> notification service resolves guardians through active links
  -> NoticeReceipt created per notice/parent/student
  -> delivery attempts recorded (in-app, email, offline/paper, future SMS)
  -> parent inbox and push/realtime surfaces notify guardian
  -> opening notice sets opened/read evidence
  -> parent may respond YES/NO when consent is requested
  -> NoticeReceipt stores decision, actor and timestamp
  -> school delivery page aggregates reached/opened/responded state
```

Delivery evidence must stay honest: queued email is not “sent,” paper handover
is not an app open, and no response is not consent.

### 6.5 Parent event registration

The parent event API first verifies the child link, then checks event visibility,
registration mode, eligibility, dates, existing participation and capacity. A
successful action writes the appropriate participation state for the child and
returns the updated status. The Parent cannot register an unlinked child by
changing an ID in the request.

### 6.6 Parent-school messaging

Parent messages are child-context conversations with school staff. APIs resolve
the signed-in parent, active link, conversation membership and school before
returning or creating messages. Voice, image and document attachments pass
through the constrained upload route. New messages update the conversation,
create notification state, and publish a realtime refresh.

### 6.7 Preferences and notifications

- Language preference supports English/Nepali UI behavior where implemented.
- Calendar preference supports AD/BS display without changing canonical stored
  dates.
- Push subscriptions are stored per parent/browser endpoint and used only when
  configured and permitted.
- Shared-device behavior is deliberately more cautious than personal-device
  behavior because guardians may use school or community devices.

---

## 7. Cross-layer end-to-end flows

### 7.1 Event lifecycle across all four layers

```text
Super Admin or School creates Event
  -> School discovers/accepts/requests participation
  -> Student or authorized Parent registers the student
  -> School/Teacher/Super Admin manages rounds and submissions
  -> Result creates Achievement
  -> Student sees result and certificate
  -> Parent sees result in journey/portfolio
  -> public-safe result appears on event/winners/profile pages
```

### 7.2 Writing to public portfolio

```text
Student drafts and submits writing
  -> School reviews
  -> approved article enters permitted school/platform surfaces
  -> School may include it in a MagazineIssue
  -> public serializer exposes only published/public fields
  -> Parent reads linked-child version
  -> transfer preserves student ownership and authoring provenance
```

### 7.3 Notice and action flow

```text
Super Admin or School publishes Notice
  -> recipients resolved by scope/audience/link/grade
  -> Notice + receipts/notifications persisted
  -> realtime/email/push/offline channels attempted
  -> Student/School/Parent inbox refreshes
  -> read, open or consent action persists
  -> sender views aggregate delivery/action status
```

### 7.4 Student lifecycle

```text
School enrolls Student
  -> Student account and CURRENT enrollment
  -> yearly promotion/retention/graduation updates enrollment history
  -> optional transfer moves the same identity to another school
  -> writing and achievements accumulate against stable Student ID
  -> private journey + parent view + public-safe portfolio derive from history
```

---

## 8. Public publishing surface

The public site is not a fifth administration layer. It is a read-only projection
of approved data from the other layers.

| Surface | Source data |
| --- | --- |
| `/` | public feed, spotlight promotions, writing and upcoming events |
| `/schools` | approved/public schools, showcase profiles and promotions |
| `/schools/[id]` | school profile, public events, writing, magazines and results |
| `/events`, `/events/[id]` | visible events, public notices and public results |
| `/winners` | public achievements/results |
| `/student-voices`, `/writings/[id]` | published public student writing |
| `/students/[id]` | public-safe student portfolio and journey |
| `/magazines/**` | published magazine issues and eligible articles |
| `/search` | public school/student discovery fields |
| `/certificates/**`, `/verify` | generated certificate and verification data |

Public API projections live under `/api/public/**` and in server-rendered public
pages. Visibility, status, deletion and lifecycle filters must be applied on the
server. Hiding a field in React is not data protection.

---

## 9. Core data model map

### Accounts and organization

| Model | Purpose |
| --- | --- |
| `User` | Super Admin and School Admin identity; school account/profile status |
| `Teacher` | School-owned teacher identity and employment data |
| `Student` | Lifelong student identity, current enrollment and enrollment history |
| `Parent` | Guardian identity, preferences, access status and auth version |
| `SchoolConfig` | grades, education/calendar and school operational configuration |
| `SchoolShowcaseProfile` | public school marketing/profile content |
| `SchoolPromotion` | home/directory spotlight placement and campaign state |

### Parent access and communication

| Model | Purpose |
| --- | --- |
| `ParentStudentLink` | explicit guardian-child relationship and access level |
| `GuardianInvitation` | guardian invitation lifecycle |
| `ParentActivation` | legacy/reissue activation lifecycle |
| `Conversation` | child/school-context parent-staff thread |
| `Message` | message content, sender and attachments |
| `PushSubscription` | parent browser push endpoint |

### Events, competition and recognition

| Model | Purpose |
| --- | --- |
| `Event` | school/platform event definition and workflow state |
| `EventSchoolInvitation` | invitation of one school to one event |
| `ParticipationRequest` | school/student/team request and enrollment status |
| `EventRound` | competition round definition and state |
| `RoundParticipant` | student/team progression in a round |
| `RoundSubmission` | online round submission |
| `Achievement` | final recognition, placement and certificate source |
| `EventNotice` | event-specific private/public announcement |

### Publishing and communication

| Model | Purpose |
| --- | --- |
| `SchoolMagazineArticle` | student writing, review/publication state and provenance |
| `MagazineIssue` | school-owned draft/published magazine collection |
| `Notice` | school/platform notice and targeting policy |
| `NoticeReceipt` | per-guardian delivery/open/consent evidence |
| `UserNotification` | persisted in-app notification item |
| `UserSurfaceSeenState` | per-user surface seen/read marker |

### Governance and lifecycle

| Model | Purpose |
| --- | --- |
| `AcademicYear` | per-school academic session and promotion summary |
| `StudentTransfer` | destination request and origin decision workflow |
| `Feedback` | school/student feedback and admin triage state |
| `FAQ` | support content |
| `PlatformSetting` | platform policy/configuration |
| `ActivityLog` | operational activity evidence |
| `AuditLog` | before/after governance audit records |

---

## 10. Realtime, notifications and external delivery

### Realtime

`/api/realtime/stream` exposes Server-Sent Events. `lib/realtimeBus.js` uses an
in-memory event emitter locally and Redis Streams over REST when configured.
Important channels include:

- `public-feed`
- `student-notifications`
- `school-notifications`
- parent notification/message channels
- `event-${eventId}-notices`
- `admin-diagnostics`

Realtime is a refresh signal, not the database of record. Clients must refetch
authorized server data after receiving an event.

### Email and push

- Email is dispatched through `lib/emailService.js` and must not block or fail
  the primary transaction.
- Web push is optional and depends on configuration and a stored
  `PushSubscription`.
- Delivery state must distinguish queued, sent, failed and handed-over states.

---

## 11. Security and data-integrity invariants

These rules apply to every feature in all four layers:

1. Page middleware and API authorization are both required.
2. School ownership comes from the authenticated session, not request payload.
3. Parent-child access is checked for every child-scoped operation.
4. Student identity is resolved from the session using the shared helper.
5. Public endpoints return explicit projections and enforce publication state.
6. Passwords, card tokens and activation secrets are stored as hashes where the
   credential design requires it; secrets must never be logged or returned.
7. Login and abuse-sensitive endpoints use the shared rate limiter.
8. User strings used in database regular expressions must be escaped.
9. Every populated Mongoose model must be imported in the server route graph.
10. Transfers preserve stable identity and historical provenance.
11. Academic promotion preserves a reviewable history; it is not a blind grade
    overwrite.
12. Optional email/realtime/push failure must not corrupt the core database
    mutation.
13. Audit-sensitive settings, status, correction and access changes retain actor
    and timestamp evidence.
14. Soft-deleted/inactive records are excluded consistently from active views.
15. Consent is explicit; silence or delivery does not imply agreement.

---

## 12. Known architectural constraints

This feature map should not hide current engineering debt:

- Many API routes still import Mongoose models directly instead of delegating
  through a complete data-access/domain boundary.
- API response conventions are not yet uniform across every route.
- Validation infrastructure exists, but route-boundary validation is not yet
  consistently applied.
- Several large route handlers and client components still combine too many
  responsibilities.
- Realtime is cross-instance only when the Redis REST configuration is present;
  otherwise it is process-local.
- Published magazine issues reference live articles rather than immutable
  article snapshots. Existing guards reduce accidental drift but do not provide
  a fully frozen historical edition.

See `docs/ARCHITECTURE.md` for measured deviation counts and migration guidance.

---

## 13. How to maintain this document

Update this file whenever a change introduces any of the following:

- a page or navigation item;
- an API route or role requirement;
- a new model, status, ownership rule or index affecting behavior;
- a new cross-layer workflow;
- a new notification/delivery channel;
- a change to public visibility or parent-child access;
- a change to academic year, transfer, writing provenance or event lifecycle.

For each feature, keep five facts synchronized:

1. actor and permission;
2. UI entry point;
3. API/domain implementation;
4. records read or written;
5. side effects and downstream consumers.

