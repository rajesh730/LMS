# 📋 SUBJECT MANAGEMENT SYSTEM - TEST CHECKLIST

## Pre-Test Setup
- [ ] `npm run dev` running
- [ ] Browser open to http://localhost:3000
- [ ] Logged in as SUPER_ADMIN
- [ ] MongoDB accessible

---

## Phase 1: Data Seeding

### Seed Initial Data
- [ ] Navigate to http://localhost:3000/api/seed/subjects
- [ ] Should see success message
- [ ] Count shows: globalSubjects: 8
- [ ] Check MongoDB: `db.subjects.find({}).count()` = 8

---

## Phase 2: SUPER_ADMIN Tests

### Page Access
- [ ] Sidebar shows "Global Subjects" link
- [ ] Click "Global Subjects" → navigate to /admin/subjects
- [ ] Page loads successfully
- [ ] Title shows "Global Subjects"

### Subject List
- [ ] See list of 8 seeded subjects
- [ ] Each shows: Name, Code, Type, Academic Type, Status
- [ ] All showing status "ACTIVE" (green)
- [ ] All showing type "Global"

### Search/Filter
- [ ] Type "Math" in search → filters to Mathematics
- [ ] Type "ENG" in search → filters to English
- [ ] Clear search → shows all again

### Create Subject
- [ ] Click "Create Global Subject"
- [ ] Form opens with fields
- [ ] Fill: 
  - Name: "Physics"
  - Code: "PHY"
  - Type: "Global"
  - Academic Type: "Core"
- [ ] Click Submit
- [ ] Subject appears in list (last item)
- [ ] Shows as "ACTIVE"
- [ ] Database has new subject: `db.subjects.findOne({code:"PHY"})`

### Edit Subject
- [ ] Click edit on "Physics"
- [ ] Change name to "Advanced Physics"
- [ ] Click Save
- [ ] List updates (name changes)
- [ ] Database updated: `db.subjects.findOne({code:"PHY"})`

### Toggle Status
- [ ] Find any subject
- [ ] Click status toggle
- [ ] Status changes to INACTIVE (red)
- [ ] Click again
- [ ] Status changes back to ACTIVE (green)
- [ ] Database shows: `db.subjects.findOne().status`

---

## Phase 3: SCHOOL_ADMIN Tests

### Login as SCHOOL_ADMIN
- [ ] Logout current SUPER_ADMIN
- [ ] Login as school admin
- [ ] Dashboard loads

### Page Access
- [ ] Sidebar shows "Subjects" link
- [ ] Click "Subjects" → navigate to /school/subjects
- [ ] Page loads successfully
- [ ] Title shows "School Subjects"

### View Global Subjects
- [ ] Page shows two sections
- [ ] "Global Subjects" section shows all 8 global subjects
- [ ] Global subjects have lock icon (read-only)
- [ ] Cannot click edit/delete on global subjects

### Create Custom Subject
- [ ] Click "Create Custom Subject"
- [ ] Form opens
- [ ] Fill:
  - Name: "Advanced Mathematics"
  - Code: "MATH-ADV"
  - Type: "Custom"
  - Academic Type: "Elective"
- [ ] Click Submit
- [ ] "Custom Subjects" section now shows 1 subject
- [ ] Subject shows in custom section (not global)
- [ ] Database: `db.subjects.findOne({code:"MATH-ADV"})` has school: schoolId

### Edit Custom Subject
- [ ] Click edit on "Advanced Mathematics"
- [ ] Change name to "Advanced Math & Calculus"
- [ ] Save
- [ ] List updates
- [ ] Database updated

### Duplicate Code Prevention
- [ ] Try to create subject with code "MATH-ADV" again
- [ ] Should show error: "Subject code already exists"
- [ ] ❌ Not added

### Cannot Modify Global Subject
- [ ] Try to click edit on "English" (global)
- [ ] Button disabled or hidden
- [ ] ✅ Cannot modify

---

## Phase 4: Grade Subject Assignment

### Navigate to Grade Management
- [ ] Go to /school/academic/Grade%2010/subjects
- [ ] Page loads
- [ ] Title shows "Grade 10 - Subject Management"

### View Empty State
- [ ] No subjects in list yet
- [ ] Shows "No subjects activated" message
- [ ] Button visible: "Add Subject"

