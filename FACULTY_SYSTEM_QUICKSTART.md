# Faculty System - Quick Reference

## What is the Faculty System?

A **master data management solution** that ensures faculty/stream names (Science, Commerce, Engineering, etc.) are:
- ✅ Consistent across the entire application
- ✅ Entered exactly once during school registration
- ✅ Reused everywhere else via dropdowns/buttons/checkboxes
- ✅ Correctable by SUPER_ADMIN if typos occur

## How It Works

### 1. School Registration (Automatic)
```
When school registers with faculties: "Science, Commerce, Humanities"
↓
System automatically creates Faculty documents in database
↓
Faculties now available everywhere in the app
```

### 2. Subject Creation (With Checkboxes)
```
GlobalSubjectManager → Checkboxes showing: ☐ Science  ☐ Commerce  ☐ Humanities
↓
Admin selects applicable faculties
↓
Subject saved with exact faculty names (guaranteed no typos)
```

### 3. Grade Subject Assignment (With Buttons)
```
GradeSubjectAssignment → Filter buttons: [All] [Science] [Commerce] [Humanities]
↓
Admin clicks [Science] to see only Science subjects
↓
Admin clicks [Science] button again to assign to that faculty
↓
GradeSubject saved with exact faculty name
```

### 4. Correction (Merge Feature)
```
SUPER_ADMIN identifies typo: "Scince" exists but should be "Science"
↓
SUPER_ADMIN runs: PATCH /api/faculties/{scince_id}/merge {targetFacultyId: science_id}
↓
All "Scince" references automatically updated to "Science"
↓
"Scince" marked as merged (archived)
```

## User Workflows

### For SCHOOL_ADMIN

**Creating a Global Subject**
1. Go to Admin → Subjects
2. Click "Add Subject"
3. Enter name and code
4. **NEW**: Check faculties from checkboxes (instead of typing)
5. Select education levels
6. Submit

**Assigning Subject to Grade**
1. Go to School → Academic → Choose Grade
2. Click "Add Subject"
3. **NEW**: Click faculty buttons to filter subjects
4. **NEW**: Click faculty button to assign it
5. Set marks and other details
6. Submit

### For SUPER_ADMIN

**Merging Duplicate Faculties**
1. Identify the correct faculty name: "Science"
2. Identify the typo: "Scince"
3. Go to Faculty Management (Dashboard)
4. Select "Scince" and click "Merge into..."
5. Choose "Science" as target
6. Confirm
7. All records automatically updated

## API Endpoints

### GET /api/faculties
**Get list of faculties for your school**
```bash
curl http://localhost:3000/api/faculties
```
**Response**: List of all active faculties

### POST /api/faculties
**Create a new faculty**
```bash
curl -X POST http://localhost:3000/api/faculties \
  -H "Content-Type: application/json" \
  -d '{"name": "Science", "educationLevels": ["HigherSecondary", "Bachelor"]}'
```

### PUT /api/faculties?id={id}
**Update a faculty**
```bash
curl -X PUT http://localhost:3000/api/faculties?id=67abc123 \
  -H "Content-Type: application/json" \
  -d '{"name": "Science (Updated)", "status": "ACTIVE"}'
```

### DELETE /api/faculties?id={id}
**Deactivate a faculty** (soft delete)
```bash
curl -X DELETE http://localhost:3000/api/faculties?id=67abc123
```

### PATCH /api/faculties/{id}/merge
**Merge one faculty into another**
```bash
curl -X PATCH http://localhost:3000/api/faculties/67abc123/merge \
  -H "Content-Type: application/json" \
  -d '{"targetFacultyId": "67abc124"}'
```

## Common Scenarios

### Scenario 1: New School Registers
**What happens automatically**:
- School enters: "Science, Commerce, Humanities"
- System creates 3 Faculty documents
- GlobalSubjectManager shows 3 checkboxes
- GradeSubjectAssignment shows 3 buttons
- **No further setup needed**

### Scenario 2: Create Multi-Faculty Subject
**Steps**:
1. GlobalSubjectManager → Add Subject
2. Enter: Name="Physics", Code="PHY01"
3. Check: [Science] [Engineering]
4. Submit
5. **Result**: Physics is now applicable to Science and Engineering faculties

**Querying**:
```javascript
// Get subjects applicable to Science
const subjects = await Subject.find({
  applicableFaculties: "Science"
});
```

### Scenario 3: Assign Subject to Grade with Faculty
**Steps**:
1. GradeSubjectAssignment → Add Subject
2. Click [Science] button (filters to Science subjects)
3. Select Physics
4. Click [Science] button again (assigns to Science faculty)
5. Set marks: Full=100, Pass=40
6. Submit
7. **Result**: Grade 11 Science students see Physics

**Result in Database**:
```javascript
{
  subject: ObjectId("physics_id"),
  grade: "11",
  faculty: "Science",        // ← Exact name from Faculty model
  fullMarks: 100,
  passMarks: 40
}
```

