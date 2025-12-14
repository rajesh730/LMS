# 📥 Bulk Import & Export Guide

## Overview

The Subject Management System now supports:
- ✅ **Download/Export** - Export all subjects as CSV
- ✅ **Bulk Import** - Import multiple subjects from CSV file

---

## 📥 How to Import Subjects

### Step 1: Prepare Your CSV File

Create a CSV file with the following columns:

```
Name,Code,Type,Academic Type,Education Levels,Applicable Faculties,Description
```

**Column Definitions:**

| Column | Required | Values | Example |
|--------|----------|--------|----------|
| **Name** | Yes | Subject name | Mathematics, Physics, Economics |
| **Code** | Yes | Alphanumeric code | MATH, CS-101, PHY-ADV |
| **Type** | Yes | GLOBAL or SCHOOL_CUSTOM | GLOBAL |
| **Academic Type** | Yes | CORE, ELECTIVE, EXTRA_CURRICULAR | CORE |
| **Education Levels** | No | School, HigherSecondary, Bachelor (semicolon-separated, leave blank for all) | School;HigherSecondary |
| **Applicable Faculties** | No | Semicolon-separated faculty names (leave blank for all) | Science;Engineering |
| **Description** | No | Optional description | Core mathematics |

### Step 2: Example CSV Format

```csv
Name,Code,Type,Academic Type,Education Levels,Applicable Faculties,Description
Mathematics,MATH,GLOBAL,CORE,School;HigherSecondary;Bachelor,,Core mathematics for all levels
Physics,PHY,GLOBAL,CORE,HigherSecondary;Bachelor,Science;Engineering,Physics for higher secondary and bachelor
Chemistry,CHEM,GLOBAL,CORE,HigherSecondary,Science,Chemistry for higher secondary science only
Economics,ECO,GLOBAL,ELECTIVE,HigherSecondary;Bachelor,Commerce;Humanities,Economics for commerce and humanities
English,ENG,GLOBAL,CORE,School;HigherSecondary;Bachelor,,English for all education levels
```

**Notes on Education Levels:**
- **School**: Grades 1-10 level subjects
- **HigherSecondary**: Grades 11-12 level subjects
- **Bachelor**: Grade 13+ university level subjects
- **Leave blank** to make subject available to ALL education levels
- **Single level**: `School`
- **Multiple levels**: Separate with semicolon: `School;HigherSecondary`

**Notes on Applicable Faculties:**
- **Leave blank** to make subject available to ALL faculties
- **Single faculty**: `Science`
- **Multiple faculties**: Separate with semicolon: `Science;Engineering`

### Step 3: Upload the File

**For SUPER_ADMIN** (Global Subjects):
1. Go to `/admin/subjects`
2. Click **"Import"** button
3. Select your CSV file
4. Click upload
5. View results (created count + any errors)

**For SCHOOL_ADMIN** (School Subjects):
1. Go to `/school/subjects`
2. Click **"Import"** button
3. Select your CSV file
4. Click upload
5. View results

### Step 4: Review Results

You'll see:
- ✅ Number of subjects successfully created
- ⚠️ Errors (if any) with row numbers and reasons

**Example Response:**
```
Successfully imported 6 subjects!
```

Or with errors:
```
Successfully imported 5 subjects. 1 errors encountered.
Row 7: Subject with code 'MATH' already exists
```

---

## 📤 How to Export Subjects

### Step 1: Click Download

**For SUPER_ADMIN**:
1. Go to `/admin/subjects`
2. Click **"Download"** button
3. File downloads as `subjects-2024-12-13.csv`

**For SCHOOL_ADMIN**:
1. Go to `/school/subjects`
2. Click **"Download"** button
3. File downloads with all visible subjects (global + custom)

### Step 2: Use the Exported File

The CSV file contains:
- All visible subjects for your role
- Current names, codes, types, and descriptions
- Ready to modify and re-import

