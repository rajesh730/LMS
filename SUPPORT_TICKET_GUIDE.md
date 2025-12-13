# Support Ticket System - Implementation Guide

## Overview

A complete support ticketing system has been implemented allowing schools to raise support tickets with the super admin, who can then respond and resolve them.

## Features

### For Schools (SCHOOL_ADMIN)

#### 1. Raise Ticket
- **Location:** School Dashboard → Support Tab → "Raise New Ticket" button
- **Fields:**
  - Title/Subject (required)
  - Description (required, detailed issue description)
  - Category (optional: technical, account, events, billing, other)
  - Priority (low, medium, high - default: medium)
- **Auto-fields:**
  - Status: "pending"
  - Timestamp: created_at
  - School: automatically linked to the school admin's school

#### 2. View Tickets
- **Location:** School Dashboard → Support Tab
- **Features:**
  - List all tickets raised by the school
  - Filter by status (all, pending, in-progress, resolved)
  - Search by title or ticket ID
  - View status with color-coded badges
  - See number of replies for each ticket
  - Display ticket metadata (category, priority, created date)

#### 3. Ticket Detail & Responses
- **Features:**
  - Click on any ticket to view full details
  - View all admin replies with timestamp and sender info
  - Add new replies to the ticket (unless resolved)
  - Cannot modify status (only super admin can)
  - Real-time updates when admin responds

---

### For Super Admin (SUPER_ADMIN)

#### 1. Access Admin Support Panel
- **URL:** `/admin/support`
- **Route Protection:** Only accessible to SUPER_ADMIN role

#### 2. View All Tickets
- **Features:**
  - Two-panel layout:
    - Left panel: List of all tickets from all schools
    - Right panel: Detailed view of selected ticket
  - Filter by status
  - Search by ticket ID, school name, or title
  - Sort and organize tickets
  - See ticket count for current filters

#### 3. Manage Tickets
- **Features:**
  - Change ticket status:
    - pending → in-progress (being addressed)
    - in-progress → resolved (issue solved)
    - pending → resolved (direct resolution)
  - Add public reply (visible to school)
  - Add internal notes (visible only to admins)
  - Auto-sets resolved timestamp and resolver info
  - Track resolution history

#### 4. Response Features
- **Public Reply:**
  - Sent to schools
  - Appears in ticket's reply thread
  - Marked with admin name and timestamp
  - Schools can see and respond

- **Internal Notes:**
  - Only visible to super admins
  - Use for tracking admin discussions
  - Not visible to schools
  - Appears in separate "Internal Notes" section

---

## Database Schema

### SupportTicket Model

```javascript
{
  school: ObjectId (ref: User),              // School admin who raised it
  schoolName: String,                        // School name snapshot
  title: String,                             // Ticket subject
  description: String,                       // Issue details
  category: String,                          // technical, account, events, billing, other
  status: String,                            // pending, in-progress, resolved
  priority: String,                          // low, medium, high
  attachments: Array,                        // Future: file uploads
  
  replies: [
    {
      author: ObjectId (ref: User),          // Who replied
      authorName: String,                    // Reply author name
      authorRole: String,                    // SCHOOL_ADMIN or SUPER_ADMIN
      message: String,                       // Reply text
      createdAt: Date,                       // Reply timestamp
    }
  ],
  
  internalNotes: [
    {
      author: ObjectId (ref: User),          // Admin who added note
      authorName: String,
      note: String,                          // Internal note text
      createdAt: Date,
    }
  ],
  
  resolvedAt: Date,                          // When marked as resolved
  resolvedBy: ObjectId (ref: User),          // Which admin resolved it
  
  timestamps: true,                          // createdAt, updatedAt
}
```

### Indexes for Performance
- `{ school: 1, status: 1 }`
- `{ school: 1, createdAt: -1 }`
- `{ status: 1, createdAt: -1 }`
- `{ category: 1 }`

---

## API Endpoints

### 1. Get Tickets
**GET** `/api/support-tickets`

