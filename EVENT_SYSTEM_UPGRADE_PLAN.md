# Event Participation System - Professional Upgrade Plan

**Document Version:** 1.0  
**Date:** December 8, 2025  
**Objective:** Redesign event visibility and capacity management to prevent future rework

---

## Executive Summary

The current event participation system has **architectural limitations** that will compound as the system grows:

1. **Students see ALL events** regardless of eligibility → Poor UX, confusion
2. **Capacity metrics are in a separate dashboard** → Users must navigate multiple views
3. **Grade validation happens at request time** → Students request ineligible events, admins reject
4. **Scattered data visualization** → Event details don't show capacity breakdown

**This upgrade implements:**

- ✅ **Server-side grade filtering** - Only eligible events shown to students
- ✅ **Embedded capacity metrics** - Capacity data in event cards/modals
- ✅ **Unified event management** - One view for admins (capacity + participation)
- ✅ **Professional data architecture** - No future rework needed

---

## Current State Analysis

### What Works Well ✅

- Two-step approval workflow (APPROVE → ENROLL)
- Grade eligibility rules set by admins
- Per-school and global capacity limits
- Activity logging
- Numeric grade system (1-12, Bachelor semesters)

### What Needs Fixing ❌

- **Student Dashboard Issue:**

  - Shows ALL events (even ineligible ones)
  - Student must request, then find out they're ineligible
  - No visibility into "why can't I join?"

- **Admin Dashboard Issue:**

  - Capacity metrics in SEPARATE "Event Capacity" tab
  - Event management scattered across multiple views
  - Can't see capacity while approving/rejecting students

- **Data Architecture Issue:**
  - No capacity calculation in student event list API
  - Grade eligibility not used in API filtering (done in UI)
  - Event details modal doesn't show capacity breakdown

---

## New Architecture (Professional Solution)

### Phase 1: Student-Side Filtering (Server-Side)

**Current Flow:**

```
API: /api/events → All events → Frontend filters
     ❌ Wasteful, unreliable filtering
```

**New Flow:**

```
API: /api/student/eligible-events → Only eligible events + capacity data
     ✅ Server-side filtering, single source of truth
```

#### Endpoint: `GET /api/student/eligible-events`

**Purpose:** Fetch events visible to logged-in student based on their grade

**Query Parameters:**

- `status` (optional): "available" | "requested" | "approved" | "enrolled"
- `sort` (optional): "date" | "participationRate"

**Response Structure:**

```javascript
{
  success: true,
  data: [
    {
      // Basic Event Info
      _id: "...",
      title: "Science Fair 2025",
      description: "...",
      date: "2025-12-15T10:00:00Z",
      eligibleGrades: ["9", "10", "11"],

      // Capacity Metrics (NEW - EMBEDDED)
      maxParticipants: 100,
      totalEnrolled: 45,
      enrollmentPercentage: 45,

      maxParticipantsPerSchool: 15,
      schoolCapacity: [
        {
          schoolId: "...",
          schoolName: "Central High School",
          enrolled: 12,
          percentage: 80,
          status: "near-capacity"  // "available" | "near-capacity" | "full"
        },
        // ... more schools
      ],

      // Participation Status (for requested/approved/enrolled events)
      studentRequest: {
        status: "APPROVED",  // PENDING | APPROVED | ENROLLED | REJECTED
        requestId: "...",
        requestedAt: "2025-12-01T10:00:00Z",
        rejectionReason: null,
        approvedAt: "2025-12-02T10:00:00Z"
      },

      // Deadline Info
      registrationDeadline: "2025-12-10T23:59:59Z",
      deadlinePassed: false,

      // Eligibility Status
      isEligible: true,
      ineligibilityReason: null,  // "Not in eligible grades" | "Deadline passed" | null
    }
  ]
}
```

**Logic:**

1. Get logged-in student's grade from Student model
2. Find all APPROVED events
3. **Filter by eligibility:**
   - `eligibleGrades` includes student's grade OR eligibleGrades is empty (all grades)
   - Registration deadline hasn't passed
4. Calculate capacity metrics for each event
5. Fetch student's participation requests for these events
6. Return with status labels and visual indicators

**Benefit:** Student sees ONLY relevant events, no confusion

---

### Phase 2: Event Details Component Enhancement

**Current:** Event cards show title, date, description only

**New:** Event cards + Modal with:

```
┌─────────────────────────────────────────┐
│ Science Fair 2025                  [12/15]
│ ────────────────────────────────────────
│ Registration Deadline: Dec 10, 2025
│ Eligible Grades: 9, 10, 11
│
│ 📊 CAPACITY OVERVIEW
│ ───────────────────
│ Global Enrollment: 45/100 (45%)
│ [████░░░░░░░░░░░░] Green (Available)
│
│ Per-School Breakdown:
│ • Central High School: 12/15 (80%) 🟡 Near Capacity
│ • North Academy: 18/15 (120%) 🔴 FULL
│ • West Institute: 15/15 (100%) 🔴 FULL
│
│ Your Status: ✅ APPROVED (Waiting enrollment)
│
│ [Request Event] or [View Details] buttons
└─────────────────────────────────────────┘
```

