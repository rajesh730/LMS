# 🚀 IMMEDIATE ACTION ITEMS - Start Here

**Created**: May 26, 2026  
**Status**: 5 Critical Issues Found

---

## 🔴 CRITICAL - Fix BEFORE Production Launch

### 1. Email Service Integration (2-3 Hours)
**Status**: BROKEN - Students not getting credentials, support tickets failing

**Files Needing Action**:
- `app/api/students/send-credentials-email/route.js` (Line 101 - TODO comment)
- `app/api/support-tickets/[id]/route.js` (Line 182 - TODO comment)

**Fix Now**:
```bash
npm install resend
# Create lib/emailService.js with email sending functions
# Update the two routes above to use email service
```

**Impact**: 🔥 Critical - Users cannot receive credentials or support responses

---

### 2. Remove Plain-Text Passwords (1-2 Hours)
**Status**: SECURITY RISK - Teacher.visiblePassword storing plain text

**File**: `models/Teacher.js`

**Current Code**:
```javascript
password: String,           // Hashed via bcryptjs
visiblePassword: String     // ❌ PLAIN TEXT FALLBACK
```

**Fix**:
1. Delete `visiblePassword` field from schema
2. Create migration script to remove all plain-text passwords
3. Add validation to ensure no new plain-text passwords

**Impact**: 🔥 Compliance violation, account takeover risk

---

### 3. API Request Validation (3-4 Hours)
**Status**: Missing - Any invalid data accepted

**Routes Needing Validation**:
- `/api/events` (POST/PATCH)
- `/api/students` (POST)
- `/api/teachers` (POST/PATCH)
- `/api/notices` (POST/PATCH)
- `/api/school/settings` (PUT)
- All `/api/admin/*` endpoints

**Fix**:
```bash
npm install zod
# Create lib/validation.js with schemas
# Add validation middleware to routes
```

**Example**:
```javascript
// lib/validation.js
export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  capacity: z.number().int().positive(),
  startDate: z.string().datetime()
});

// In route:
const validated = createEventSchema.parse(body);
```

**Impact**: 🔥 Data integrity, prevents garbage data

---

### 4. No Testing Suite (1-2 Weeks)
**Status**: Jest configured but 0 tests written

**What to Test First** (highest impact):
1. Authentication flow (3 hours)
2. Event creation & participation (4 hours)
3. Student enrollment (2 hours)
4. Authorization checks (3 hours)

**Start Here**:
```bash
# tests/api/auth.test.js
test('valid credentials should login', async () => {
  const res = await POST({ username: 'teacher@test.com', password: 'correct' });
  expect(res.status).toBe(200);
});

test('invalid credentials should fail', async () => {
  const res = await POST({ username: 'teacher@test.com', password: 'wrong' });
  expect(res.status).toBe(401);
});
```

**Impact**: 🔥 Users will encounter bugs after deployment

---

### 5. No Type Safety (Long-term)
**Status**: All JavaScript, no validation

**Quick Fix** (today):
- Add JSDoc comments to key files
- Use TypeScript in new files going forward

**Long-term**:
- Gradually migrate to TypeScript (2-3 weeks)

---

## 🟠 HIGH PRIORITY - Do in Week 1

### 6. Code Duplication (Database Queries)
**Status**: 50+ instances of `{isDeleted: {$ne: true}}`

**Quick Fix** (30 mins):
```javascript
// lib/dbHelpers.js
export const activeFilter = (extra = {}) => ({
  ...extra,
  isDeleted: { $ne: true }
});

// Search and replace across codebase:
// OLD: Event.find({isDeleted: {$ne: true}, ...})
// NEW: Event.find(activeFilter({...}))
```

---

### 7. Scattered Notification Logic
**Status**: Same code in 5 different files

**Files**:
- `lib/schoolNotifications.js`
- `lib/studentNotifications.js`
- `lib/studentEventNotifications.js`
- `lib/noticeRealtime.js`
- `lib/magazineNotifications.js`

**Fix**: Create `lib/notificationService.js` with unified API

```javascript
export async function notifyUsers(userIds, { title, message, type }) {
  // 1. Save to database
  // 2. Send real-time event
  // 3. Send email if enabled
}

// Replace all 5 files with this single service
```