### Add First Subject
- [ ] Click "Add Subject"
- [ ] Modal/form opens
- [ ] Dropdown shows:
  - All 8 global subjects
  - 1 custom subject (Advanced Mathematics)
  - Total: 9 subjects
- [ ] Select "Mathematics"
- [ ] Fill grading parameters:
  - Compulsory: ✓ Yes
  - Full Marks: 100
  - Pass Marks: 40
  - Credit Hours: 3
- [ ] Click Submit
- [ ] "Mathematics" appears in grade subjects list
- [ ] Shows: Name, Code, Full Marks, Pass Marks, Compulsory badge
- [ ] Database: `db.gradesubjects.findOne({grade:"Grade 10"})`

### Add Second Subject
- [ ] Click "Add Subject"
- [ ] Select "English"
- [ ] Fill:
  - Compulsory: ✓ Yes
  - Full Marks: 80
  - Pass Marks: 32
  - Credit Hours: 2
- [ ] Submit
- [ ] Now showing 2 subjects in grade
- [ ] List shows both Mathematics and English

### Prevent Duplicates
- [ ] Try to add "Mathematics" again
- [ ] Should show error: "Subject already activated for this grade"
- [ ] ❌ Not added
- [ ] Still shows 2 subjects

### Validation: Pass Marks > Full Marks
- [ ] Click "Add Subject"
- [ ] Select "Science"
- [ ] Fill:
  - Full Marks: 100
  - Pass Marks: 120 (invalid)
- [ ] Click Submit
- [ ] Should show error: "Pass marks cannot be greater than full marks"
- [ ] ❌ Not saved
- [ ] Subject count still 2

### Edit Assignment
- [ ] Click edit on "Mathematics" assignment
- [ ] Modal opens with current values
- [ ] Change Full Marks from 100 to 150
- [ ] Save
- [ ] List updates (Full Marks now 150)
- [ ] Database updated

### Deactivate Assignment
- [ ] Find "English" subject
- [ ] Click "Deactivate"
- [ ] Subject still visible but status shows "INACTIVE"
- [ ] Can reactivate later
- [ ] Count shows 2 subjects (one inactive)

### Other Grades
- [ ] Navigate to /school/academic/Grade%2011/subjects
- [ ] Page shows no subjects (separate grade)
- [ ] Add subjects here
- [ ] Should not affect Grade 10
- [ ] Go back to Grade 10 → still shows previous subjects
- [ ] ✅ Grades are independent

---

## Phase 5: Multi-Tenancy Isolation

### Switch School
- [ ] Logout SCHOOL_ADMIN
- [ ] Login as ADMIN from different school
- [ ] Go to /school/subjects
- [ ] Should NOT see "Advanced Mathematics" custom subject (from other school)
- [ ] Should see all global subjects (shared)
- [ ] ✅ Cannot see other school's custom subjects

### Database Verification
- [ ] Check SCHOOL_A custom subjects: Only see SCHOOL_A's subjects
- [ ] Check SCHOOL_B custom subjects: Only see SCHOOL_B's subjects
- [ ] Global subjects visible to both
- [ ] ✅ Proper isolation

---

## Phase 6: API Testing (Optional - Advanced)

