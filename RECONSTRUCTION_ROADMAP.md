# Reconstruction Roadmap

Date: April 21, 2026

This roadmap turns the project into a multi-school talent, extracurricular,
competition, and public school showcase platform in controlled phases.

## Phase 1: Product Surface

Status: completed

- Reframed dashboard/navigation wording away from ERP and academics
- Shifted homepage messaging toward talent and extracurriculars
- Removed attendance/exam/grading from the main visible product surface

## Phase 2: Domain Foundation

Status: completed and refined

Added core models for the new product direction:

- `TalentProfile`
- `Club`
- `TalentSubmission`
- `Achievement`
- `SchoolShowcaseProfile`

Extended `Event` to support:

- `eventScope` (`SCHOOL` or `PLATFORM`)
- `ownerType`
- `ownerId`
- `eventType`
- `visibility`
- `registrationMode`
- public showcase flags
- mentor assignment
- lifecycle-driven history and results

## Phase 3: Public Platform Layer

Status: completed in core form

- Build public school showcase pages
- Build public event pages
- Add landing-page featured schools/events
- Publish activity metrics and school highlights

## Phase 4: Talent Workflows

Status: completed in core form

- Student talent profiles
- Club management
- Submission workflow
- Achievement publishing
- Simple results publication flow

Notes:

- rigid category management has been removed to keep talent open-ended
- scorecard-based judging has been removed in favor of manual school/platform results

## Phase 5: Event Ownership Cleanup

Status: mostly completed

- Split school-owned and platform-owned event flows in UI
- Add better validation for `PLATFORM_EVENT` vs `SCHOOL_EVENT`
- Add event result publication and public highlight publishing
- Add school-side event control for active/completed/archived history
- Add school-side mentor assignment for events

## Phase 6: Cleanup and Removal

Status: in progress

- Remove attendance modules
- Remove exam/marks/grading modules
- Remove report-card and academic LMS leftovers
- Remove dead APIs and unused models

## Deferred: External Organizer Intake

Park this for a later milestone after the core school flows are stable.

Goal:

- Support non-school organizers such as academies, companies, NGOs, communities, or other event hosts
- Let them propose public or inter-school events without forcing full signup on first contact

Recommended approach:

- Start with a guest event request flow instead of mandatory organizer signup
- Collect organizer identity, contact details, event summary, category, audience, timing, and supporting links
- Send every external organizer request to `SUPER_ADMIN` first
- Only show approved external events to schools or on public pages
- After approval, create organizer records and optionally let the organizer claim an account/dashboard
- Treat repeat organizers as candidates for a fuller organizer profile and portfolio flow

Suggested future entities:

- `Organizer`
- `OrganizerProfile`
- `OrganizerEventRequest` or `OrganizerLead`

Suggested lifecycle:

- guest request submitted
- super admin review
- approved / rejected / needs info
- organizer record created if approved
- event published to schools/public if approved
- organizer invited to claim account for future management

Important product rule:

- first contact should be low-friction
- trust and publication should stay admin-controlled
- public inter-school visibility should happen only after review

## Guiding Rule

Only keep features that help answer:

"How active, creative, competitive, and vibrant is this school beyond academics?"

If a feature does not support that question, it should not remain in the long-term product.
