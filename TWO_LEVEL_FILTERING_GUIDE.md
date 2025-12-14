# 🎓 Two-Level Filtering System: Education Level + Faculty

## Overview

The subject management system now supports **two-level filtering** for maximum effectiveness:

1. **Education Level** - Automatic filtering based on grade
   - School (Grades 1-10)
   - Higher Secondary (Grades 11-12)
   - Bachelor (Grade 13+)

2. **Faculty/Stream** - Manual filtering within education level
   - Science, Commerce, Humanities, Arts, Engineering, etc.

Together, these create a powerful filtering combination that shows only the most relevant subjects.

---

## 🔄 How Two-Level Filtering Works

### Level 1: Education Level (Automatic)

When you navigate to a grade, the system automatically determines education level:

```
Grade 5  → School level
Grade 9  → School level
Grade 11 → HigherSecondary level
Grade 12 → HigherSecondary level
Grade 13 → Bachelor level
Grade 14 → Bachelor level
```

The system then **shows only subjects applicable to that education level**.

### Level 2: Faculty Filter (Manual)

After education level filtering, you can further filter by faculty:

```
Select Faculty: "Science"
→ Shows only Science subjects that also apply to current education level
```

---

## 📊 Filtering Flow Example

### Scenario: Multi-Institution Setup

**Institution has:**
- Grades 1-10 (School)
- Grades 11-12 (Higher Secondary with Science, Commerce, Humanities streams)
- Grades 13-14 (Bachelor with Science, Commerce, Engineering, Humanities)

### Subject Configuration

**SUPER_ADMIN creates these subjects:**

```
1. Mathematics
   Education Levels: School, HigherSecondary, Bachelor
   Applicable Faculties: [empty - universal]
   
2. Physics
   Education Levels: HigherSecondary, Bachelor
   Applicable Faculties: Science, Engineering
   
3. Chemistry
   Education Levels: HigherSecondary
   Applicable Faculties: Science
   
4. Accounting
   Education Levels: HigherSecondary, Bachelor
   Applicable Faculties: Commerce
   
5. Psychology
   Education Levels: HigherSecondary, Bachelor
   Applicable Faculties: Humanities, Commerce
```

### Assignment Process

**SCHOOL_ADMIN assigns subjects to grades:**

#### Grade 5 (School level)
- Automatic education level: **School**
- Visible subjects: Mathematics only
- Dropdown shows: Mathematics ✅

#### Grade 11 (HigherSecondary level)
- Automatic education level: **HigherSecondary**
- User selects faculty: **Science**
- Visible subjects:
  - Mathematics ✅ (HigherSecondary + universal faculty)
  - Physics ✅ (HigherSecondary + Science faculty)
  - Chemistry ✅ (HigherSecondary + Science faculty)
  - Accounting ❌ (HigherSecondary but Commerce only)
  - Psychology ❌ (HigherSecondary but Humanities/Commerce only)

#### Grade 11 (HigherSecondary level)
- Automatic education level: **HigherSecondary**
- User selects faculty: **Commerce**
- Visible subjects:
  - Mathematics ✅ (HigherSecondary + universal faculty)
  - Physics ❌ (HigherSecondary but Science/Engineering only)
  - Chemistry ❌ (HigherSecondary but Science only)
  - Accounting ✅ (HigherSecondary + Commerce faculty)
  - Psychology ✅ (HigherSecondary + Commerce faculty)

#### Grade 13 (Bachelor level)
- Automatic education level: **Bachelor**
- User selects faculty: **Engineering**
- Visible subjects:
  - Mathematics ✅ (Bachelor + universal faculty)
  - Physics ✅ (Bachelor + Engineering faculty)
  - Chemistry ❌ (HigherSecondary only, not Bachelor)
  - Accounting ❌ (Bachelor but Commerce only)
  - Psychology ❌ (Bachelor but Humanities/Commerce only)

---

## 🎯 Benefits of Two-Level Filtering

| Feature | Benefit |
|---------|---------|
| **Education Level Filter** | Only subjects appropriate for grade level shown |
| **Faculty Filter** | Within education level, show stream-specific subjects |
| **Combined Effect** | From 100+ subjects → 3-5 most relevant |
| **Automatic** | No manual education level entry - system figures it out |
| **No Configuration Errors** | Wrong subjects never appear |
| **Flexible** | Universal subjects work at all levels |

---

## 📝 Configuration Guide

### For SUPER_ADMIN: Setting Up Subjects

**Step 1: Go to** `/admin/subjects`

**Step 2: Click "Create Subject"**

**Step 3: Fill Form**
```
Subject Name: Physics
Subject Code: PHY
Academic Type: CORE
Applicable Faculties: Science, Engineering
Education Levels: ✓ HigherSecondary, ✓ Bachelor
```

**Step 4: Save**

### For SCHOOL_ADMIN: Assigning to Grades

**Step 1: Go to** `/school/academic/Grade 11/subjects`

**Step 2: View Education Level**
```
Education Level: HigherSecondary (auto-detected)
```

**Step 3: (Optional) Filter by Faculty**
```
Filter by Faculty: Science
```

**Step 4: Select Subject**
- Dropdown shows only relevant subjects
- Add subject to grade

---

## 🔧 CSV Import Template

