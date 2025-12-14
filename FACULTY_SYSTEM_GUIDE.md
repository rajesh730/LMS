# Faculty System Implementation Guide

## Overview

The Faculty System is a **master data management solution** that ensures faculty/stream names are consistent across the entire E-Grantha application. It solves the critical problem of spelling inconsistencies (e.g., "Science" vs "science" vs "Scince") that could occur when faculty names are entered as text in multiple places.

## Problem Solved

### Before Faculty System
- Faculty names were text inputs in multiple places:
  - Subject creation (`applicableFaculties` field)
  - Grade subject assignment (`faculty` field)
  - Student registration (`faculty` field)
- No enforcement of exact spelling across the system
- Typos could cause data mismatches
- No single source of truth for faculty list

### After Faculty System
- **Single Faculty Model** serves as master source of truth
- **Dropdown/Button UI** prevents typos by enforcing exact names
- **Case-insensitive matching** handles capitalization variations
- **Merge capability** allows SUPER_ADMIN to correct errors

## Architecture

### 1. Faculty Model

**File**: [models/Faculty.js](models/Faculty.js)

**Purpose**: Master registry of all faculties for a school

**Key Fields**:
```javascript
{
  name: String,                          // "Science", "Commerce", "Engineering"
  normalizedName: String,                // "science" (lowercase for matching)
  school: ObjectId,                      // Which school owns this faculty
  educationLevels: [String],            // ["HigherSecondary", "Bachelor"]
  status: String,                        // "ACTIVE" or "INACTIVE"
  mergedInto: ObjectId,                 // If merged, points to the new faculty
  createdBy: ObjectId,                  // SUPER_ADMIN or SCHOOL_ADMIN
  updatedBy: ObjectId,                  // Last person who updated
  timestamps: true                      // createdAt, updatedAt
}
```

**Unique Constraints**:
- `{normalizedName: 1, school: 1}` - Faculty names unique per school (case-insensitive)

**Indexes**:
- `{school: 1, status: 1}` - Fast queries by school
- `{educationLevels: 1, school: 1, status: 1}` - Filter by education level

**Pre-save Middleware**:
- Automatically generates `normalizedName` from `name` field
- Ensures case-insensitive matching works correctly

### 2. API Routes

#### GET /api/faculties
**Purpose**: Fetch list of active faculties for logged-in school

**Authorization**: SUPER_ADMIN, SCHOOL_ADMIN

**Response**:
```json
{
  "success": true,
  "data": {
    "faculties": [
      {
        "_id": "67abc123...",
        "name": "Science",
        "normalizedName": "science",
        "educationLevels": ["HigherSecondary", "Bachelor"],
        "status": "ACTIVE"
      },
      {
        "_id": "67abc124...",
        "name": "Commerce",
        "normalizedName": "commerce",
        "educationLevels": ["HigherSecondary"],
        "status": "ACTIVE"
      }
    ]
  }
}
```

#### POST /api/faculties
**Purpose**: Create new faculty with duplicate prevention

**Authorization**: SUPER_ADMIN, SCHOOL_ADMIN

**Request**:
```json
{
  "name": "Science",
  "educationLevels": ["HigherSecondary", "Bachelor"]
}
```

**Features**:
- Case-insensitive duplicate checking
- Auto-normalizes name
- Prevents creation of "Scince" if "Science" already exists

#### PUT /api/faculties?id={id}
**Purpose**: Update faculty details

**Request**:
```json
{
  "name": "Science (New Name)",
  "educationLevels": ["HigherSecondary"],
  "status": "ACTIVE"
}
```

#### DELETE /api/faculties?id={id}
**Purpose**: Soft-delete faculty (mark as INACTIVE)

**Authorization**: SUPER_ADMIN only

**Validation**:
- Checks if faculty is in use in GradeSubject assignments
- Prevents deletion if in use

#### PATCH /api/faculties/{id}/merge
**Purpose**: Merge one faculty into another (for corrections)

