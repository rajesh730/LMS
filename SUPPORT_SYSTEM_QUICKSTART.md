# Support Ticket System - Quick Start Guide

## ✅ Implementation Complete

A fully functional support ticket system has been successfully added to the E-Grantha platform.

---

## 🎯 What Was Added

### 1. Database Model
**File:** `models/SupportTicket.js`
- Stores tickets with all required fields
- Supports status tracking, replies, and internal notes
- Optimized indexes for fast queries

### 2. API Endpoints
**Files:** `app/api/support-tickets/route.js` and `[id]/route.js`
- **GET /api/support-tickets** - List tickets (filtered by role)
- **POST /api/support-tickets** - Create new ticket
- **GET /api/support-tickets/:id** - Get single ticket
- **PATCH /api/support-tickets/:id** - Update ticket (reply/status/notes)
- **DELETE /api/support-tickets/:id** - Delete ticket (admin only)

### 3. School Dashboard Components
**Files:** `components/support/`
- `RaiseTicketForm.js` - Modal form to create tickets
- `SupportTicketManager.js` - Main support tab with list & filter
- `TicketDetailModal.js` - Detailed view and reply interface

### 4. Admin Dashboard
**Files:** 
- `components/support/AdminSupportDashboard.js` - Two-panel ticket management
- `app/admin/support/page.js` - Admin page at `/admin/support`

### 5. Documentation
**File:** `SUPPORT_TICKET_GUIDE.md` - Complete implementation guide

---

## 🚀 How to Use

### For School Admins

1. **Log in** to the school dashboard
2. Click **"Support"** tab (new tab in navigation)
3. **Raise a Ticket:**
   - Click "Raise New Ticket" button
   - Fill in Title, Description, Category, Priority
   - Click "Create Ticket"
4. **View Tickets:**
   - See all your school's tickets
   - Filter by status (Pending, In Progress, Resolved)
   - Search by title or ticket ID
5. **Track Updates:**
   - Click on any ticket to see full details
   - View all admin replies
   - Add new replies (unless resolved)
   - See when status changes

### For Super Admins

1. **Navigate** to `/admin/support`
2. **View all tickets** from all schools
3. **Manage tickets:**
   - Select a ticket from the left panel
   - See full details and all replies
   - Update status (Pending → In Progress → Resolved)
   - Add public reply (visible to school)
   - Add internal note (admin only)
   - Click "Update Ticket"

---

## 📊 Features

### School-Side
- ✅ Create support tickets with title, description, category, priority
- ✅ View all their tickets with status badges
- ✅ Search and filter tickets
- ✅ View ticket details and admin responses
- ✅ Add replies to ongoing tickets
- ✅ Track ticket resolution

### Admin-Side
- ✅ View all tickets from all schools
- ✅ Filter by status or school
- ✅ Search tickets
- ✅ Change ticket status (pending → in-progress → resolved)
- ✅ Add public replies (sent to school)
- ✅ Add internal notes (admin only)
- ✅ Delete tickets
- ✅ Track resolution with timestamps

### Status Tracking
- 🟡 **Pending** - Awaiting admin response
- 🔵 **In Progress** - Being addressed
- ✅ **Resolved** - Issue solved

### Categories
- 🔵 **Technical** - System/technical issues
- 🟣 **Account** - Login/account problems
- 🩷 **Events** - Events & activities
- 🟠 **Billing** - Payment issues
- ⚪ **Other** - Miscellaneous

### Priority Levels
- 🟢 **Low** - Can wait
- 🟡 **Medium** - Standard (default)
- 🔴 **High** - Urgent

---

## 🔧 Technical Details

### Database
- MongoDB collection: `supporttickets`
- Fields: title, description, category, status, priority, replies, internalNotes, etc.
- Optimized with compound indexes for fast queries

### Authorization
- **Schools:** Can only see and manage their own tickets
- **Admins:** Can see all tickets and manage them all
- **Role checks:** Enforced at API and component level

### Real-time Updates
- Clicking "Update Ticket" refreshes the entire list
- New replies immediately visible
- Status changes reflected instantly

---

## 📍 File Structure

```
models/
└── SupportTicket.js

app/
├── api/support-tickets/
│   ├── route.js              # GET all, POST new
│   └── [id]/route.js         # GET single, PATCH update, DELETE
└── admin/support/
    └── page.js               # Admin dashboard page

components/support/
├── RaiseTicketForm.js        # Create ticket modal
├── SupportTicketManager.js   # School support tab
├── TicketDetailModal.js      # Ticket details view
└── AdminSupportDashboard.js  # Admin management panel

Documentation/
└── SUPPORT_TICKET_GUIDE.md   # Complete guide (this file)
```

---

## 🧪 Testing

### Test Creating a Ticket (School)
1. Go to School Dashboard
2. Click Support tab
3. Click "Raise New Ticket"
4. Fill form and submit
5. See ticket appear in list

### Test Responding (Admin)
1. Go to `/admin/support`
2. Click any ticket
3. Type reply in "Reply to School" field
4. Optionally change status
5. Click "Update Ticket"
6. School will see the reply

### Test Resolving
1. Admin changes status to "Resolved"
2. Ticket no longer accepts replies
3. School can see "Resolved" status
4. Resolution timestamp is recorded

---

## ⚙️ Configuration

### Environment Variables
No new environment variables required. Uses existing:
- `MONGODB_URI` - Database connection
- `NEXTAUTH_SECRET` - Authentication

### API Response Format
All endpoints follow standard format:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Success message",
  "code": 200
}
```

---

## 🔒 Security

### Authorization Checks
- ✅ Only authenticated users can access
- ✅ School admins can only see their tickets
- ✅ Super admins can see all tickets
- ✅ Only super admin can change status/add notes/delete

### Input Validation
- ✅ All fields trimmed and validated
- ✅ Category must be in allowed list
- ✅ Status must be valid transition
- ✅ Role-based authorization at API level

---

## 🐛 Troubleshooting

### Tickets not appearing
- Check you're logged in as SCHOOL_ADMIN
- Verify ticket was created (check browser console)
- Try refreshing the page

### Can't change status
- Verify you're logged in as SUPER_ADMIN
- Only admins can change status
- Try refreshing and selecting ticket again

### Can't add reply
- Ticket must not be "Resolved"
- School admins can add replies
- Admin replies are added via "Update Ticket" button

### Admin page not accessible
- Verify you're logged in as SUPER_ADMIN
- Check URL is exactly `/admin/support`
- Try logging out and back in

---

## 📈 Future Enhancements

Possible improvements for future versions:
1. File attachments to tickets
2. Email notifications when status changes
3. SLA tracking (response time, resolution time)
4. Ticket assignment to specific admins
5. Canned responses/templates
6. Analytics dashboard
7. Export to PDF/CSV
8. Bulk ticket operations
9. Ticket priority/urgency indicators
10. Chat-style conversation view

---

## ✅ Checklist

- [x] Database model created
- [x] API endpoints implemented
- [x] School-side components built
- [x] Admin-side dashboard created
- [x] Authorization and security implemented
- [x] UI with proper styling
- [x] Error handling
- [x] Loading states
- [x] Search and filter functionality
- [x] Status tracking
- [x] Reply management
- [x] Internal notes for admins only
- [x] Documentation complete

---

## 📞 Support

For questions about implementation, refer to:
- `SUPPORT_TICKET_GUIDE.md` - Complete technical guide
- Component files - JSDoc comments in code
- API route files - Request/response examples

---

**Status:** ✅ Ready for Production  
**Last Updated:** December 12, 2025  
**Version:** 1.0