**Note:** Exported file includes both global and custom subjects (if you're SCHOOL_ADMIN)

---

## ⚙️ Validation Rules

### Subject Creation

✅ **Allowed:**
- SUPER_ADMIN can create GLOBAL subjects
- SCHOOL_ADMIN can create SCHOOL_CUSTOM subjects
- Same code in different schools (global + custom)
- Whitespace is trimmed automatically

❌ **Rejected:**
- Duplicate codes in same scope
- Invalid Type (must be GLOBAL or SCHOOL_CUSTOM)
- Invalid Subject Category
- Missing Subject Name or Code
- SCHOOL_ADMIN trying to create GLOBAL subjects

### Type Restrictions

| Type | Creator | Visible To |
|------|---------|-----------|
| GLOBAL | SUPER_ADMIN only | All schools + admins |
| SCHOOL_CUSTOM | SCHOOL_ADMIN | Own school + SUPER_ADMIN |

---

## 📋 Sample CSV Template

Download template: `/subjects-template.csv`

```csv
Subject Name,Subject Code,Type,Subject Category
Mathematics,MATH,GLOBAL,CORE
English,ENG,GLOBAL,CORE
Science,SCI,GLOBAL,CORE
History,HIST-101,GLOBAL,CORE
Geography,GEO,GLOBAL,CORE
Physical Education,PE,GLOBAL,ELECTIVE
Art,ART-BASIC,GLOBAL,ELECTIVE
Music,MUS-1,GLOBAL,ELECTIVE
Computer Science,CS-101,GLOBAL,CORE
Economics,ECON-ADV,GLOBAL,ELECTIVE
```

---

## 🔧 API Endpoints

### Export Subjects

```bash
GET /api/subjects/bulk?action=export
```

**Response:** CSV file download

---

### Import Subjects

```bash
POST /api/subjects/bulk

Content-Type: multipart/form-data

Body:
{
  "file": <CSV file>
}
```

**Response:**
```json
{
  "success": true,
  "created": 6,
  "createdSubjects": [
    { "name": "Mathematics", "code": "MATH" },
    { "name": "English", "code": "ENG" }
  ],
  "errors": []
}
```

---

## 💡 Best Practices

### ✅ Do's

- ✅ Use the download feature to get current subjects as base
- ✅ Keep codes unique and meaningful (e.g., MATH, CS-101, ENG-ADV-1)
- ✅ Use GLOBAL type only for platform-wide subjects
- ✅ Test with a few subjects first before bulk import
- ✅ Review errors carefully before retrying

### ❌ Don'ts

- ❌ Don't use duplicate codes in same scope
- ❌ Don't use special characters except hyphens and numbers
- ❌ Don't mix GLOBAL and SCHOOL_CUSTOM without proper roles
- ❌ Don't modify the export format (headers must match)
- ❌ Don't try to import 1000+ subjects at once (do in batches)

---

## 🆘 Troubleshooting

### "Subject with code 'X' already exists"
- You're trying to create a subject with a code that's already used
- Check if the subject exists in global or school custom
- Use a different code or delete the existing subject first

### "Only SUPER_ADMIN can create GLOBAL subjects"
- You're logged in as SCHOOL_ADMIN trying to create GLOBAL type
- Use SCHOOL_CUSTOM type instead
- Or login as SUPER_ADMIN

### "Invalid Subject Category"
- Subject Category must be exactly: CORE, ELECTIVE, or EXTRA_CURRICULAR
- Check spelling and case

### "Invalid Type"
- Type must be exactly: GLOBAL or SCHOOL_CUSTOM
- Check spelling and case

### Empty file error
- Make sure CSV has header row + at least one data row
- File should not be empty

---

## 📊 Example Workflows

### Workflow 1: Create Platform Subjects (SUPER_ADMIN)

1. Create `platform-subjects.csv`:
```csv
Subject Name,Subject Code,Type,Subject Category
Mathematics,MATH,GLOBAL,CORE
English,ENG,GLOBAL,CORE
Science,SCI-101,GLOBAL,CORE
```

2. Go to `/admin/subjects`
3. Click "Import"
4. Select file
5. ✅ 3 global subjects created

### Workflow 2: Create School Subjects (SCHOOL_ADMIN)

1. Download existing subjects from `/school/subjects`
2. Add new rows with `SCHOOL_CUSTOM` type:
```csv
Advanced Math,MATH-ADV-2,SCHOOL_CUSTOM,ELECTIVE
```

3. Click "Import"
4. ✅ Subject added to your school only

### Workflow 3: Backup & Restore

1. Go to `/admin/subjects`
2. Click "Download" → saves `subjects-2024-12-13.csv`
3. Keep backup file
4. If needed, re-import to restore

---

## ✨ Features

- ✅ Fast bulk import (100+ subjects)
- ✅ Automatic CSV parsing
- ✅ Detailed error reporting
- ✅ Validation before creation
- ✅ Whitespace trimming
- ✅ Duplicate prevention
- ✅ Role-based permissions
- ✅ School isolation maintained
- ✅ Download with timestamp

---

**Ready to import subjects? Start with the template!** 📥

Download: `/public/subjects-template.csv`