### Test GET /api/subjects (SUPER_ADMIN)
- [ ] Returns all subjects (global + all schools' custom)
- [ ] Check count ≥ 9

### Test GET /api/subjects (SCHOOL_ADMIN)
- [ ] Returns only global + own school's custom
- [ ] Does not return other schools' custom subjects
- [ ] ✅ Role-based filtering works

### Test POST /api/subjects (SCHOOL_ADMIN)
- [ ] SCHOOL_ADMIN can create SCHOOL_CUSTOM
- [ ] Cannot create GLOBAL
- [ ] ✅ Permission enforced

### Test POST /api/grades/Grade%2010/subjects (SCHOOL_ADMIN)
- [ ] Can activate subject for grade
- [ ] Validation works (passMarks ≤ fullMarks)
- [ ] Unique constraint prevents duplicates
- [ ] ✅ API working correctly

---

## Phase 7: Visual & UI Tests

### Responsive Design
- [ ] Resize browser window
- [ ] Tables still readable
- [ ] Buttons still clickable
- [ ] Forms still accessible
- [ ] ✅ Responsive design working

### Loading States
- [ ] When creating subject, loading indicator appears
- [ ] When saving, UI shows loading state
- [ ] No "stuck" states
- [ ] ✅ UX is smooth

### Error Messages
- [ ] Error messages are clear
- [ ] Show problem and solution
- [ ] Not overly technical
- [ ] ✅ Good UX feedback

### Success Messages
- [ ] Success notification appears after creating subject
- [ ] Message is clear: "Subject created successfully"
- [ ] Auto-disappears after 3-5 seconds
- [ ] ✅ Positive feedback

---

## Phase 8: Database Verification

### Check Subject Index
```bash
db.subjects.getIndexes()
# Should show: {code: 1, school: 1} UNIQUE
```
- [ ] Unique index present
- [ ] Named correctly

### Check GradeSubject Index
```bash
db.gradesubjects.getIndexes()
# Should show: {subject: 1, grade: 1, school: 1} UNIQUE
```
- [ ] Unique index present

### Check Data
```bash
# Global subjects (school: null)
db.subjects.find({subjectType: "GLOBAL"}).count()
# Should be ≥ 8

# Custom subjects (school: ObjectId)
db.subjects.find({subjectType: "SCHOOL_CUSTOM"}).count()
# Should be ≥ 1

# Grade assignments
db.gradesubjects.find({grade: "Grade 10"}).count()
# Should match what UI shows
```
- [ ] All counts correct

---

## Phase 9: Edge Cases

### Soft Deletion
- [ ] Deactivate subject in grade
- [ ] Can reactivate without re-entering data
- [ ] Historical data preserved
- [ ] ✅ Soft deletion working

### Subject Reuse
- [ ] Same global subject used in multiple grades
- [ ] Each grade has independent assignments
- [ ] Changing one grade's parameters doesn't affect others
- [ ] ✅ Proper isolation

### Code Uniqueness Per School
- [ ] SCHOOL_A creates "MATH"
- [ ] SCHOOL_B creates "MATH" (same code)
- [ ] Both allowed (compound index works)
- [ ] ✅ Correct behavior

---

## Phase 10: Final Verification

### Sidebar Navigation
- [ ] Links appear correctly based on role
- [ ] Active link highlighted
- [ ] Clicking works smoothly
- [ ] ✅ Navigation working

### Page Titles
- [ ] All pages have clear titles
- [ ] Breadcrumbs or back button visible
- [ ] ✅ Navigation context clear

### No Console Errors
- [ ] Open DevTools (F12)
- [ ] Console tab shows no errors
- [ ] No red X marks
- [ ] ✅ Clean console

### No Database Warnings
- [ ] Check MongoDB logs
- [ ] No duplicate key violations on valid attempts
- [ ] No connection errors
- [ ] ✅ DB operations clean

---

## ✅ Test Summary

**Total Items**: 100+  
**Passed**: ___/100  
**Failed**: ___/100  

### Critical Tests (Must Pass)
- [ ] Seed creates 8 subjects
- [ ] SUPER_ADMIN can create global subjects
- [ ] SCHOOL_ADMIN can create custom subjects
- [ ] Subjects activate for grades
- [ ] Pass marks validation works
- [ ] Schools cannot see each other's data
- [ ] Subject codes unique per school
- [ ] Grade subjects independent
- [ ] No console errors
- [ ] Database indexes present

### Status
- [ ] **PASS** - All critical tests passed, system ready
- [ ] **FAIL** - Some issues found, see details below

---

## Notes & Issues Found

### Issue 1
**Description**: 
**Severity**: 
**Resolution**: 

### Issue 2
**Description**: 
**Severity**: 
**Resolution**: 

### Issue 3
**Description**: 
**Severity**: 
**Resolution**: 

---

## Tested By
**Name**: _______________  
**Date**: _______________  
**Time**: _______________  
**Duration**: _____ minutes  

---

## Sign Off
- [ ] All critical tests passed
- [ ] Ready for development use
- [ ] Ready for production (after security review)
- [ ] Ready for user testing

**Approved By**: _______________  
**Date**: _______________  

---

**Print this checklist and check off each item as you test!** ✅
