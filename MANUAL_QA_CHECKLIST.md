# Manual QA Checklist

This checklist is for pilot-readiness testing of the reconstructed talent platform.

Important:
- Run this against a real staging database with seeded demo data.
- Test each role with a fresh account where possible.
- Mark each step as `Pass`, `Fail`, or `Blocked`.

## Pre-QA Setup

- Run `npm run lint`.
  - Expected: exits with `0` errors and `0` warnings.
- Run `npm run build`.
  - Expected: production build completes successfully.
- Create or seed:
  - `1` super admin
  - `2-3` approved schools
  - `2-3` mentors per school
  - `5-10` students per school
  - `2-3` talent categories
  - `2-3` clubs
  - `2-3` events
  - `2-3` student submissions
- Confirm `.env.local` is using the intended database.
- Keep browser DevTools console open during each role flow.
  - Expected: no repeated client errors, hydration errors, or failed required API calls.

## Public Platform

- Visit `/`
  - Expected: homepage loads, featured schools appear only for public showcase profiles, recent results section appears only when public achievements exist.
- Visit `/schools`
  - Expected: public school cards render without login.
- Visit `/schools/[id]`
  - Expected: school story, public highlights, achievements, and event links render correctly.
- Visit `/events`
  - Expected: public event list loads, private/invited events are hidden, and results badges show only for events with published results.
- Visit `/events/[id]`
  - Expected: published results render only when `resultsPublished` is true and achievements are public.
- Try opening a private event URL directly.
  - Expected: public event not found.
- Try opening a school without a public showcase profile.
  - Expected: school is not listed in `/schools`; direct page does not expose showcase-only content.

## Super Admin Flow

- Log in as `SUPER_ADMIN`
  - Expected: lands on `/admin/dashboard`.
- Review pending school approvals
  - Expected: approve and reject actions work.
- Create a platform event
  - Expected: event appears in platform events list.
- Edit a platform event
  - Expected: categories, visibility, results flags, and dates persist.
- Open the `Judging` tab
  - Expected: platform events appear in judging workspace.
- Configure judging criteria and assign mentor judges
  - Expected: settings save and reload correctly.
- Publish results
  - Expected: achievements are created and event shows `resultsPublished`.

## School Admin Flow

- Log in as `SCHOOL_ADMIN`
  - Expected: lands on `/school/dashboard`.
- Open `Categories`
  - Expected: create, edit, archive school categories.
- Open `Clubs`
  - Expected: create a club with mentors, members, and public visibility.
- Open `Public Showcase`
  - Expected: update tagline, summary, highlights, featured categories, featured events.
- Open `Submission Review`
  - Expected: shortlist, reject, publish, and finalize submissions.
- Open `Judging`
  - Expected: school-owned events appear and scoring works.
- Reset a mentor password
  - Expected: credentials modal opens with new password.
- Bulk import mentors
  - Expected: mentors are created and credentials modal shows imported accounts.

## Mentor Flow

- Log in as `TEACHER`
  - Expected: lands on `/teacher/dashboard`.
- Open `Mentor Review Queue`
  - Expected: school submissions load.
- Update review notes and shortlist a submission
  - Expected: status changes persist.
- Open `Assigned Judging`
  - Expected: only assigned events appear.
- Save a scorecard
  - Expected: score persists after reload and leaderboard updates.

## Student Flow

- Log in at `/student/login` using username or email
  - Expected: lands on `/student/dashboard`.
- Open student workspace
  - Expected: talent profile section loads.
- Create or update talent profile
  - Expected: profile persists after reload.
- Submit to an event
  - Expected: submission appears in student list and school review queue.
- Open `/student/events`
  - Expected: available events load and public event links work.
- Enable parent mode
  - Expected: parent view loads without crashing.

## Result Publishing Flow

- Create a three-round event flow: online audition, offline semi-final, offline final.
  - Expected: rounds save independently with their own mode, schedule, link/venue, and notice board.
- Generate Round 1 participants from approved registrations.
  - Expected: registered students appear in Round 1 only.
- As school admin, submit online audition links for Round 1.
  - Expected: links save, appear in admin round review, and student round status becomes `SUBMITTED`.
- Mark Round 1 students as `SELECTED`, `NOT_SELECTED`, `ABSENT`, or `INVALID_SUBMISSION`.
  - Expected: statuses persist and can be filtered/bulk updated.
- Create Round 2, then move selected students forward.
  - Expected: only `SELECTED`/`FINALIST` students move to Round 2 and a shortlist notice is created.
- Repeat for final round.
  - Expected: final round contains only selected/finalist students from the previous round.
- Publish results from final-round participants.
  - Expected: achievements/certificates are created only for final-round eligible students.
- Publish results again after editing placements.
  - Expected: correction reason is required; audit record is created; event has one clean replacement set of achievements, not duplicate awards.
- Recheck public event page
  - Expected: winners appear in published results section.
- Recheck homepage
  - Expected: recent results section includes new achievements.
- Recheck school public page
  - Expected: school achievements section reflects published results.
- Open school `Certificates` tab.
  - Expected: issued certificates appear as school-owned digital certificates with shareable links for students/parents.

## Event Governance and Publishing Rules

- As `TEACHER`, create an event with `visibility=PUBLIC`
  - Expected: event is saved as non-public (`INVITED`) while pending approval.
- As `SCHOOL_ADMIN`, attempt to set a pending event to public
  - Expected: API rejects update with validation message.
- As `SUPER_ADMIN`, attempt to create `SCHOOL` scoped event without school id
  - Expected: API rejects request (`400`) with school-required message.
- As `SUPER_ADMIN`, set `featuredOnLanding=true` for non-public or non-platform event
  - Expected: API rejects update with governance validation message.
- Try publishing results for a non-approved event
  - Expected: API rejects request and results remain unpublished.

## Regression Checks

- Visit `/login`
  - Expected: school/admin login still works.
- Visit `/register`
  - Expected: school registration still works.
- Verify sidebar navigation for each role
  - Expected: role sees only appropriate links.
- Verify logout
  - Expected: redirects cleanly to login page.

## Security Checks

- Try accessing `/admin/dashboard` as school admin
  - Expected: redirected away.
- Try accessing `/school/dashboard` as student
  - Expected: redirected away.
- Try calling school-only APIs as wrong role
  - Expected: `401` or `403`.
- Try judging an event as an unassigned mentor
  - Expected: access denied.
- Inspect public event and school pages while logged out.
  - Expected: no private contact details, unpublished student submissions, private partner profiles, or internal IDs are shown as user-facing content.
- Try direct API calls to school-only endpoints as a student.
  - Expected: `401` or `403`, never another school's data.

## Visual and UX Checks

- Test `/`, `/schools`, `/events`, `/login`, `/register`, and all dashboards at mobile width.
  - Expected: no overlapping text, clipped buttons, or unusable horizontal scroll.
- Check empty states with a fresh school that has no events or submissions.
  - Expected: pages explain the empty state and do not crash.
- Check loading states on slower network throttling.
  - Expected: screens show stable loading UI and recover after data loads.
- Verify forms show actionable errors when required fields are missing.
  - Expected: errors are visible near the relevant workflow and do not rely only on console logs.

## Known Follow-Up Risks

- `visiblePassword` is still present in mentor/student credential workflows and should be removed in a deeper security pass.
- Email notification flows are still placeholders and should be connected to a real provider before production support workflows.