- **For SCHOOL_ADMIN:** Returns only their school's tickets
- **For SUPER_ADMIN:** Returns all tickets (can filter by school/status)
- **Query Parameters:**
  - `school`: Filter by school ID (super admin only)
  - `status`: Filter by status (all roles)

**Response:**
```json
{
  "success": true,
  "data": {
    "tickets": [
      { /* ticket object */ }
    ]
  }
}
```

### 2. Create Ticket
**POST** `/api/support-tickets`

- **Auth:** SCHOOL_ADMIN only
- **Body:**
```json
{
  "title": "Login Issues",
  "description": "Students cannot login...",
  "category": "account",
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ticket": { /* newly created ticket */ }
  }
}
```

### 3. Get Single Ticket
**GET** `/api/support-tickets/:id`

- **Auth:** School admin (own tickets) or super admin (any)
- **Returns:** Full ticket with all replies and notes

### 4. Update Ticket
**PATCH** `/api/support-tickets/:id`

- **For SCHOOL_ADMIN:**
  - Can only add public replies
  - Cannot change status
  - Body: `{ "action": "reply", "message": "..." }`

- **For SUPER_ADMIN:**
  - Can add public replies
  - Can change status (pending → in-progress → resolved)
  - Can add internal notes (admin only)
  - Body:
  ```json
  {
    "action": "reply",
    "message": "We're working on this...",
    "status": "in-progress",
    "internalNote": "Need to check database logs"
  }
  ```

**Response:**
```json
{
  "success": true,
  "data": {
    "ticket": { /* updated ticket */ }
  }
}
```

### 5. Delete Ticket
**DELETE** `/api/support-tickets/:id`

- **Auth:** SUPER_ADMIN only
- **Returns:** Success message

---

## UI Components

### School-Side Components

#### 1. RaiseTicketForm
- **Location:** `components/support/RaiseTicketForm.js`
- **Features:**
  - Modal form for creating tickets
  - Category and priority selection
  - Error handling
  - Loading states
  - Callback on successful creation

#### 2. SupportTicketManager
- **Location:** `components/support/SupportTicketManager.js`
- **Features:**
  - Main support tab component
  - List of all school tickets
  - Filter and search
  - Click to view details
  - Integrates RaiseTicketForm and TicketDetailModal

#### 3. TicketDetailModal
- **Location:** `components/support/TicketDetailModal.js`
- **Features:**
  - Full ticket details view
  - All replies from admin
  - Reply form (unless resolved)
  - Status badges with color coding
  - Category and priority display

### Admin-Side Components

#### 1. AdminSupportDashboard
- **Location:** `components/support/AdminSupportDashboard.js`
- **Features:**
  - Two-panel layout
  - Left: Ticket list with search/filter
  - Right: Ticket details with action panel
  - Status update dropdown
  - Public reply textarea
  - Internal notes textarea
  - Full ticket management

---

## Integration in Dashboards

### School Dashboard
- **Tab Name:** "Support"
- **Icon:** FaHeadset
- **Component:** SupportTicketManager (lazy loaded)
- **Route:** `/school/dashboard` → Support tab

### Admin Dashboard
- **Route:** `/admin/support`
- **Component:** AdminSupportDashboard (server-side rendered)
- **Full-page layout with header

---

## User Flows

### School Raising a Ticket

1. Navigate to School Dashboard
2. Click "Support" tab
3. Click "Raise New Ticket" button
4. Fill form:
   - Title: "Technical Issue"
   - Description: "Students can't upload assignments"
   - Category: "technical"
   - Priority: "high"
5. Click "Create Ticket"
6. Ticket created with status "pending"
7. Ticket appears in list

### Admin Responding to Ticket

1. Navigate to `/admin/support`
2. See list of all tickets
3. Click on a ticket
4. See full details and all replies
5. Options:
   - Change status to "in-progress"
   - Add public reply
   - Add internal note
6. Click "Update Ticket"
7. School receives notification of reply

### Ticket Resolution

1. Admin changes status to "resolved"
2. Auto-sets resolvedAt timestamp
3. Auto-sets resolvedBy to current admin
4. School can no longer add replies
5. Ticket marked as "Resolved" in their list

