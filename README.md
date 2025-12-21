# School Management System (LMS)

A comprehensive Learning Management System built with Next.js, MongoDB, and NextAuth. Designed for schools to manage students, teachers, events, marks, and attendance.

## 🎯 Features

### Admin Dashboard

- School management and approval
- Teacher and student management
- Event creation and monitoring
- Attendance and marks tracking
- Event capacity monitoring

### Teacher Dashboard

- Subject and chapter management
- Create multiple choice questions (MCQs)
- Share notes with class
- Track student attendance
- View and manage marks
- Monitor student participation

### Student Dashboard

- View class content (chapters, questions, notes)
- Participate in events
- Track personal attendance
- View marks and grades
- Check participation status
- Event eligibility checker

### Core Features

- **Authentication**: NextAuth with email/password and session management
- **Events System**: Create, manage, and track student participation
- **Marks Management**: Track assessments and auto-calculate grades
- **Attendance**: Mark and monitor student/teacher attendance
- **Activity Logs**: Track all system activities
- **Multi-role Support**: Admin, Teacher, Student roles with permission-based access

## 🛠️ Tech Stack

- **Frontend**: React 19, Next.js 16
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Icons**: React Icons
- **Validation**: Custom validation utilities

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB instance (local or Atlas)
- GitHub account (for collaboration)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/rajesh730/LMS.git
cd LMS
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/schoolproject
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/schoolproject

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here-generate-one
NEXTAUTH_URL=http://localhost:3000

# Application
NODE_ENV=development
```

**To generate NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## 📁 Project Structure

```
LMS/
├── app/
│   ├── api/              # API routes (endpoints)
│   ├── admin/            # Admin dashboard
│   ├── teacher/          # Teacher dashboard
│   ├── student/          # Student dashboard
│   ├── school/           # School management
│   └── (auth)/           # Login/Register pages
├── components/           # Reusable React components
├── models/              # Mongoose schemas
├── lib/                 # Utility functions
├── public/              # Static assets
├── scripts/             # Helper scripts
└── middleware.js        # Request handling

```

## 👥 User Roles & Access

### Admin

- Approve/manage schools
- Create and manage events
- View system analytics
- Manage all users

### Teacher

- Create subjects and chapters
- Add MCQs and notes
- View student marks
- Mark attendance
- Track participation requests

### Student

- Participate in events
- View marks and grades
- Check attendance records
- See personal notes and resources

## 🔌 Key API Endpoints

### Authentication

- `POST /api/auth/callback/credentials` - Login
- `GET /api/auth/session` - Get current session
- `POST /api/register` - Register new user

### Students

- `GET /api/students` - List students
- `GET /api/student/class-content` - Get student's class content
- `GET /api/student/eligible-events` - Get eligible events

### Teachers

- `GET /api/teacher/subjects` - List teacher's subjects
- `GET /api/teacher/subjects/[id]/content` - Get subject content
- `POST /api/teacher/chapters` - Create chapter
- `POST /api/teacher/questions` - Add MCQ
- `POST /api/teacher/notes` - Share note

### Events

- `GET /api/events` - List all events
- `POST /api/events` - Create event
- `POST /api/events/[id]/participate` - Request participation
- `GET /api/events/[id]/status` - Check participation status

### Marks

- `GET /api/marks` - Get marks
- `POST /api/marks` - Create mark record
- `PUT /api/marks/[id]` - Update mark

### Attendance

- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/monthly` - Monthly report

## 🗄️ Database Models

- **User** - Base user model with email/password
- **Student** - Student details
- **Teacher** - Teacher profile and subjects
- **Subject** - Subject taught by teacher
- **Chapter** - Course chapters
- **Question** - MCQ questions
- **Event** - School events
- **Marks** - Student assessment records
- **Attendance** - Attendance tracking
- **ParticipationRequest** - Event participation requests
- **TeacherNote** - Notes shared with class
- **ActivityLog** - System activity tracking

## 🧪 Testing

