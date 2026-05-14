# System Flow Audit

Date: May 10, 2026

## 1. Purpose

This document reviews the current event system as a product workflow, not just as code.

Goal:

- identify where the experience breaks for users
- define what each role should see and when
- clarify system rules
- separate quick fixes from structural redesign work

This audit focuses on:

- event creation
- event publishing
- school invitations
- team registration
- rounds
- results
- certificates
- public result visibility

## 2. Product Model

The product currently contains 3 different jobs that are partially mixed together:

1. event administration
2. school participation
3. public showcase

These must be treated as separate bounded contexts.

### 2.1 Event Administration

Who:

- `SUPER_ADMIN`
- `SCHOOL_ADMIN` for school-owned events
- `TEACHER` when assigned within school-owned events

Purpose:

- create event
- configure event
- review participation
- run rounds
- finalize results
- issue certificates
- publish public outcomes

### 2.2 School Participation

Who:

- `SCHOOL_ADMIN`

Purpose:

- approve or reject invited platform events
- register a team
- update team before deadline
- monitor rounds for their students
- view team result
- access certificates

### 2.3 Public Showcase

Who:

- public visitors
- schools
- students
- parents

Purpose:

- discover public events
- view published event results
- view public achievements
- open certificate links

## 3. Main System Problem

The codebase has strong functionality, but the system currently mixes the 3 jobs above in a way that makes the user experience feel inconsistent.

The most important product issue is:

the same event means different things in different screens, and the system does not clearly tell the user which mode they are in.

Examples:

- school admin as event owner
- school admin as invited participant
- public visitor viewing final result
- admin viewing event results draft

The code supports these separately, but the UI language and navigation do not separate them strongly enough.

## 4. Current State Findings

### 4.1 Roles and responsibilities are not cleanly separated in UI

Observed pattern:

- owner surfaces and participant surfaces use similar language like `Manage`, `Manage Team`, `Manage Registration`, `View Page`, `See Overall Result`
- users cannot always tell whether they are managing the event itself or only their school's participation

Impact:

- users click the wrong thing
- back navigation feels wrong
- expectations do not match the next screen

### 4.2 Results are fragmented across multiple surfaces

Observed pattern:

- results may exist internally
- certificates may exist for schools
- public result page may exist
- school completed-event screen may show certificates first
- public result may be available only through link/button

Impact:

- users think "result is missing" even when data exists
- they are redirected to another page instead of seeing a result summary in context

### 4.3 Event state is implicit, not explicit enough

Observed pattern:

- event lifecycle is partly derived from `status`, `lifecycleStatus`, `resultsPublished`, invitation status, registration deadline, and school participation state
- different screens interpret these combinations differently

Impact:

- inconsistent CTAs
- inconsistent badges
- confusion over what is actually possible now

### 4.4 There are multiple operational truths

Observed pattern:

- participation is represented in `ParticipationRequest`
- related participant lists also exist on `event.participants`
- some screens trust request data more, some trust event projection more

Impact:

- drift risk
- count mismatch risk
- difficult debugging

### 4.5 Navigation follows code structure more than user intention

Observed pattern:

- school workspace is split into `Invitations`, `Platform Events`, `Completed Events`, `My School Events`

Impact:

- technically correct
- mentally heavy
- users think in jobs, not storage categories

## 5. Canonical Lifecycle Design

The system needs one canonical event state machine and one school participation state machine.

## 5.1 Event State Machine

Recommended states:

1. `DRAFT`
2. `PENDING_APPROVAL`
3. `APPROVED`
4. `INVITED_TO_SCHOOLS`
5. `REGISTRATION_OPEN`
6. `REGISTRATION_CLOSED`
7. `ROUNDS_ACTIVE`
8. `RESULTS_DRAFTED`
9. `RESULTS_PUBLISHED_TO_SCHOOLS`
10. `RESULTS_PUBLISHED_PUBLICLY`
11. `COMPLETED`
12. `ARCHIVED`

Rules:

- every event must expose one primary stage label
- every role sees the same stage label
- each role gets different next actions from that same stage

## 5.2 School Participation State Machine

Recommended states:

1. `NOT_AVAILABLE`
2. `WAITING_FOR_SCHOOL_DECISION`
3. `APPROVED_FOR_SCHOOL`
4. `TEAM_NOT_REGISTERED`
5. `TEAM_REGISTERED`
6. `TEAM_LOCKED`
7. `ROUND_ACTIVITY_AVAILABLE`
8. `RESULT_AVAILABLE`
9. `CERTIFICATE_AVAILABLE`

Rules:

- this state is separate from event-owner state
- school-facing screens should center this state, not admin state

## 6. Role-Based Expected Flow

## 6.1 Super Admin Flow

### Step 1: Create or approve a platform event

Should see:

- event title
- visibility
- registration mode
- invitation scope
- partner setup
- publish readiness

Should not see:

- school participation controls as the main focus

Primary CTA:

- `Approve and Invite Schools`

### Step 2: Monitor school adoption

Should see:

- invited schools count
- approved schools count
- schools with registered teams
- schools with zero action

Primary CTA:

- `Review Participation`

### Step 3: Run competition

Should see:

- approved participants
- round progress
- unresolved statuses

Primary CTA:

- `Open Rounds`

### Step 4: Publish results

Should see:

- final placement list
- certificate readiness
- public publish flag
- school publish status

Primary CTA sequence:

1. `Save Result Snapshot`
2. `Publish to Schools`
3. `Publish Publicly`

## 6.2 School Admin Flow for Invited Platform Event

### Step 1: Receive event invitation

Should see:

- why this event matters
- deadline
- grades eligible
- school decision state

Primary actions:

- `Approve for School`
- `Disapprove`

After approval:

- system should clearly transition into school participation mode

### Step 2: Register team

Should see:

- event summary
- eligibility
- selected student count
- current team
- remaining capacity if relevant

Primary actions:

- `Register Team`
- `Update Team`

Important UX rule:

- the list of students must always show selected state clearly

### Step 3: Track active competition

Should see:

- round notices relevant to this school
- submission status if needed
- school team members
- next required action

Should not see:

- event-owner controls for approving all schools or editing event structure

### Step 4: View final outcome

Should see inside school dashboard, without depending only on public page:

- result summary for this school
- which students won / participated
- public result status
- certificate links

Primary actions:

- `View Team Result`
- `Open Public Result`
- `Open Certificates`

## 6.3 School Admin Flow for School-Owned Event

### Step 1: Create school event

Should see:

- event setup form
- mentor assignment
- visibility settings
- participation rules

### Step 2: Manage participants

Should see:

- participant queue
- approved list
- rejected list
- capacity state

### Step 3: Run rounds

Should see:

- round status
- advancing students
- notices

### Step 4: Publish results

Should see:

- full event result controls
- public publish controls
- certificates

This is a true administration flow and must remain distinct from invited-school participation.

## 6.4 Student Flow

### Step 1: Discover event

Should see:

- available events
- whether school approval is required
- whether student can request or only track

### Step 2: Join/request participation

Should see:

- request status
- approval status
- event timeline

### Step 3: Track progress

Should see:

- round notifications
- submission requirements
- approval state

### Step 4: View result

Should see:

- own participation outcome
- certificate if issued
- public event result if published

## 7. Screen-by-Screen Design Rules

## 7.1 Invitations Screen

Purpose:

- decision-making only

Should show:

- event title
- partner or organizer
- deadline
- event stage
- school decision
- team registration summary if already registered

Should not overload with:

- result viewing
- certificates
- full competition history

## 7.2 Active Platform Events Screen for School

Purpose:

- action workspace for currently active school participation

Should show:

- approved events for the school
- registered team size
- next action
- manage team button
- round visibility when registration is closed or rounds are active

## 7.3 Completed Events Screen for School

Purpose:

- final outcome workspace

Current product gap:

- certificates are shown, but result summary is not strong enough

Should show in order:

1. event result status
2. school team result summary
3. top placements and student outcomes
4. certificates
5. public result link

Rule:

- result summary must appear inside this screen, not only by redirecting to the public event page

## 7.4 Public Event Page

Purpose:

- showcase published public event information

Should show:

- event identity
- organizer
- participating schools if allowed
- published results
- certificate links if public

Should not be the only place schools can understand final outcome

## 7.5 Event Administration Dashboard

Purpose:

- internal control center

Tabs should map clearly to:

- overview
- participant management
- rounds
- results

But labels should reflect true job meaning.

Suggested labels:

- `Overview`
- `Registrations`
- `Competition Rounds`
- `Publish Results`

## 8. What Should Be Shown and When

This section defines high-confidence rules.

### Rule 1: Do not show public result links until result is truly public

Conditions:

- event visibility allows it
- results published
- public publication enabled

### Rule 2: Show internal school result summary before public result link

Reason:

- school users care first about their own team

### Rule 3: Do not show event-owner controls to school participants

Reason:

- wrong responsibility
- creates confusion and permission issues

### Rule 4: When registration is open, emphasize team state

Show:

- selected students
- remaining capacity
- deadline
- contact details

### Rule 5: When registration closes, stop emphasizing registration and shift to rounds

Show:

- team locked state
- round info
- notices
- submissions

### Rule 6: When results are published, stop emphasizing rounds and shift to outcomes

Show:

- placement
- result tables
- certificate availability
- public visibility

### Rule 7: Every event card should have one dominant CTA only

Bad pattern:

- too many equal buttons

Better:

- one main action
- one secondary action
- one context link if needed

## 9. Problem Inventory and Probable Fixes

## 9.1 Problem: School result not appearing in completed event screen

Observed issue:

- user expects result on school side
- system mainly offers certificates and optional public result link

Probable cause:

- school completed view is certificate-first, not result-first

Probable solution:

- add embedded result summary panel in completed platform event expansion
- include:
  - result publication status
  - school student placements
  - overall school participation summary

Priority:

- critical

## 9.2 Problem: Wrong route or wrong context after clicking manage-related actions

Observed issue:

- users may land on a management screen that does not match their mental model

Probable cause:

- route structure follows data ownership rather than user intent

Probable solution:

