# Manual QA Checklist

This checklist is for pilot-readiness testing of the reconstructed talent platform.

Important:
- Run this against a real staging database with seeded demo data.
- Test each role with a fresh account where possible.
- Mark each step as `Pass`, `Fail`, or `Blocked`.

## Pre-QA Setup

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
- Confirm `npm run build` passes before manual testing.

## Public Platform

- Visit `/`
  - Expected: homepage loads, featured schools appear, recent results section appears when achievements exist.
- Visit `/schools`
  - Expected: public school cards render without login.
- Visit `/schools/[id]`
  - Expected: school story, clubs, achievements, and event links render correctly.
- Visit `/events`
  - Expected: public event list loads and results badges show for completed events.
- Visit `/events/[id]`
  - Expected: published submissions and published results render correctly.

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

- Score at least `3` submissions in one event
  - Expected: leaderboard shows ranked order.
- Publish results from judging workspace
  - Expected: achievements created, winning submissions become public.
- Recheck public event page
  - Expected: winners appear in published results section.
- Recheck homepage
  - Expected: recent results section includes new achievements.
- Recheck school public page
  - Expected: school achievements section reflects published results.

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

## Known Follow-Up Risks

- `visiblePassword` is still present in mentor/student credential workflows and should be removed in a deeper security pass.
- Several hook dependency warnings still exist in lint output and should be cleaned when doing UI polish.