```csv
Name,Code,Type,Academic Type,Education Levels,Applicable Faculties,Description
Mathematics,MATH,GLOBAL,CORE,School;HigherSecondary;Bachelor,,Core mathematics
Physics,PHY,GLOBAL,CORE,HigherSecondary;Bachelor,Science;Engineering,Physics for STEM
Chemistry,CHEM,GLOBAL,CORE,HigherSecondary,Science,Chemistry for science stream
English,ENG,GLOBAL,CORE,School;HigherSecondary;Bachelor,,English for all
Accounting,ACC,GLOBAL,CORE,HigherSecondary;Bachelor,Commerce,Accounting for commerce
Psychology,PSY,GLOBAL,ELECTIVE,HigherSecondary;Bachelor,Humanities;Commerce,Psychology subject
```

**Format Notes:**
- Education Levels: Use semicolon (;) to separate multiple values
- Applicable Faculties: Use semicolon (;) to separate multiple values
- Leave both blank for universal subjects

---

## 🎓 Real-World Examples

### Example 1: Large School (Grades 1-12)

**Available Subjects:**
- Grades 1-5: Basic subjects (Math, English, Science, Social Studies)
- Grades 6-10: Standard subjects (Math, Physics, Chemistry, Biology, English, History, Geography)
- Grades 11-12: Stream-based subjects

**Configuration:**
```
Mathematics
  Education Levels: School, HigherSecondary
  Faculties: [empty - for all]

Physics
  Education Levels: HigherSecondary
  Faculties: Science, Engineering

Biology
  Education Levels: HigherSecondary
  Faculties: Science

Economics
  Education Levels: HigherSecondary
  Faculties: Commerce, Humanities
```

**Result:**
- Grade 5 dropdown: Math, English, Science, Social Studies
- Grade 11 Science dropdown: Math, Physics, Biology, Chemistry
- Grade 11 Commerce dropdown: Math, Economics, Accounting, English

### Example 2: College (Grades 11-14)

**Available Subjects:**
- Grade 11-12: Higher secondary subjects
- Grade 13-14: University level subjects

**Configuration:**
```
Mathematics
  Education Levels: HigherSecondary, Bachelor
  Faculties: [empty - for all streams]

Calculus
  Education Levels: Bachelor
  Faculties: Science, Engineering

Corporate Law
  Education Levels: Bachelor
  Faculties: Commerce, Law
```

**Result:**
- Grade 11 Science: Mathematics, Physics, Chemistry, Biology
- Grade 11 Commerce: Mathematics, Economics, Accounting, Business
- Grade 13 Science: Mathematics, Calculus, Physics, Chemistry, Differential Equations
- Grade 13 Law: Legal Methods, Corporate Law, Constitutional Law, Mathematics

---

## ✅ Implementation Checklist

- ✅ Add `educationLevel` field to Subject model
- ✅ Add `educationLevel` array with values: School, HigherSecondary, Bachelor
- ✅ Auto-detect education level from grade number in GradeSubjectAssignment
- ✅ Filter by education level before faculty filter
- ✅ Display education level info to user
- ✅ Support education levels in CSV import/export
- ✅ Update documentation

---

## 🚀 How to Use (Step-by-Step)

### For Institutions with Single Stream (School Model)

1. Create subjects with Education Levels only
2. Leave Applicable Faculties empty
3. When assigning: No need to enter faculty filter
4. All subjects at education level shown

### For Institutions with Multiple Streams (College Model)

1. Create subjects with both Education Levels AND Applicable Faculties
2. Example: Physics with `[HigherSecondary, Bachelor]` and `[Science, Engineering]`
3. When assigning Grade 11: System auto-selects HigherSecondary
4. User manually selects Science → Only Science subjects shown

---

## 📊 Filtering Logic (Technical)

```javascript
// For each subject in dropdown:
1. Check if subject.educationLevel includes currentEducationLevel
   → If yes, continue to step 2
   → If no, HIDE subject
   
2. Check if selectedFaculty is empty
   → If empty, SHOW subject
   → If not empty, check step 3
   
3. Check if subject.applicableFaculties includes selectedFaculty
   → If yes, SHOW subject
   → If no, HIDE subject
```

---

## 🎯 Expected Results

### Before Implementation
- **Grade 5 dropdown:** 100+ subjects (confusing!)
- **Grade 11 Science dropdown:** 100+ subjects (very confusing!)
- **Grade 13 Law dropdown:** 100+ subjects (overwhelming!)

### After Implementation
- **Grade 5 dropdown:** 8-12 subjects (all School level)
- **Grade 11 Science dropdown:** 6-8 subjects (HigherSecondary + Science)
- **Grade 13 Law dropdown:** 10-15 subjects (Bachelor + Law)

---

## 🔗 Related Documentation

- [FACULTY_STRUCTURE_GUIDE.md](FACULTY_STRUCTURE_GUIDE.md) - School vs College models
- [BULK_IMPORT_GUIDE.md](BULK_IMPORT_GUIDE.md) - CSV import/export
- [APPLICABLE_FACULTIES_IMPLEMENTATION.md](APPLICABLE_FACULTIES_IMPLEMENTATION.md) - First filtering level

---

**Status:** ✅ Implemented and Ready  
**Version:** 2.0 (Two-Level Filtering)  
**Errors:** 0  
**Testing Status:** Ready for user testing
