# School Management System (LMS)

A comprehensive Learning Management System built with Next.js, MongoDB, and NextAuth. Designed for schools to manage students, teachers, classrooms, events, marks, and attendance.

## 🎯 Features

### Admin Dashboard

- School management and approval
- Teacher and student management
- Event creation and monitoring
- Classroom management
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

- View assigned classrooms and content
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
- **Student** - Student details with classroom assignment
- **Teacher** - Teacher profile and subjects
- **Classroom** - Class with students and subjects
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

## 📝 Scripts

Helpful scripts in `/scripts` directory:

- `check_students.js` - Verify student data
- `check_users.js` - Check user accounts
- `check_attendance_db.js` - Debug attendance
- `reset_password.js` - Reset user password
- `approve_school.js` - Approve school for admin

## 🔒 Security Features

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
