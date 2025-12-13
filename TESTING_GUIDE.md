# 🧪 SUBJECT MANAGEMENT SYSTEM - TESTING GUIDE

## Quick Start

### 1. Seed Initial Data
```bash
# Make sure you're logged in as SUPER_ADMIN first

# Then run this in the browser console or via curl:
curl -X POST http://localhost:3000/api/seed/subjects \
  -H "Cookie: your_session_cookie"
```

Or visit: `http://localhost:3000/api/seed/subjects` (GET to see stats)

This creates 8 global subjects:
- English, Mathematics, Science, Social Studies
- Computer Science, Physical Education, Art, Music

---

## Testing Pages

### 🔷 For SUPER_ADMIN

#### **Global Subjects Management**
- **URL**: `http://localhost:3000/admin/subjects`
- **Page**: Admin Subjects Dashboard
- **Features to Test**:
  - ✅ Create new global subject (subjectType = GLOBAL)
  - ✅ View all global subjects (worldwide)
  - ✅ Edit subject details
  - ✅ Toggle status (ACTIVE/INACTIVE)
  - ✅ Search by name/code
  - ✅ Verify school field is null for global subjects

**Test Scenario 1**: Create Global Subject
1. Login as SUPER_ADMIN
2. Go to `/admin/subjects`
3. Click "Create Global Subject"
4. Fill:
   - Name: "Physics"
   - Code: "PHY"
   - Type: "Global"
   - Academic Type: "Core"
5. Submit
6. Expected: Subject appears in list with school: null

**Test Scenario 2**: Deactivate Global Subject
1. In subjects list
2. Find any subject
3. Click status toggle
4. Expected: Status changes to INACTIVE (red)
5. Subject still visible but marked as inactive

---

### 🟢 For SCHOOL_ADMIN

#### **School Subjects Management**
- **URL**: `http://localhost:3000/school/subjects`
- **Page**: School Subjects Dashboard
- **Features to Test**:
  - ✅ View ALL global subjects (read-only)
  - ✅ Create custom school subjects
  - ✅ Edit custom subjects
  - ✅ Deactivate custom subjects
  - ✅ See "Global" section (cannot create there)
  - ✅ See "Custom" section (can manage here)

**Test Scenario 3**: Create Custom Subject
1. Login as SCHOOL_ADMIN
2. Go to `/school/subjects`
3. Click "Create Custom Subject"
4. Fill:
   - Name: "Advanced Physics"
   - Code: "PHY-ADV"
   - Academic Type: "Elective"
5. Submit
6. Expected: Subject appears in "Custom Subjects" section with school = yourSchoolId

**Test Scenario 4**: Cannot Create in Global Section
1. In School Subjects page
2. Look at "Global Subjects" section
3. Try to edit/delete any global subject
4. Expected: Buttons disabled or not visible (read-only)

---

#### **Grade Subject Assignment**
- **URL**: `http://localhost:3000/school/academic/Grade%2010/subjects`
- **Page**: Grade 10 Subject Management
- **Features to Test**:
  - ✅ See available subjects (global + custom)
  - ✅ Activate subject for this grade
  - ✅ Set grading parameters (full marks, pass marks)
  - ✅ Mark as compulsory/optional
  - ✅ Assign teacher (optional)
  - ✅ View activated subjects
  - ✅ Edit assignments
  - ✅ Deactivate assignments

**Test Scenario 5**: Activate Subject for Grade
1. Login as SCHOOL_ADMIN
2. Go to `/school/academic/Grade%2010/subjects`
3. Click "Add Subject"
4. Fill:
   - Subject: "Mathematics"
   - Compulsory: ✓ Yes
   - Full Marks: 100
   - Pass Marks: 40
   - Credit Hours: 3
5. Submit
6. Expected: Subject appears in grade's subjects grid
7. Can click to edit/deactivate

**Test Scenario 6**: Prevent Invalid Grading
1. Try to set Pass Marks > Full Marks (e.g., 100 full, 120 pass)
2. Click Save
3. Expected: Error message "Pass marks cannot be greater than full marks"

**Test Scenario 7**: View All Grades
1. Can access different grades via the URL:
   - `/school/academic/Grade%2010/subjects`
   - `/school/academic/Grade%2011/subjects`
   - `/school/academic/Grade%2012/subjects`
2. Each grade should have separate subject assignments
3. Expected: Changes in Grade 10 don't affect Grade 11

---

## API Testing (Advanced)

### Test 1: Create Global Subject (SUPER_ADMIN only)
```bash
curl -X POST http://localhost:3000/api/subjects \
  -H "Content-Type: application/json" \
  -H "Cookie: your_super_admin_session" \
  -d '{
    "name": "Physics",
    "code": "PHY",
    "subjectType": "GLOBAL",
    "academicType": "CORE",
    "description": "Physics"
  }'
```

**Expected Response** (201):
```json
{
  "success": true,
  "subject": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Physics",
    "code": "PHY",
    "subjectType": "GLOBAL",
    "school": null,
    "status": "ACTIVE"
  }
}
```

---

### Test 2: Create Custom Subject (SCHOOL_ADMIN)
```bash
curl -X POST http://localhost:3000/api/subjects \
  -H "Content-Type: application/json" \
  -H "Cookie: your_school_admin_session" \
  -d '{
    "name": "Advanced Chemistry",
    "code": "CHEM-ADV",
    "subjectType": "SCHOOL_CUSTOM",
    "academicType": "ELECTIVE"
  }'
```

**Expected Response** (201):
```json
{
  "success": true,
  "subject": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Advanced Chemistry",
    "code": "CHEM-ADV",
    "subjectType": "SCHOOL_CUSTOM",
    "school": "507f1f77bcf86cd799439000",
    "status": "ACTIVE"
  }
}
```

