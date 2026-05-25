# Work Indicators

Work indicators are the small badges that tell a user where something needs attention. They are role-scoped, database-backed, and refreshed by polling plus the `work-indicators` realtime channel.

## Badge Language

- `action` tone means pending work, for example approvals, invitations, submissions, support tickets, or review queues.
- `new` tone means unseen updates, for example received notices, published magazine articles, event updates, or new showcase content.
- Compact badges show only the count, but include accessible labels and browser tooltips such as `3 pending` or `2 new`.

## Super Admin Surfaces

- `admin.approvals`: pending school accounts.
- `admin.events`: pending platform event proposals and pending events.
- `admin.challenges`: submitted platform challenge responses needing review.
- `admin.support`: open support tickets.
- `admin.spotlight`: school spotlight requests or campaigns needing platform attention.

These usually clear when the admin completes the action, not simply by opening the page.

## School Surfaces

- `school.receivedNotices`: unread platform or event notices sent to the school. Clears through mark-read actions.
- `school.magazine`: student writing submitted to the school magazine. Clears when articles are approved, rejected, or otherwise removed from the submitted queue.
- `school.pratyoPulse`: platform-selected student challenge responses that are new to the school since the surface was last opened.
- `school.platformEvents`: pending platform event invitations.
- `school.schoolEvents`: pending participation requests for school-run events.
- `school.support`: open school support tickets.

## Student Surfaces

- `student.notices`: unread school notices and platform notices for the student. Clears through mark-read actions.
- `student.writing`: draft or rejected writing that needs student action.
- `student.events`: event updates published since the student last opened the events workspace.
- `student.magazine`: newly published magazine articles since the student last opened the magazine.
- `student.pratyoPulse`: selected public challenge responses since the student last opened Pratyo Pulse.

## Implementation Map

- Count rules live in `lib/workIndicators.js`.
- The current user's API is `GET /api/me/work-indicators`.
- Seen-state updates use `POST /api/me/work-indicators/seen`.
- Seen timestamps are stored in `UserSurfaceSeenState`.
- Client refresh logic lives in `lib/useWorkIndicators.js`.
- Badge rendering lives in `components/work-indicators/WorkIndicatorBadge.js`.
- Badge text helpers live in `lib/workIndicatorLabels.js`.
- Realtime refresh is published through `lib/workIndicatorRealtime.js`.

When adding a new workflow, choose whether the badge is an action queue or an unseen update first. Action queues should clear only when the work is resolved. Unseen updates can clear when the relevant page or panel is opened.