- pass origin context
- separate owner management from school participation management
- rename buttons more precisely

Priority:

- high

## 9.3 Problem: Public result availability is hard to understand

Observed issue:

- operators do not clearly know whether results are only internal, school-visible, or public

Probable cause:

- multiple flags without one unified explanation surface

Probable solution:

- add publication status summary card
- show exact blockers:
  - results not published
  - public visibility disabled
  - event not public

Priority:

- high

## 9.4 Problem: Multiple counts can drift

Observed issue:

- event counts and request counts may diverge over time

Probable cause:

- `ParticipationRequest` and `event.participants` both act like active truth

Probable solution:

- use `ParticipationRequest` as source of truth
- turn `event.participants` into projection only or retire it

Priority:

- high

## 9.5 Problem: Terminology inconsistency

Examples:

- approved
- registered
- participating
- managed
- completed

Probable solution:

- define platform vocabulary guide
- use same words everywhere for same states

Priority:

- medium

## 9.6 Problem: Event hub cards carry too many responsibilities

Observed issue:

- list card acts like summary, control center, participation shell, and result launcher

Probable solution:

- keep list card summary-focused
- expansion should be mode-specific:
  - active registration mode
  - rounds tracking mode
  - results mode

Priority:

- medium

## 10. Recommended Information Architecture

## 10.1 School Dashboard

Recommended sections:

1. `Needs Action`
2. `My Active Teams`
3. `Rounds & Notices`
4. `Results & Certificates`
5. `Hosted School Events`

This is better than current technical grouping because it mirrors daily work.

## 10.2 Event Card CTA Rules

### Invitation state

Primary:

- `Approve Event`

Secondary:

- `View Details`

### Approved but no team

Primary:

- `Register Team`

Secondary:

- `View Event`

### Team registered, registration open

Primary:

- `Manage Team`

Secondary:

- `View Event`

### Registration closed, rounds active

Primary:

- `Track Rounds`

Secondary:

- `View Team`

### Results available

Primary:

- `View Team Result`

Secondary:

- `Open Certificates`

Context link:

- `Open Public Result`

## 11. Engineering Recommendations

## 11.1 Define response contracts per bounded context

Recommended DTOs:

- `EventAdminDetailDTO`
- `SchoolParticipationEventDTO`
- `SchoolCompletedEventDTO`
- `PublicEventDTO`

Each should have explicit fields instead of UI-side inference.

## 11.2 Create one event-state resolver on server side

Purpose:

- avoid every component recomputing stage slightly differently

## 11.3 Create one participation-state resolver on server side

Purpose:

- school surfaces should not derive state ad hoc

## 11.4 Remove UI-side patching of event objects where possible

Current risk:

- frontend is normalizing backend shape repeatedly

Recommended:

- backend returns final view model for each surface

## 11.5 Introduce flow-based QA

Current risk:

- endpoint-level success may hide journey-level failure

Recommended manual QA suites:

1. platform event from creation to public result
2. school invitation to team registration
3. school completed event to result and certificate access
4. student request to certificate access

## 12. Prioritized Backlog

## Phase 1: Critical UX Consistency

1. Add embedded school result summary to completed event view
2. Rename ambiguous buttons and labels
3. Fix back navigation by preserving entry context
4. Add publication status card for results visibility

## Phase 2: Workflow Clarity

1. Reorganize school dashboard sections by job-to-be-done
2. Separate active team management from completed result viewing
3. Standardize CTA hierarchy per event state

## Phase 3: Architecture Hardening

1. Introduce canonical DTOs per surface
2. Consolidate event and participation state resolvers
3. Reduce dual-truth dependence on `event.participants`

## Phase 4: Trust and Publish Safety

1. Add explicit publish checklist
2. Add role-visible audit state for result publication
3. Add school-facing explanation when public result is unavailable

## 13. Quick Wins

These can be done with low structural risk:

1. Add `Result Summary` block to school completed-event expansion
2. Change `See Overall Result` to `Open Public Result Page`
3. Add `Your School Result` heading above school certificates
4. Show `Public result not yet available` reason when blocked
5. Rename `Platform Events` to `Active Competitions`
6. Rename `Completed Events` to `Final Results`

## 14. High-Risk Refactors

These should be done carefully:

1. replacing participation truth sources
2. unifying all event list APIs
3. redesigning route ownership
4. changing lifecycle semantics globally

## 15. Recommended Immediate Implementation Sequence

Best next order:

1. improve school completed-event result visibility
2. fix naming and CTA clarity
3. preserve route context
4. create school-facing completed result DTO
5. unify publish-state messaging
6. then start deeper architecture cleanup

## 16. Final Assessment

The system has a solid foundation and strong feature coverage.

The main weakness is not lack of features.

The main weakness is workflow coherence:

- the right data exists
- but it is not always shown in the right surface
- at the right time
- in the right language
- for the right role

That is why the product can feel “almost working” while still creating repeated confusion.

The next stage of maturity should focus on:

- role clarity
- state clarity
- result visibility clarity
- route and surface separation

Once those are aligned, the platform will feel much more professional even before major new features are added.