**Authorization**: SUPER_ADMIN only

**Request**:
```json
{
  "targetFacultyId": "67abc124..."
}
```

**Example**: Merge "Scince" (typo) into "Science" (correct)

**Cascading Updates**:
```
Faculty (Scince) → Set mergedInto = Faculty (Science), status = INACTIVE

Subject model → Update applicableFaculties: "Scince" → "Science"
GradeSubject model → Update faculty: "Scince" → "Science"
Student model → Update faculty: "Scince" → "Science"
```

**Result**: All records using the old name are automatically updated

### 3. School Registration Integration

**File**: [app/api/register/route.js](app/api/register/route.js)

**When School Registers**:
1. School provides faculties as comma-separated text:
   - `highSchoolFaculty`: "Science, Commerce, Humanities"
   - `bachelorFaculties`: "Science, Commerce, Engineering"

2. System automatically creates Faculty documents:
   ```javascript
   // For each faculty from school registration
   const faculty = new Faculty({
     name: "Science",                    // Trimmed from input
     normalizedName: "science",          // Auto-generated
     school: schoolId,                   // Associated with school
     educationLevels: ["HigherSecondary", "Bachelor"],  // Assigned based on source
     status: "ACTIVE"
   });
   ```

3. Duplicate handling:
   - If "Science" already exists, skips creation (no error)
   - Uses `insertMany` with `{ ordered: false }` for bulk creation

## UI Component Updates

### 1. GlobalSubjectManager

**File**: [components/GlobalSubjectManager.js](components/GlobalSubjectManager.js)

**Change**: Text input → Faculty Checkboxes

**Before**:
```jsx
<input
  type="text"
  placeholder="Applicable Faculties (comma-separated...)"
  value={formData.applicableFaculties.join(", ")}
  onChange={(e) => setFormData({...})}
/>
```

**After**:
```jsx
<div className="flex flex-wrap gap-3">
  {faculties.map((faculty) => (
    <label key={faculty._id}>
      <input
        type="checkbox"
        checked={formData.applicableFaculties.includes(faculty.name)}
        onChange={(e) => {
          if (e.target.checked) {
            setFormData({...formData, applicableFaculties: [...formData.applicableFaculties, faculty.name]})
          }
        }}
      />
      {faculty.name}
    </label>
  ))}
</div>
```

**Benefits**:
- No typos possible - uses exact faculty names from database
- Visual checkboxes instead of text parsing
- Shows all available faculties
- "Leave empty for all faculties" option

### 2. GradeSubjectAssignment

**File**: [components/GradeSubjectAssignment.js](components/GradeSubjectAssignment.js)

**Changes**:
1. **Faculty Filter** - Text input → Toggle buttons
   - Buttons: `[All] [Science] [Commerce] [Engineering]`
   - Click to filter available subjects by faculty
   - Visual feedback of selected button

2. **Faculty Assignment** - Text input → Button selection
   - Same button interface in the form
   - Select one faculty for the grade subject
   - Visual indication of selected faculty

**Before**:
```jsx
<input
  type="text"
  placeholder="e.g., Science, Commerce, Engineering"
  value={selectedFaculty}
  onChange={(e) => setSelectedFaculty(e.target.value.trim())}
/>
```

**After**:
```jsx
<div className="flex flex-wrap gap-2">
  <button
    onClick={() => setSelectedFaculty("")}
    className={selectedFaculty === "" ? "bg-blue-600" : "bg-slate-700"}
  >
    All
  </button>
  {faculties.map((faculty) => (
    <button
      key={faculty._id}
      onClick={() => setSelectedFaculty(faculty.name)}
      className={selectedFaculty === faculty.name ? "bg-blue-600" : "bg-slate-700"}
    >
      {faculty.name}
    </button>
  ))}
</div>
```

**Smart Filtering**:
- Shows faculties only for current education level
- Subjects filtered by: education level + selected faculty
- Prevents assigning irrelevant subjects