Run the test scripts to verify functionality:

```bash
# Test complete flow
node test_complete_flow.js

# Test participation system
node test_participation.js

# Test teacher attendance
node test_teacher_attendance.js
```

## Security Features

- Password hashing with bcryptjs
- Session-based authentication (NextAuth)
- Role-based access control
- Rate limiting on APIs
- Input validation on all routes
- Secure password generation

## 🐛 Troubleshooting

### MongoDB Connection Error

```
Error: connect ECONNREFUSED
```

- Ensure MongoDB is running: `mongod`
- Check `MONGODB_URI` in `.env.local`
- For Atlas, verify IP whitelist

### NextAuth Error

```
Error: NEXTAUTH_SECRET not set
```

- Generate secret: `openssl rand -base64 32`
- Add to `.env.local`

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## 📚 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Mongoose Documentation](https://mongoosejs.com)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Tailwind CSS](https://tailwindcss.com)

## 🤝 Contributing

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Commit: `git commit -m "Add feature: description"`
4. Push: `git push origin feature/your-feature`
5. Create a Pull Request

## 📞 Support

For issues or questions:

1. Check existing issues on GitHub
2. Create a new issue with detailed description
3. Contact the development team

## 📄 License

This project is proprietary. All rights reserved.

## 👨‍💻 Authors

- **Rajesh Pandey** - Initial Development
- **Partner Developer** - To be added

---

**Last Updated**: December 9, 2025

Happy coding! 🚀

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## 📚 Technical Implementation & Architecture (Deep Dive)

### 1. Student Lifecycle & Promotion Engine

The system implements a robust student lifecycle management system handling transitions between grades and academic years.

#### **Promotion Logic (`StudentPromotionManager.js`)**
- **Modes**:
  - **Single Mode**: Granular control to promote/demote specific students.
  - **Bulk Mode**: Automated logic to map all students from `Grade N` to `Grade N+1`.
- **Operations**:
  - **Promotion**: Moving a student to a higher grade.
  - **Demotion**: Moving a student to a lower grade (UI indicates with warning colors).
  - **Graduation**: Marking students as `alumni` when they complete the final grade.
- **Data Integrity**:
  - Before any status change, a snapshot is created in `StudentAcademicRecord`.
  - This ensures a permanent history of "Grade 9 - 2024 - Promoted" exists even after the student moves to Grade 10.

#### **Historical Tracking (`StudentAcademicRecord` Model)**
Every time a student is promoted, demoted, or modified, a record is created:
- **Schema**:
  - `student`: Reference to Student ID.
  - `academicYear`: The year *from which* they are moving.
  - `grade`: The grade they were in.
  - `finalStatus`: `promoted`, `demoted`, `retained`, `graduated`.
  - `promotedToGrade`: The destination grade.
  - `rollNumber`: Snapshot of their roll number at that time.

### 2. Academic Year Architecture

The system supports a hybrid model for Academic Years to allow centralized control while maintaining school autonomy.

#### **Global vs. Local Years**
- **Global Years (`isGlobal: true`)**:
  - Created by Super Admin.
  - Visible to ALL schools.
  - Schools "activate" these years rather than creating duplicates.
  - Useful for standardized national academic calendars.
- **Local Years**:
  - Created by individual School Admins.
  - Only visible to the creating school.
  - `school` field is populated (unlike Global years where `school` is null).

#### **Data Flow**
1. **Fetching**: API `/api/school/academic-years` fetches both Global years AND Local years for the logged-in school.
2. **Activation**: Schools select a year to be "Active". This drives the current context for Attendance and Marks.
3. **Archival**: Past years remain accessible for generating historical transcripts via the "View Records" feature.

### 3. Student Status System

Students have a state machine controlling their access and visibility:
- **Active**: Normal access, appears in attendance and grade lists.
- **Inactive**: Temporarily disabled (e.g., unpaid fees).
- **Alumni**: Graduated students. Preserved for historical records but removed from daily lists.
- **Suspended**: Restricted access.