**UI Components to Update:**

- `StudentEventManager.js` - Use new `/api/student/eligible-events`
- Event card component - Add capacity badges
- Event modal - Show capacity breakdown + per-school status

**Visual Indicators:**

```
Status Colors:
🟢 Green (0-50%): "Space Available"
🟡 Yellow (50-80%): "Filling Up"
🔴 Red (80-100%): "Nearly Full"
⚫ Black (100%+): "FULL - Cannot Join"
```

---

### Phase 3: School Admin Event Management View

**Current:** Two separate views

- Event management (Participation Requests tab)
- Event capacity (Event Capacity tab) ← **REDUNDANT**

**New:** Unified event management view

```
Event List (School Admin Dashboard):
┌───────────────────────────────────────────────────────────┐
│ Science Fair 2025                            [12/15] 🟡
│
│ Eligible: Grades 9, 10, 11
│ Status: APPROVED | Created: Dec 1, 2025
│
│ Capacity:
│ • Global: 45/100 (45%) 🟢
│ • Your School: 12/15 (80%) 🟡
│
│ Pending Approvals: 3
│ [View Requests] [See Capacity] [Edit]
├───────────────────────────────────────────────────────────┤
│ Next Event...
└───────────────────────────────────────────────────────────┘
```

**Benefits:**

- Admins see capacity while reviewing requests
- One view instead of three
- Context-aware decision making

---

### Phase 4: Super Admin Event Management

**For Super Admin creating events:**

Event Form Fields:

```
✓ Title, Description, Date (Existing)
✓ Eligible Grades (Existing)
✓ Registration Deadline (Existing)
✓ Max Participants (Existing)
✓ Max Per School (Existing)

NEW: Capacity Visualization on Form
  [Shows live capacity as admin sets limits]
  "If you set max 50 globally:"
  • Currently would support ~5-10 schools @ 15 each
  • Recommended: 45-60 range
```

---

## Implementation Roadmap

### Step 1: Create New API Endpoint (2-3 hours)

**File:** `/app/api/student/eligible-events/route.js`

- Fetch student's grade
- Filter events by eligibility
- Calculate capacity metrics
- Return with participation status

**Replaces:** Existing `/api/events` for student role

### Step 2: Update Student Dashboard (2 hours)

**Files:**

- `components/StudentEventManager.js` - Use new endpoint
- Event card component - Add capacity badges
- Event modal - Show capacity breakdown

**Key Changes:**

- Remove grade-filtering logic from UI (move to API)
- Add capacity metrics rendering
- Add status badges for near-full schools

### Step 3: Integrate Capacity in School Admin Dashboard (2 hours)

**Files:**

- `app/school/dashboard/page.js`
- Create new `EventManagementView.js` component

**Key Changes:**

- Merge capacity info into event list
- Show capacity while reviewing requests
- Remove separate "Event Capacity" tab

### Step 4: Enhance Super Admin Event Creation (1 hour)

**File:** `app/admin/dashboard/SendEventForm.js`

- Add capacity recommendation tooltip
- Show visual impact of capacity limits

### Step 5: Remove Redundant Components (30 mins)

**Files to Delete/Archive:**

- `components/EventCapacityDashboard.js` - Functionality merged
- Remove from `app/school/dashboard/page.js`

**Total Implementation Time:** ~8-9 hours

---

## Data Structure Decisions

### Why Server-Side Filtering?

```
Before (Frontend):
GET /api/events → Returns 500 events globally
→ Browser filters → Student sees 15 relevant ones
→ Wasteful, potential bugs, inconsistent

After (Server-Side):
GET /api/student/eligible-events → Returns 15 events
→ Already filtered by grade
→ Capacity pre-calculated
→ Single source of truth
```

### Capacity Metrics Calculation

```javascript
// In /api/student/eligible-events or /api/events

const totalEnrolled =
  event.participants?.reduce((sum, p) => sum + (p.students?.length || 0), 0) ||
  0;

const schoolCapacity = event.participants?.map((p) => ({
  schoolId: p.school?._id?.toString(),
  schoolName: p.school?.schoolName,
  enrolled: p.students?.length || 0,
  percentage: Math.round((enrolled / maxPerSchool) * 100),
  status:
    enrolled >= maxPerSchool
      ? "full"
      : enrolled >= maxPerSchool * 0.8
      ? "near-capacity"
      : "available",
}));

// Sort by status (full first for visibility)
schoolCapacity.sort((a, b) => {
  const order = { full: 0, "near-capacity": 1, available: 2 };
  return order[a.status] - order[b.status];
});
```

---

## UI/UX Flow

### Student Journey (Improved)