## Data Flow

### School Registration Flow
```
School Registration Form
  ↓
User enters: "Science, Commerce, Humanities"
  ↓
API creates Faculty documents:
  - Faculty(name="Science", educationLevels=["HigherSecondary", "Bachelor"])
  - Faculty(name="Commerce", educationLevels=["HigherSecondary"])
  - Faculty(name="Humanities", educationLevels=["HigherSecondary"])
  ↓
Faculties now available in dropdowns everywhere
```

### Subject Creation Flow
```
GlobalSubjectManager
  ↓
Fetch /api/faculties → Get list of Faculty documents
  ↓
Display checkboxes for each faculty
  ↓
User checks: [Science] [Commerce]
  ↓
POST /api/subjects {applicableFaculties: ["Science", "Commerce"]}
  ↓
Subject saved with exact faculty names
```

### Grade Subject Assignment Flow
```
GradeSubjectAssignment
  ↓
Fetch /api/faculties → Get list of Faculty documents
  ↓
Display buttons: [All] [Science] [Commerce]
  ↓
User clicks [Science]
  ↓
Filter subjects to show only Science-applicable ones
  ↓
User selects subject and clicks [Science] button again to assign
  ↓
POST /api/grades/{grade}/subjects {subjectId, faculty: "Science", ...}
  ↓
GradeSubject saved with exact faculty name
```

## Correction Workflow (SUPER_ADMIN)

### Scenario: Fix "Scince" typo

1. **Identify the Problem**
   - SUPER_ADMIN sees "Scince" in use
   - Creates "Science" correctly
   - Now has both "Scince" (wrong) and "Science" (correct)

2. **Merge Faculties**
   ```
   PATCH /api/faculties/{scince_id}/merge
   {
     "targetFacultyId": "{science_id}"
   }
   ```

3. **Automatic Cascade Update**
   - Subject.applicableFaculties: "Scince" → "Science"
   - GradeSubject.faculty: "Scince" → "Science"
   - Student.faculty: "Scince" → "Science"

4. **Result**
   - "Scince" marked as INACTIVE with `mergedInto: science_id`
   - All references updated to "Science"
   - Data consistency restored

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Spelling** | Text input (error-prone) | Dropdown/checkbox (no typos) |
| **Consistency** | Scattered across models | Single source of truth |
| **Corrections** | Manual updates in multiple places | Automatic cascading merge |
| **Case Handling** | Case-sensitive | Case-insensitive matching |
| **Data Quality** | High risk of mismatches | Guaranteed consistency |

## Database Queries

### Find all faculties for a school
```javascript
const faculties = await Faculty.find({
  school: schoolId,
  status: "ACTIVE"
});
```

### Find subject applicable to a faculty
```javascript
const subjects = await Subject.find({
  applicableFaculties: "Science",
  educationLevel: "HigherSecondary"
});
```

### Find grade subjects by faculty
```javascript
const gradeSubjects = await GradeSubject.find({
  faculty: "Science",
  grade: "10"
});
```

### Check for merged faculties
```javascript
const merged = await Faculty.find({
  mergedInto: { $ne: null }
});
```

## Validation Rules

1. **Faculty Name**
   - Required, 2-100 characters
   - Trimmed of whitespace
   - Unique per school (case-insensitive)

2. **Education Levels**
   - Optional
   - Values: "School", "HigherSecondary", "Bachelor"
   - Empty array = applies to all levels

3. **Status**
   - Only: "ACTIVE", "INACTIVE"
   - Default: "ACTIVE"

4. **Merge**
   - Cannot merge faculty into itself
   - Target faculty must exist
   - Only SUPER_ADMIN can merge

## Performance Optimizations

1. **Indexes**:
   - `{normalizedName, school}` - Fast duplicate checking
   - `{school, status}` - Fast faculty list queries
   - `{educationLevels, school, status}` - Fast level-based queries