---

### Test 3: Get Subjects (Role-Based Visibility)
```bash
# As SUPER_ADMIN: See ALL subjects
curl http://localhost:3000/api/subjects \
  -H "Cookie: your_super_admin_session"
```

**Expected**: Returns global subjects + all schools' custom subjects

```bash
# As SCHOOL_ADMIN: See only global + own custom
curl http://localhost:3000/api/subjects \
  -H "Cookie: your_school_admin_session"
```

**Expected**: Returns global subjects + only THIS school's custom subjects

---

### Test 4: Activate Subject for Grade
```bash
curl -X POST http://localhost:3000/api/grades/Grade%2010/subjects \
  -H "Content-Type: application/json" \
  -H "Cookie: your_school_admin_session" \
  -d '{
    "subjectId": "507f1f77bcf86cd799439011",
    "isCompulsory": true,
    "fullMarks": 100,
    "passMarks": 40,
    "creditHours": 3
  }'
```

**Expected Response** (201):
```json
{
  "success": true,
  "assignment": {
    "_id": "507f1f77bcf86cd799439013",
    "subject": "507f1f77bcf86cd799439011",
    "grade": "Grade 10",
    "isCompulsory": true,
    "fullMarks": 100,
    "passMarks": 40,
    "status": "ACTIVE"
  }
}
```

---

### Test 5: Prevent Invalid Data
```bash
# Try to set pass marks > full marks
curl -X POST http://localhost:3000/api/grades/Grade%2010/subjects \
  -H "Content-Type: application/json" \
  -H "Cookie: your_school_admin_session" \
  -d '{
    "subjectId": "507f1f77bcf86cd799439011",
    "fullMarks": 100,
    "passMarks": 120
  }'
```

**Expected Response** (400):
```json
{
  "error": "Pass marks cannot be greater than full marks"
}
```

---

### Test 6: Multi-Tenancy Isolation
```bash
# As SCHOOL_ADMIN of School A:
# Try to access SCHOOL_ADMIN of School B's custom subject
curl http://localhost:3000/api/subjects/507f1f77bcf86cd799439014 \
  -H "Cookie: your_school_a_session"
```

**Expected Response** (403 or 404):
```json
{
  "error": "Unauthorized"
}
```

(You cannot see or modify other schools' custom subjects)

---

### Test 7: Cannot Duplicate Subject Code
```bash
# First request (succeeds)
curl -X POST http://localhost:3000/api/subjects \
  -H "Content-Type: application/json" \
  -H "Cookie: your_school_admin_session" \
  -d '{
    "name": "Biology",
    "code": "BIO",
    "subjectType": "SCHOOL_CUSTOM"
  }'

# Second request with same code (fails)
curl -X POST http://localhost:3000/api/subjects \
  -H "Content-Type: application/json" \
  -H "Cookie: your_school_admin_session" \
  -d '{
    "name": "Advanced Biology",
    "code": "BIO",
    "subjectType": "SCHOOL_CUSTOM"
  }'
```

**Expected Response** (400):
```json
{
  "error": "Subject code already exists in this school"
}
```

---

## 🔍 MongoDB Verification

After testing, verify data in MongoDB:

```javascript
// See all global subjects
db.subjects.find({ subjectType: "GLOBAL" })

// See all custom subjects for a school
db.subjects.find({ 
  subjectType: "SCHOOL_CUSTOM",
  school: ObjectId("your_school_id")
})

// See grade assignments
db.gradesubjects.find({ grade: "Grade 10" })

// See unique subjects per grade
db.gradesubjects.find(
  { grade: "Grade 10" },
  { subject: 1, isCompulsory: 1, fullMarks: 1, passMarks: 1 }
)
```

---

## ✅ Success Checklist

- [ ] Seed creates 8 global subjects
- [ ] SUPER_ADMIN can create global subjects
- [ ] SCHOOL_ADMIN can create custom subjects
- [ ] SCHOOL_ADMIN cannot create global subjects
- [ ] SCHOOL_ADMIN can see all global + own custom subjects
- [ ] SCHOOL_ADMIN cannot see other schools' custom subjects
- [ ] Can activate subjects for different grades
- [ ] Cannot activate same subject twice for same grade
- [ ] Pass marks validation works (passMarks ≤ fullMarks)
- [ ] Subject code is unique per school
- [ ] Status toggle works (ACTIVE/INACTIVE)
- [ ] Soft delete preserves data
- [ ] Different schools can have same subject code
- [ ] Global subjects have school: null
- [ ] Custom subjects have school: schoolId

---

## 🐛 Troubleshooting

### "Unauthorized" Error
- Make sure you're logged in as the correct role
- Clear browser cookies if switching between accounts
- Check session is valid with correct role in database

### "Subject already exists"
- Check for duplicate codes in the same school
- Different schools can have same code
- Try with unique code like "MATH-ADV" instead of "MATH"

### "Pass marks cannot be greater than full marks"
- Ensure passMarks ≤ fullMarks
- Example: fullMarks: 100, passMarks: 40 ✓
- Example: fullMarks: 100, passMarks: 120 ✗

### Components not loading
- Check if you're logged in
- Verify role is correct (SUPER_ADMIN for /admin/subjects, SCHOOL_ADMIN for /school/subjects)
- Check browser console for errors

---

## 🚀 Next Steps After Testing

1. **Embed in Dashboard**: Add links to subject management in main dashboard
2. **Teacher Assignment**: Integrate teacher selection in GradeSubjectAssignment
3. **Marks System**: Create marks entry/viewing using GradeSubject reference
4. **Reports**: Generate academic reports by subject and grade
5. **Bulk Operations**: Add CSV import for creating multiple subjects

---

**Happy Testing! 🎓**