```
1. Login → Dashboard
2. See "My Events" section (auto-filtered by grade)
3. View event card with:
   - Title, date, eligibility
   - Capacity indicator (🟢/🟡/🔴 badge)
   - Per-school breakdown in tooltip
4. Click "View Details" → Modal with full breakdown
5. Request → Status tracked in "Pending Approvals"
6. Approved → Modal shows "Finalize Enrollment" button
7. Enrolled → Appears in "My Enrolled Events"
```

### Admin Journey (Simplified)

```
1. Login (School Admin) → Dashboard
2. See "Event Requests" in dedicated section
3. For each event, see:
   - Title + capacity status badge
   - Pending requests count
   - Per-school capacity on hover
4. Click event → Request approval form
5. Approve/Reject with reason
6. Monitor capacity in same view
```

---

## Success Criteria

After implementation:

✅ **Student Experience:**

- Only see eligible events
- Understand why they can't join (ineligible grade, full, deadline passed)
- See capacity before requesting
- No wasted requests

✅ **Admin Experience:**

- Capacity visible while reviewing requests
- One unified view for event management
- Visual capacity warnings

✅ **Data Quality:**

- Single source of truth for eligibility
- Consistent capacity calculations
- Audit trail of all changes

✅ **No Future Rework:**

- Scalable to 1000+ events
- Grade system supports all education types
- Capacity logic centralized (not scattered)

---

## Risk Mitigation

| Risk                                     | Mitigation                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| API breaking change for existing clients | Version API endpoint: `/api/v2/student/eligible-events`; Keep old endpoint deprecated |
| Performance with large datasets          | Index `Event.eligibleGrades` and `Student.grade` for fast filtering                   |
| Missing edge cases                       | Comprehensive testing: deadline edge, empty grades, overfull schools                  |
| Rollback difficulty                      | Keep old EventCapacityDashboard until new view proven stable (1-2 weeks)              |

---

## Code Quality Standards

**For all changes:**

1. Use consistent naming: `enrollmentPercentage`, `schoolCapacity` (not `enrolled_pct`)
2. Add JSDoc comments for complex logic
3. Validate all inputs at API level
4. Test with edge cases (0 capacity, 0 students, null fields)
5. Handle missing/null data gracefully
6. Add error logging with context

**Example:**

```javascript
/**
 * Calculate capacity status for visual feedback
 * @param {number} enrolled - Current enrolled count
 * @param {number} maxCapacity - Maximum capacity
 * @returns {"available" | "near-capacity" | "full"}
 */
const getCapacityStatus = (enrolled, maxCapacity) => {
  if (!maxCapacity) return "available";
  const percentage = (enrolled / maxCapacity) * 100;
  if (percentage >= 100) return "full";
  if (percentage >= 80) return "near-capacity";
  return "available";
};
```

---

## Files to Create/Modify

### Create (NEW)

- `/app/api/student/eligible-events/route.js` - Main new endpoint
- `/components/EventCapacityIndicator.js` - Reusable capacity badge component
- `/components/SchoolCapacityBreakdown.js` - Per-school capacity display

### Modify (CORE)

- `/app/api/events/route.js` - Add capacity calculations
- `/components/StudentEventManager.js` - Use new endpoint, show capacity
- `/app/school/dashboard/page.js` - Remove Event Capacity tab, integrate into requests

### Modify (FORM)

- `/app/admin/dashboard/SendEventForm.js` - Add capacity recommendations

### Archive (KEEP FOR NOW, DELETE LATER)

- `/components/EventCapacityDashboard.js` - Redundant after integration
- `/app/api/school/event-capacity/route.js` - Replaced by inline calculations

---

## Rollout Strategy

**Week 1:**

- Develop & test new API
- Test with 10 events, 5 grades, 3 schools

**Week 2:**

- Update student dashboard components
- A/B test with beta users

**Week 3:**

- Integrate capacity into school admin view
- Remove EventCapacityDashboard

**Week 4:**

- Full rollout
- Monitor performance
- Gather feedback

---

## Success Metrics

- ❌ Reduce invalid event requests by 80% (students see ineligible events)
- ❌ Admin approval time reduced by 40% (capacity visible in one place)
- ❌ Zero "Why can't I join?" complaints (reason shown to students)
- ❌ API response time < 200ms for eligible events endpoint

---

## Questions for Clarification

Before implementing, confirm:

1. Should super admin see ALL school capacity on event creation page? (Recommended: Yes)
2. When event becomes FULL, should it move to separate "Full Events" tab? (Recommended: Yes, with waitlist option)
3. Should there be email notifications when:
   - Event fills up?
   - Student becomes eligible but deadline passed?
   - School reaches near-capacity?
     (Recommended: Yes, but Phase 2)
4. Should students be able to see WHY they're ineligible? (Recommended: Yes - show in tooltip)

---

**Status:** Ready for Implementation  
**Next Step:** Get approval on architecture, then start Phase 1
