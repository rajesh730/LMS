# Realtime And Notices

This document explains how the current realtime and notice-delivery system works in Pratyo, how to configure it, and how to QA it safely.

## Scope

This guide covers:

- student and school notification delivery
- persisted read and unread state
- public event notice realtime updates
- admin diagnostics for the realtime stack
- Redis-backed scaling path for multi-instance deployment

This guide does not cover:

- general event CRUD
- certificate generation
- magazine review workflows

## Main Building Blocks

### Core data models

- `models/Notice.js`
  Stores platform notices and school notices.
- `models/EventNotice.js`
  Stores event-specific public notices.

### Shared server utilities

- `lib/realtimeBus.js`
  Central publish and subscribe layer.
  Uses in-memory `EventEmitter` locally.
  Uses Redis Streams over REST when Redis env vars are set.
- `lib/noticeRealtime.js`
  Publishes notice-related realtime events to the right channels.
- `lib/publicFeed.js`
  Builds public feed payloads for public events and results.
- `lib/studentNotifications.js`
  Builds student notification payloads with `isRead` and `unreadCount`.
- `lib/schoolNotifications.js`
  Builds school notification payloads with `isRead` and `unreadCount`.

### Shared client utilities

- `lib/useRealtimeChannel.js`
  Small generic SSE subscription hook.
- `lib/useNotificationInbox.js`
  Shared hook for:
  - loading notification lists
  - unread count handling
  - mark read and unread mutations
  - silent realtime refresh
  - optional toast on newly arrived items

### Diagnostics

- `app/admin/diagnostics/page.js`
  Super-admin-only diagnostics page.
- `app/api/admin/diagnostics/route.js`
  Summary API for current diagnostics state.
- `app/api/admin/diagnostics/ping/route.js`
  Safe realtime ping API for diagnostics testing.

## Realtime Channels

Current channels in use:

- `public-feed`
  Used for public feed refresh events.
- `student-notifications`
  Used for student bell and student notice board refresh.
- `school-notifications`
  Used for school bell and school notice board refresh.
- `event-${eventId}-notices`
  Used for public event detail notice refresh.
- `admin-diagnostics`
  Used only for diagnostics ping and stream health testing.

## Environment Variables

Required baseline vars:

- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL`

Optional realtime scaling vars:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Fallback aliases supported in code:

- `REALTIME_REDIS_REST_URL`
- `REALTIME_REDIS_REST_TOKEN`

If Redis vars are missing:

- realtime still works on a single server process
- local development is fine
- multi-instance deployment will not share events between instances

If Redis vars are present:

- publish events are written to a Redis Stream
- subscribers poll Redis and replay events across instances
- local in-memory delivery still occurs on the instance that originated the event

## Flow Summary

### 1. Public feed refresh

When public feed content changes:

1. The server publishes a `public-feed` realtime event.
2. Open public feed clients refresh their visible event and result cards.

Key files:

- `components/public/PublicFeedList.js`

### 2. Student and school notices

When a notice is published or updated:

1. Notice APIs save the notice to MongoDB.
2. Relevant realtime events are published through `lib/noticeRealtime.js` or directly through `lib/realtimeBus.js`.
3. Student and school clients listening on their channels refresh silently.
4. If the change introduced a genuinely new item, a toast is shown.

Key files:

- `app/api/notices/route.js`
- `app/api/notices/[id]/route.js`
- `app/api/events/[id]/notices/route.js`
- `app/api/events/[id]/notices/[noticeId]/route.js`
- `components/student/StudentNotificationCenter.js`
- `components/school/SchoolNotificationCenter.js`
- `components/student/StudentNoticeBoard.js`
- `components/school/SchoolNoticeBoard.js`

### 3. Read and unread state

Read state is persisted in MongoDB using each notice document's `readBy` array.

For student flows:

- `userType: "STUDENT"`

For school admin flows:

- `userType: "SCHOOL_ADMIN"`

Read and unread mutations use:

- `POST /api/student/notifications/read`
- `POST /api/school/notifications/read`

Supported actions:

- mark item read
- mark item unread
- mark all visible read
- mark all visible unread

### 4. Public event notice updates

When an event notice changes:

1. The event notice API publishes to:
   - `student-notifications`
   - `school-notifications`
   - `event-${eventId}-notices`
2. The public event page notice list refreshes silently.
3. If the update introduced a newly visible notice, a toast is shown.

Key files:

- `components/events/PublicEventNoticeList.js`
- `app/events/[id]/page.js`

## Current UI Surfaces

### Notification dropdowns

- student dashboard notification bell
- school dashboard notification bell

Behavior:

- server-backed unread count
- mark visible items read on open
- mark all read and unread controls
- realtime toast for genuinely new arrivals

### Full notice boards

- student notices page
- school received notices tab

Behavior:

- realtime refresh
- mark visible items read when loaded
- mark all read and unread controls

### Public event page

- public event notice block

Behavior:

- realtime notice refresh
- toast on newly published event notice

### Diagnostics page

- `/admin/diagnostics`

Behavior:

- realtime provider visibility
- database and stream sanity checks
- safe admin-only ping channel
- channel-specific diagnostic pings for public feed, student notifications, school notifications, and event notices
- public reaction and notice counters

## QA Checklist

Run these checks before shipping realtime or notice changes.

### A. Basic health

1. Login as super admin.
2. Open `/admin/diagnostics`.
3. Confirm diagnostics loads.
4. Confirm realtime provider shows expected mode:
   - `in-memory` locally
   - `redis-rest-stream` in multi-instance staging or production
5. Click `Send Realtime Ping`.
6. Confirm the diagnostics page reports a received ping.
7. Use the channel ping buttons to confirm `public-feed`, `student-notifications`, and `school-notifications` can publish and return diagnostic payloads.
8. Enter an event id and click `Ping Event` to verify `event-${eventId}-notices`.

### B. Student notice flow

1. Login as a student in one browser.
2. Open student dashboard and student notices page.
3. From a school admin account, publish a student-targeted notice.
4. Confirm:
   - student bell updates
   - student toast appears
   - student notices page updates without refresh
5. Confirm opening the bell or board reduces unread count as expected.

### C. School notice flow

1. Login as school admin.
2. Open the school dashboard and received notices tab.
3. From super admin, publish a platform notice.
4. Confirm:
   - school bell updates
   - school toast appears
   - school notice board updates without refresh

### D. Event notice flow

1. Open a public event page in one browser.
2. From an event-managing account, publish a public event notice.
3. Confirm:
   - event notice appears without page refresh
   - event toast appears
4. Archive the notice and confirm it disappears on refresh event flow.

### E. Public feed flow

1. Open the public home page in two browsers.
2. Send a diagnostics ping for `public-feed`.
3. Confirm browser B receives the feed refresh signal shortly after.

### F. Read and unread controls

1. Open student or school notifications with several items.
2. Click `Mark all unread`.
3. Confirm items show `New` and unread count increases.
4. Click `Mark all read`.
5. Confirm items clear `New` and unread count drops.

### G. Multi-instance realtime validation

Use this check in staging before running more than one app instance in production.

1. Configure both app instances with the same:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
2. Open `/admin/diagnostics` on instance A.
3. Confirm realtime provider shows `redis-rest-stream`.
4. Send a diagnostics ping from instance B or from a browser routed to instance B.
5. Confirm instance A receives the ping without refresh.
6. Refresh diagnostics on both instances and confirm:
   - Redis publish attempts increase after pings
   - Redis poll attempts increase while streams are open
   - Redis publish and poll failures stay at `0`
7. Repeat the public feed ping check with browser A and browser B routed to different instances.

If the ping only reaches the same instance that sent it, Redis sharing is not active.

Diagnostic pings use `kind: "diagnostic-ping"`. They do not create notices or user-facing records.

## Common Failure Modes

### Realtime works locally but not across production instances

Likely cause:

- Redis env vars are missing

Check:

- diagnostics page provider value
- deployment environment variable configuration

### Notices load but no toast appears

Likely causes:

- item was already present in the client list
- initial page load is being mistaken for realtime
- toast hook was removed or bypassed in the client

Check:

- client component still uses `useNotificationInbox`
- the arriving item is actually new to the current in-memory list

### Unread count looks wrong

Likely causes:

- notice `readBy` array did not update
- the wrong `userType` or `user` id was used
- client optimistic update was overwritten by stale data

Check:

- `readBy` entries in MongoDB
- response from `/api/student/notifications`
- response from `/api/school/notifications`

### Public like count does not sync

Likely causes:

- like API did not publish
- public feed client did not stay subscribed
- Redis cross-instance propagation failed

Check:

- `/api/public/feed/[id]/like`
- `public-feed` channel publishing path
- diagnostics provider mode

### Browser stream disconnects and does not recover

Likely causes:

- a proxy is buffering or closing event streams
- browser/network went offline for longer than the retry window
- the client component is not using `useRealtimeChannel`

Check:

- browser network tab for `/api/realtime/stream`
- diagnostics stream status
- `lib/useRealtimeChannel.js` reconnect behavior

## File Map

High-signal files for future work:

- `lib/realtimeBus.js`
- `lib/useRealtimeChannel.js`
- `lib/useNotificationInbox.js`
- `lib/studentNotifications.js`
- `lib/schoolNotifications.js`
- `app/api/student/notifications/route.js`
- `app/api/student/notifications/read/route.js`
- `app/api/school/notifications/route.js`
- `app/api/school/notifications/read/route.js`
- `app/api/notices/route.js`
- `app/api/notices/[id]/route.js`
- `app/api/events/[id]/notices/route.js`
- `app/api/events/[id]/notices/[noticeId]/route.js`
- `components/student/StudentNotificationCenter.js`
- `components/school/SchoolNotificationCenter.js`
- `components/student/StudentNoticeBoard.js`
- `components/school/SchoolNoticeBoard.js`
- `components/events/PublicEventNoticeList.js`
- `app/admin/diagnostics/page.js`

## Recommended Next Phase

After this documentation phase:

1. add backend tests for notification and read-state APIs
2. add tests for public like mutation behavior
3. add tests for diagnostics auth and payload shape