---

### 8. State Management Chaos
**Status**: useState everywhere, props drilling 5+ levels

**Quick Fix** (2-3 hours):
```bash
npm install zustand
```

Create stores for:
- `eventStore.js` - Event state
- `studentStore.js` - Student data
- `notificationStore.js` - Notifications

```javascript
// lib/stores/eventStore.js
import create from 'zustand';

export const useEventStore = create((set) => ({
  events: [],
  loading: false,
  fetchEvents: async () => {
    set({ loading: true });
    const res = await fetch('/api/events');
    set({ events: res.json(), loading: false });
  }
}));

// Usage: Instead of passing props 5 levels deep
function MyComponent() {
  const { events } = useEventStore();
  return <div>{events.map(...)}</div>;
}
```

---

## 📋 QUICK FIXES (Can Do Today - 2-3 Hours)

### Create Status Constants
```javascript
// lib/constants.js
export const STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED'
};

// Replace all hardcoded strings with these constants
```

### Add Missing Indexes
```javascript
// models/Event.js
eventSchema.index({ schoolId: 1, lifecycleStatus: 1, createdAt: -1 });
eventSchema.index({ visibility: 1, scope: 1 });

// models/Notice.js
noticeSchema.index({ schoolId: 1, visibility: 1, createdAt: -1 });
```

### Add Rate Limiting
```javascript
// app/middleware.js
import { rateLimit } from '@/lib/rateLimit';

export async function middleware(req) {
  if (req.nextUrl.pathname.startsWith('/api/auth')) {
    const limited = await rateLimit(req.ip, 'auth', 5, 900); // 5 req/15min
    if (limited) return new Response('Too many requests', { status: 429 });
  }
}
```

### Add CSRF Protection
```bash
npm install next-csrf
```

---

## 📅 2-WEEK SPRINT PLAN

### Week 1
- **Day 1**: Email service + validation (8 hours)
- **Day 2**: Security fixes (password field, rate limiting) (6 hours)
- **Day 3**: Zustand implementation (6 hours)
- **Day 4**: Auth tests + event tests (8 hours)
- **Day 5**: Documentation + deployment prep (6 hours)

### Week 2
- **Day 1-2**: React Hook Form integration (8 hours)
- **Day 2-3**: Reusable components (8 hours)
- **Day 4-5**: Remaining tests + performance (8 hours)

---

## ✅ VERIFICATION CHECKLIST

Before going live, verify:

- [ ] **Email Service**: Send test credentials email, verify delivery
- [ ] **Password Security**: `visiblePassword` field removed from Teacher model
- [ ] **Validation**: Try submitting invalid data to `/api/events` - should get 400 error
- [ ] **Tests**: Run `npm test` - at least 20 tests passing
- [ ] **Rate Limiting**: Try 10 quick auth attempts - 6th should fail
- [ ] **No TODOs**: Search for "TODO" - should find 0 results
- [ ] **Error Handling**: Trigger error in API - should get standardized error response
- [ ] **State Management**: Check React DevTools - no excessive prop drilling

---

## 🎯 NEXT STEPS

1. **Pick ONE from Critical 5** ☝️ Start with Email Service
2. **Allocate 3-4 hours today** ⏰ 
3. **Create feature branch** 🌿 `fix/email-service`
4. **Test thoroughly** ✅
5. **Deploy to staging first** 📦

---

## 📊 CURRENT PROJECT STATUS

| Category | Status | Risk |
|----------|--------|------|
| Database | ✅ Well-structured | ⚠️ Schema inconsistencies |
| APIs | ✅ 80+ routes | 🔴 No validation |
| Pre-login | ✅ Features working | ⚠️ Not tested |
| Frontend | ✅ Components built | 🟠 State chaos |
| Testing | 🔴 Zero tests | 🔴 Critical gap |
| Security | ⚠️ Partial | 🔴 Plain-text passwords |
| Email | 🔴 Broken | 🔴 Critical |

---

**Recommended**: Start with Email + Validation fixes TODAY
**Estimated Time to Production-Ready**: 2-3 weeks with focused effort

Need help with any specific item? Ask!