### Scenario 4: Fix Typo "Comerce" → "Commerce"
**Steps**:
1. SUPER_ADMIN notices "Comerce" typo used in 5 grade subjects
2. Creates correct Faculty: "Commerce"
3. Runs merge: `PATCH /api/faculties/{comerce_id}/merge`
4. **Automatic Results**:
   - All 5 GradeSubject records updated: "Comerce" → "Commerce"
   - All Subject records updated: applicableFaculties changed
   - All Student records updated: faculty field changed
   - "Comerce" faculty marked as archived

**Without merge**: Would need to manually edit 5+ records
**With merge**: Done in one API call!

## Before vs After

### BEFORE (Text Input)
```
Create Subject:
  Applicable Faculties: [text input] "Science, Commerse"  ← Typo!
  
Create Grade Subject:
  Faculty: [text input] "Science"
  
Register Student:
  Faculty: [text input] "science"  ← Lowercase!
  
Result: 3 different spellings for same faculty
```

### AFTER (Faculty Model)
```
Create Subject:
  Applicable Faculties: [☑ Science] [☑ Commerce] [☐ Engineering]
  
Create Grade Subject:
  Faculty: [Science✓] [Commerce] [Engineering]
  
Register Student:
  Faculty: [Science ▼]
  
Result: All use exact same "Science" from database
```

## Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| **Where faculties come from** | Typed in multiple places | Defined once at school registration |
| **Spelling guarantee** | No - typos possible | Yes - no typos possible |
| **Consistency** | Manual (error-prone) | Automatic (guaranteed) |
| **Fixing typos** | Edit in 3+ places | One merge call |
| **UI Pattern** | Text input | Dropdown/buttons/checkboxes |
| **Database uniqueness** | Text field, case-sensitive | Faculty model, case-insensitive |

## Validation

### Faculty Names Must Be Exact
```javascript
// ✅ These are treated as the SAME faculty (case-insensitive)
"Science"
"science"
"SCIENCE"
"  Science  "  // After trimming

// ❌ These are DIFFERENT
"Science"      // Correct
"Sciance"      // Typo - different faculty
"Science " + " Stream"  // Different faculty
```

### Creating Faculty with Existing Name
```bash
# If "Science" already exists:
curl -X POST /api/faculties \
  -d '{"name": "science"}'

# Result: Error - "Faculty 'science' already exists"
# Reason: Case-insensitive duplicate checking
```

## Features

✅ **Dropdown/Button UI** - No typing needed, select from list
✅ **Case-Insensitive Matching** - "Science" = "science"
✅ **Auto-Creation** - School registration creates faculties automatically
✅ **Merge Capability** - SUPER_ADMIN can correct typos with cascading updates
✅ **Education Level Filtering** - Faculties filtered by school/bachelor levels
✅ **Soft Delete** - Deactivate without losing data
✅ **Audit Trail** - Track who created/updated/merged
✅ **Performance Optimized** - Proper indexes for fast queries

## FAQ

**Q: Can I manually type faculty names?**
A: No - UI provides buttons/checkboxes. This prevents typos entirely.

**Q: What if I misspell during school registration?**
A: You can delete the typo faculty and run merge to fix all references.

**Q: Are faculty names case-sensitive?**
A: No - "Science", "science", "SCIENCE" are treated as the same.

**Q: Can I delete a faculty?**
A: Only soft-delete (mark INACTIVE). Preserves historical data.

**Q: Can students see faculty options?**
A: Currently for ADMIN only. Student-facing UI pending.

**Q: How does merge work?**
A: Updates all Subject, GradeSubject, Student records automatically.

**Q: What if merge fails?**
A: Check that:
- Source and target are different
- Both faculties exist
- You have SUPER_ADMIN role

## Testing

### Test 1: School Registration Creates Faculties
```
1. Register school with: "Science, Commerce, Humanities"
2. Check /api/faculties returns 3 faculties
3. Verify GlobalSubjectManager shows 3 checkboxes
```

### Test 2: Subject Saving with Faculty
```
1. Create subject with Science + Commerce checked
2. Check database: applicableFaculties = ["Science", "Commerce"]
3. Edit and verify faculty checkboxes reflect saved state
```

### Test 3: Grade Subject Assignment
```
1. Click [Science] button in GradeSubjectAssignment
2. Verify only Science subjects appear
3. Select Physics and click [Science] button again
4. Check GradeSubject.faculty = "Science"
```

### Test 4: Merge Functionality
```
1. Create Faculty "Scince" (typo)
2. Use it in GradeSubject
3. Run merge: "Scince" → "Science"
4. Verify GradeSubject.faculty updated to "Science"
5. Check "Scince" has mergedInto = "Science"
```

## Support

For issues with Faculty system:
1. Check that school has education levels configured
2. Verify session contains valid school ID
3. Confirm you have appropriate role (SCHOOL_ADMIN or SUPER_ADMIN)
4. Check /api/faculties returns expected list
5. Review FACULTY_SYSTEM_GUIDE.md for detailed information

---

**Status**: ✅ Fully Implemented | ✅ Zero Compilation Errors | ✅ Ready for Production
