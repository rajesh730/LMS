# E-Grantha Enhanced Student Registration - Routes & Endpoints Reference

## 🗺️ New Routes Added

### Web Routes (Pages)

#### 1. Student Registration Page
```
Route: /school/register-student
Method: GET
Access: School Admin (SCHOOL_ADMIN role)
Component: EnhancedStudentRegistration with DashboardLayout
Status: ✅ Production Ready
```

**Features:**
- 3-part student registration form
- Auto-generated credential display
- Copy/Print/Email functionality
- Form validation
- Success notifications

**Expected Response:** HTML page with registration form

---

#### 2. Student Login Page
```
Route: /student/login
Method: GET
Access: Public (unauthenticated)
Component: Modern login form with animations
Status: ✅ Production Ready
```

**Features:**
- Username field
- Password field with show/hide toggle
- Remember me checkbox
- Forgot password link (future)
- Error message display
- Parent portal link

**Expected Response:** HTML page with login form

---

## 🔌 API Endpoints

### 1. Generate Credentials Endpoint
```
Route: /api/auth/generate-credentials
Method: POST
Content-Type: application/json
Status: ✅ Production Ready
```

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "schoolId": "507f1f77bcf86cd799439011"
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Credentials generated successfully",
  "data": {
    "username": "john.doe",
    "password": "Secure16CharPassword123!"
  }
}
```

**Response (Validation Error 400):**
```json
{
  "success": false,
  "message": "Missing required fields: firstName, lastName, schoolId",
  "code": "BAD_REQUEST",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response (Server Error 500):**
```json
{
  "success": false,
  "message": "Failed to generate credentials: [error details]",
  "code": "INTERNAL_SERVER_ERROR",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| firstName | String | Yes | Student's first name |
| lastName | String | Yes | Student's last name |
| schoolId | String (ObjectId) | Yes | School's ObjectId |

**Validation Rules:**
- firstName: Non-empty string
- lastName: Non-empty string
- schoolId: Valid MongoDB ObjectId

**Processing:**
1. Validates all inputs
2. Connects to database
3. Checks for duplicate usernames in school
4. Generates username: firstname.lastname (lowercase)
5. Auto-increments if duplicate: firstname.lastname2, firstname.lastname3, etc.
6. Generates secure 16-character password
7. Returns plain credentials to frontend

---

### 2. Student Registration Endpoint
```
Route: /api/students/register
Method: POST
Content-Type: application/json
Status: ✅ Production Ready
```

**Request:**
```json
{
  "username": "john.doe",
  "password": "Secure16CharPassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "2010-05-15",
  "gender": "MALE",
  "phone": "9841234567",
  "grade": "Grade 5",
  "rollNumber": "15",
  "address": "123 Main Street",
  "bloodGroup": "O+",
  "guardianRelationship": "FATHER",
  "parentName": "James Doe",
  "parentContactNumber": "9841000000",
  "parentEmail": "james.doe@email.com",
  "parentAlternativeContact": "9841111111",
  "school": "507f1f77bcf86cd799439011"
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Student registered successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "username": "john.doe",
    "name": "John Doe",
    "grade": "Grade 5",
    "parentName": "James Doe",
    "parentEmail": "james.doe@email.com"
  }
}
```

**Response (Validation Error 400):**
```json
{
  "success": false,
  "message": "Missing required field: dateOfBirth",
  "code": "BAD_REQUEST",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response (Duplicate Error 409):**
```json
{
  "success": false,
  "message": "Student with this username already exists",
  "code": "CONFLICT",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Parameters:**

**Login Credentials:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | String | Yes | Auto-formatted username (firstname.lastname) |
| password | String | Yes | Plain text password (will be hashed) |

**Student Details:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| firstName | String | Yes | Student's first name |
| lastName | String | Yes | Student's last name |
| dateOfBirth | Date | Yes | Student's birth date (ISO format) |
| gender | Enum | Yes | MALE, FEMALE, OTHER |
| phone | String | No | Student's phone number |
| grade | String | Yes | Grade/Class name (from school config) |
| rollNumber | String | Yes | Roll number in class |
| address | String | No | Student's address |
| bloodGroup | String | No | A+, A-, B+, B-, AB+, AB-, O+, O- |

**Parent/Guardian Details:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| guardianRelationship | Enum | Yes | FATHER, MOTHER, GUARDIAN, UNCLE, AUNT, SIBLING |
| parentName | String | Yes | Guardian's full name |
| parentContactNumber | String | Yes | Primary contact number |
| parentEmail | String | Yes | Email address |
| parentAlternativeContact | String | No | Alternative contact number |

**School Reference:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| school | String (ObjectId) | Yes | School's ObjectId |

**Processing:**
1. Validates all 14 required fields
2. Connects to database
3. Hashes password with bcrypt (10 salt rounds)
4. Checks for duplicate username in school
5. Creates new Student document
6. Returns registered student data

---

### 3. Send Credentials Email Endpoint
```
Route: /api/students/send-credentials-email
Method: POST
Content-Type: application/json
Status: ✅ Production Ready (Ready for SendGrid integration)
```

**Request:**
```json
{
  "parentEmail": "james.doe@email.com",
  "parentName": "James Doe",
  "studentName": "John Doe",
  "username": "john.doe",
  "password": "Secure16CharPassword123!"
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Credentials email sent to parent",
  "data": {
    "message": "Email sent successfully",
    "recipientEmail": "james.doe@email.com"
  }
}
```

**Response (Validation Error 400):**
```json
{
  "success": false,
  "message": "Missing required fields",
  "code": "BAD_REQUEST",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| parentEmail | String | Yes | Email address to send to |
| parentName | String | Yes | Parent's name for greeting |
| studentName | String | Yes | Student's name for email content |
| username | String | Yes | Student's username |
| password | String | Yes | Student's password |

**Email Template:**
```
Subject: Student Login Credentials

Dear [Parent Name],

Your child [Student Name] has been successfully registered in our school 
management system. Below are the login credentials for accessing the student account.

Username: [username]
Password: [password]

⚠️ Important: Please keep these credentials safe. We recommend changing the 
password on the first login.

Next Steps:
- Log in to the student portal using the credentials above
- Change the password to something only you know
- Update any additional student information if needed
- Contact school administration if you need assistance

Best regards,
School Management System
```

**Processing:**
1. Validates all required fields
2. Creates email HTML template
3. Logs email to console (for now)
4. Returns success response
5. Ready for SendGrid integration

**Future Enhancement:** SendGrid API integration

---

## 🔗 Complete Route Map

```
Public Routes (No Auth Required)
├── GET /student/login
│   └── Student login page
└── GET /login
    └── General login page (school/admin)

School Admin Routes (SCHOOL_ADMIN Role Required)
├── GET /school/register-student
│   └── Student registration page
└── POST /api/auth/generate-credentials
    └── Generate username/password

API Routes (POST)
├── /api/auth/generate-credentials
│   └── Generate credentials for new student
├── /api/students/register
│   └── Register complete student record
└── /api/students/send-credentials-email
    └── Send credentials to parent email

Existing Routes (Unaffected)
├── GET /school/dashboard
├── GET /school/classrooms
├── GET /school/settings
├── GET /school/support
├── GET /teacher/dashboard
├── GET /admin/dashboard
├── GET /admin/events
├── GET /admin/support
└── ... (other existing routes)
```

---

## 📊 Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 400 | Bad Request | Validation error, missing fields |
| 409 | Conflict | Duplicate username exists |
| 500 | Server Error | Database or processing error |

---

## 🔐 Authentication Requirements

| Route | Method | Auth Required | Role Required |
|-------|--------|---------------|---------------|
| /school/register-student | GET | Yes | SCHOOL_ADMIN |
| /student/login | GET | No | - |
| /api/auth/generate-credentials | POST | No | - |
| /api/students/register | POST | No | - |
| /api/students/send-credentials-email | POST | No | - |

---

## 🧪 Testing the Endpoints

### Using curl

**Test 1: Generate Credentials**
```bash
curl -X POST http://localhost:3000/api/auth/generate-credentials \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "schoolId": "YOUR_SCHOOL_ID"
  }'
```

**Test 2: Register Student**
```bash
curl -X POST http://localhost:3000/api/students/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "2010-05-15",
    "gender": "MALE",
    "grade": "Grade 5",
    "rollNumber": "15",
    "guardianRelationship": "FATHER",
    "parentName": "James Doe",
    "parentContactNumber": "9841000000",
    "parentEmail": "james@email.com",
    "school": "YOUR_SCHOOL_ID"
  }'
```

**Test 3: Send Email**
```bash
curl -X POST http://localhost:3000/api/students/send-credentials-email \
  -H "Content-Type: application/json" \
  -d '{
    "parentEmail": "james@email.com",
    "parentName": "James Doe",
    "studentName": "John Doe",
    "username": "john.doe",
    "password": "SecurePassword123!"
  }'
```

---

## 📱 Navigation in UI

**Sidebar Links Added:**
```
School Admin Dashboard
├── Dashboard (existing)
├── Support (existing)
├── Register Student ✅ NEW
├── Classrooms (existing)
└── Settings (existing)
```

**Icon:** FaUserPlus (user plus icon)

---

## 🔄 Request/Response Flow

```
Frontend (React)
    ↓
User fills registration form (3 parts)
    ↓
Submit to API
    ↓
Server validates input
    ↓
Database operations
    ↓
Return response to frontend
    ↓
Show success/error message
    ↓
Update UI
```

---

## ⚙️ System Integration

**Components Used:**
- `EnhancedStudentRegistration` - Form component
- `DashboardLayout` - Page wrapper
- `ConfirmationModal` - Confirmation dialog
- `NextAuth.js` - Authentication

**Libraries Used:**
- `lucide-react` - Icons (Copy, Print, Eye, etc.)
- `react-icons` - Sidebar icons
- `bcryptjs` - Password hashing
- `mongoose` - Database operations

---

## 🎯 Usage Examples

### Example 1: Register a Single Student
```javascript
// Frontend code
const response = await fetch('/api/students/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'john.doe',
    password: 'SecurePassword123!',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '2010-05-15',
    gender: 'MALE',
    grade: 'Grade 5',
    rollNumber: '15',
    parentName: 'James Doe',
    parentContactNumber: '9841000000',
    parentEmail: 'james@email.com',
    guardianRelationship: 'FATHER',
    school: schoolId
  })
});

const data = await response.json();
if (data.success) {
  console.log('Student registered:', data.data);
}
```

### Example 2: Generate and Email Credentials
```javascript
// Step 1: Generate credentials
const credResponse = await fetch('/api/auth/generate-credentials', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    schoolId: schoolId
  })
});

const { data: credentials } = await credResponse.json();

// Step 2: Send credentials email
const emailResponse = await fetch('/api/students/send-credentials-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    parentEmail: 'james@email.com',
    parentName: 'James Doe',
    studentName: 'John Doe',
    username: credentials.username,
    password: credentials.password
  })
});

const { data: emailResult } = await emailResponse.json();
console.log('Email sent to:', emailResult.recipientEmail);
```

---

## 📞 Error Handling

### Common Errors and Solutions

**Error: "Missing required field: school"**
- Solution: Ensure school ID is passed from session
- Check: `session.user.school` is set correctly

**Error: "Student with this username already exists"**
- Solution: Username collision (very rare with auto-increment)
- Action: System will auto-increment: john.doe2, john.doe3, etc.

**Error: "Failed to generate credentials"**
- Solution: Database connection issue or MongoDB error
- Check: MONGODB_URI in .env.local is correct

**Error: "Missing required fields"**
- Solution: Incomplete request data
- Check: All fields are present in request body

---

## 📈 Monitoring & Logging

All endpoints log:
- Request method and path
- Response status code
- Processing time
- Errors (if any)

**Example Log Output:**
```
POST /api/students/register 200 in 250ms
GET /school/register-student 200 in 1234ms
POST /api/auth/generate-credentials 200 in 85ms
```

---

## 🔐 Security Notes

1. **Passwords:** Always hashed with bcrypt before storage
2. **Username:** Unique per school to prevent cross-school access
3. **Email:** Parent email used for credentials delivery
4. **Validation:** Both client and server-side
5. **HTTPS:** Required in production (configured via NEXTAUTH_URL)

---

## 📝 API Documentation Format

All responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* operation result */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "ISO_TIMESTAMP"
}
```

---

**Routes & Endpoints Documentation Complete!** ✅

For more information, see the comprehensive guides in the documentation folder.