2. **Lean Queries**:
   - API uses `.lean()` for read-only operations
   - Reduces memory footprint
   - Faster serialization

3. **Cascade Updates**:
   - Bulk update via `updateMany()` for multiple matches
   - Single merge operation handles all 3 models

## Testing the System

### Test 1: Create Faculty on School Registration
1. Register a new school with faculties: "Science, Commerce"
2. Verify Faculty documents created in database
3. Check GlobalSubjectManager shows "Science" and "Commerce" checkboxes

### Test 2: Subject with Multiple Faculties
1. Create subject with faculties: [Science, Commerce]
2. Verify `applicableFaculties` field contains exact names
3. Check GradeSubjectAssignment filters correctly

### Test 3: Merge Faculties
1. Create Faculty "Scince" (typo)
2. Verify it's in use in GradeSubject
3. Create correct Faculty "Science"
4. Merge "Scince" into "Science"
5. Verify all references updated
6. Check "Scince" marked as INACTIVE with `mergedInto: Science`

### Test 4: Case-Insensitive Matching
1. Try creating "science" when "Science" exists
2. Should fail with "Faculty 'science' already exists"
3. Demonstrates `normalizedName` unique index works

## API Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/faculties` | List faculties | SCHOOL_ADMIN, SUPER_ADMIN |
| POST | `/api/faculties` | Create faculty | SCHOOL_ADMIN, SUPER_ADMIN |
| PUT | `/api/faculties?id={id}` | Update faculty | SCHOOL_ADMIN, SUPER_ADMIN |
| DELETE | `/api/faculties?id={id}` | Soft delete faculty | SUPER_ADMIN only |
| PATCH | `/api/faculties/{id}/merge` | Merge faculties | SUPER_ADMIN only |

## Future Enhancements

1. **Faculty Management Dashboard**
   - SUPER_ADMIN panel to view, edit, merge faculties
   - Bulk operations for adding faculties
   - Audit trail of merges

2. **Faculty Descriptions**
   - Add `description` field
   - Career paths, subject offerings, etc.

3. **Faculty Rules**
   - Subject exclusions per faculty
   - Cross-faculty group rules
   - Grade-specific faculty requirements

4. **Batch Merge**
   - Merge multiple faculties at once
   - Merge by pattern (e.g., all "Scien*" → "Science")

## Troubleshooting

### Problem: Faculty dropdown is empty
**Solution**:
- Register a school first (creates faculties automatically)
- Check school has education levels configured
- Verify session contains valid school ID

### Problem: "Faculty already exists" error
**Solution**:
- System uses case-insensitive matching
- "Science" and "science" are considered duplicates
- Use exact existing name or check database for similar entries

### Problem: Subject faculty not updating after merge
**Solution**:
- Merge is case-sensitive (matches exact string)
- Ensure "applicableFaculties" uses exact faculty names
- Check SUPER_ADMIN role is present in session

## Files Modified/Created

- ✅ Created: [models/Faculty.js](models/Faculty.js)
- ✅ Created: [app/api/faculties/route.js](app/api/faculties/route.js)
- ✅ Created: [app/api/faculties/[id]/merge/route.js](app/api/faculties/[id]/merge/route.js)
- ✅ Updated: [app/api/register/route.js](app/api/register/route.js)
- ✅ Updated: [components/GlobalSubjectManager.js](components/GlobalSubjectManager.js)
- ✅ Updated: [components/GradeSubjectAssignment.js](components/GradeSubjectAssignment.js)
- ✅ Fixed: [app/api/seed/subjects/route.js](app/api/seed/subjects/route.js)

## Conclusion

The Faculty System provides a robust, scalable solution for managing faculty/stream consistency across E-Grantha. By using a master Faculty model, case-insensitive matching, and dropdown/checkbox UI patterns, the system eliminates spelling inconsistencies while providing correction mechanisms for the SUPER_ADMIN when errors occur.

**Status**: ✅ Implementation Complete - Zero Compilation Errors