### 4. Key Database Models (Micro-Details)

#### **Student**
- `currentGrade`: The student's live location.
- `currentSection`: Current section assignment.
- `currentStatus`: Enum (`active`, `inactive`, `alumni`, `suspended`).
- `academicHistory`: Virtual link to `StudentAcademicRecord`.

#### **AcademicYear**
- `name`: e.g., "2024-2025".
- `startDate` / `endDate`: Defines the session boundaries.
- `isGlobal`: Boolean flag for Super Admin scope.
- `status`: `active` | `upcoming` | `past`.

#### **Subject**
- `isGlobal`: Standard subjects (Math, Science) created by Super Admin.
- `school`: Null for global subjects.
- `curriculumCode`: Unique identifier for mapping.

### 5. API Architecture

- **`/api/students/promote`**:
  - **Method**: POST
  - **Transaction**:
    1. Validate input.
    2. Create `StudentAcademicRecord` for current state.
    3. Update `Student` document with new `grade` and `status`.
    4. Return success/failure stats.

- **`/api/school/academic-years/[id]/records`**:
  - **Method**: GET
  - **Purpose**: Fetches all `StudentAcademicRecord` entries linked to a specific Academic Year ID.
  - **Usage**: Used in the "View Records" modal to show historical class lists.

---

## 📝 Roadmap: Examination & Result Management System

This section outlines the plan for implementing a comprehensive examination and grading system.

### 1. Core Entities

#### **Exam Model (`models/Exam.js`)**
- **Purpose**: Groups assessments under a unified event (e.g., "First Term 2024").
- **Key Fields**:
  - `term`: Enum (`FIRST_TERM`, `FINAL_TERM`, etc.).
  - `weightage`: Percentage contribution to the final year grade (e.g., Final = 50%).
  - `status`: Lifecycle management (`UPCOMING` -> `PUBLISHED`).

#### **Grading Scale (`models/GradingScale.js`)**
- **Purpose**: Configurable logic to convert marks to Grades/GPA.
- **Structure**:
  - Array of ranges (e.g., 90-100% = A+ = 4.0).
  - Allows schools to define their own grading standards (Standard vs. Honors).

### 2. Marks Entry Workflow

#### **Teacher Interface (`BulkMarksEntry.js`)**
- **Problem**: Current system requires entering marks one-by-one.
- **Solution**: Grid-based entry system.
  - **Select**: Exam -> Class -> Subject.
  - **View**: Table of all students in that class.
  - **Action**: Tab-to-navigate inputs for rapid data entry.
  - **Validation**: Prevent entering marks > total marks.

### 3. Result Processing Engine

#### **Grade Calculation Logic**
1. **Fetch Marks**: Get all marks for a student for a specific Exam.
2. **Calculate Subject Grades**: Apply `GradingScale` to each subject's mark.
3. **Calculate GPA**: Average of subject GPAs (weighted by credit hours if applicable).
4. **Generate Rank**: Compare total marks against classmates.

#### **Report Card Generation**
- **Component**: `StudentReportCard.js`
- **Features**:
  - Displays marks, grades, and GPA for a specific Exam.
  - Shows attendance percentage for that term.
  - Teacher remarks section.
  - Printable layout (CSS `@media print`).

### 4. Student & Parent View

- **Results Portal**:
  - Students can only view results when Exam status is `PUBLISHED`.
  - Historical view to see past term results.
  - "Download PDF" option for report cards.

### 5. Implementation Steps

1.  **Backend**:
    - Create `Exam` and `GradingScale` models (Done).
    - Create API `/api/exams` for CRUD operations.
    - Create API `/api/marks/bulk` for batch updates.
2.  **Frontend (Admin)**:
    - "Exam Management" page to schedule exams.
    - "Grading Configuration" page.
3.  **Frontend (Teacher)**:
    - "Marks Entry" grid view.
4.  **Frontend (Student)**:
    - "My Results" page.