---

## Status Badges & Colors

- **Pending:** 🟡 Yellow (waiting for admin response)
- **In Progress:** 🔵 Blue (admin is addressing)
- **Resolved:** ✅ Green (issue solved)

---

## Category Icons & Colors

- **Technical:** 🔵 Blue
- **Account:** 🟣 Purple
- **Events:** 🩷 Pink
- **Billing:** 🟠 Orange
- **Other:** ⚪ Gray

---

## Priority Levels & Colors

- **Low:** 🟢 Green (can wait)
- **Medium:** 🟡 Yellow (standard)
- **High:** 🔴 Red (urgent)

---

## Security & Validation

### Authorization Rules

- **SCHOOL_ADMIN:**
  - Can only create tickets for their own school
  - Can only view their school's tickets
  - Can only add replies to their own tickets
  - Cannot see internal notes
  - Cannot change status

- **SUPER_ADMIN:**
  - Can view all tickets from all schools
  - Can filter and search tickets
  - Can update status
  - Can add public replies
  - Can add internal notes
  - Can delete tickets

### Input Validation

- Title: Required, trimmed, max 200 chars
- Description: Required, trimmed, max 5000 chars
- Category: Must be in enum list
- Priority: Must be in enum list
- Status: Must be valid transition
- Message/Note: Required when replying, trimmed

---

## Performance Optimizations

### Database Indexes

- Indexed on `school` + `status` for quick filtering
- Indexed on `status` + `createdAt` for sorting
- Indexed on `category` for statistics

### Caching Strategies

- Tickets list cached via React state
- Auto-refresh after adding reply
- Optimistic UI updates

### UI Performance

- Lazy-loaded component in school dashboard
- Two-panel layout for admin (list scrolls independently)
- Max-height overflow for replies list
- Search debounced implicitly (onChange)

---

## Future Enhancements

1. **File Attachments:** Upload images/documents with tickets
2. **Email Notifications:** Notify schools when admin replies
3. **Ticket Assignment:** Assign tickets to specific admins
4. **SLA Tracking:** Track response time and resolution time
5. **Canned Responses:** Common replies for admins
6. **Ticket Templates:** Pre-filled tickets for common issues
7. **Analytics:** Dashboard showing ticket metrics
8. **Export:** Export tickets to PDF/CSV
9. **Bulk Actions:** Bulk update multiple tickets
10. **Ticket Escalation:** Escalate to higher priority/admin

---

## Testing

### Test Ticket Creation
```bash
curl -X POST http://localhost:3000/api/support-tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Ticket",
    "description": "Test description",
    "category": "technical",
    "priority": "medium"
  }'
```

### Test Ticket List
```bash
curl http://localhost:3000/api/support-tickets
```

### Test Admin Response
```bash
curl -X PATCH http://localhost:3000/api/support-tickets/:id \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reply",
    "message": "We are working on this",
    "status": "in-progress",
    "internalNote": "Check logs"
  }'
```

---

## Troubleshooting

### Tickets not showing up
- Verify user is logged in as SCHOOL_ADMIN
- Check browser console for API errors
- Verify `/api/support-tickets` returns data

### Cannot add replies
- Verify ticket status is not "resolved"
- Check user has appropriate role
- Verify message field is not empty

### Admin page not accessible
- Verify logged-in user is SUPER_ADMIN
- Check middleware allows access to `/admin/support`
- Verify session is valid

---

## File Structure

```
/models
  └── SupportTicket.js

/app/api/support-tickets
  ├── route.js                    # GET all, POST new
  └── [id]
      └── route.js                # GET single, PATCH update, DELETE

/app/admin/support
  └── page.js                     # Admin dashboard page

/components/support
  ├── RaiseTicketForm.js          # School: create ticket modal
  ├── SupportTicketManager.js     # School: main support tab
  ├── TicketDetailModal.js        # School: ticket details view
  └── AdminSupportDashboard.js    # Admin: full ticket management
```

---

**Status:** ✅ Complete and ready for use
**Last Updated:** December 12, 2025
