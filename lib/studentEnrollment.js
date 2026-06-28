import AcademicYear from "@/models/AcademicYear";
import {
  buildAcademicYear,
  getCurrentAdYear,
  normalizeCalendar,
} from "@/lib/academicYear";

// Resolve a school's current (ACTIVE) academic year.
export async function getActiveAcademicYear(schoolId) {
  if (!schoolId) return null;
  return AcademicYear.findOne({ school: schoolId, status: "ACTIVE" }).lean();
}

// Ensure a school has an ACTIVE academic year, creating a sensible default
// (current AD year) the first time it's needed. Returns a plain object.
export async function ensureActiveAcademicYear(schoolId, { calendar } = {}) {
  if (!schoolId) return null;

  const existing = await AcademicYear.findOne({
    school: schoolId,
    status: "ACTIVE",
  }).lean();
  if (existing) return existing;

  const descriptor = buildAcademicYear(
    getCurrentAdYear(),
    normalizeCalendar(calendar)
  );

  try {
    const created = await AcademicYear.create({
      school: schoolId,
      year: descriptor.year,
      yearStart: descriptor.yearStart,
      calendar: descriptor.calendar,
      status: "ACTIVE",
      startedAt: new Date(),
    });
    return created.toObject();
  } catch (error) {
    // Lost a race (unique ACTIVE index) — re-read the winner.
    if (error?.code === 11000) {
      return AcademicYear.findOne({ school: schoolId, status: "ACTIVE" }).lean();
    }
    throw error;
  }
}

// Build a CURRENT enrollment entry stamped with the given academic year.
export function makeEnrollmentEntry({
  school,
  schoolName = "",
  grade = "",
  rollNumber = "",
  academicYear = null,
  startedAt = new Date(),
}) {
  return {
    school,
    schoolNameSnapshot: schoolName || "",
    grade: grade || "",
    rollNumber: rollNumber ? String(rollNumber) : "",
    academicYear: academicYear?.year || "",
    academicYearStart: academicYear?.yearStart ?? null,
    status: "CURRENT",
    startedAt,
    endedAt: null,
  };
}

// Resolve the student's CURRENT enrollment entry — the school + grade + academic
// year they are actively in. Prefers the entry that matches the student's current
// top-level school; falls back to any CURRENT entry, then the most recent one.
export function getCurrentEnrollment(student) {
  const entries = Array.isArray(student?.enrollments) ? student.enrollments : [];
  if (entries.length === 0) return null;

  const schoolId = student.school ? String(student.school) : "";
  const current = entries.filter((entry) => entry.status === "CURRENT");

  return (
    current.find((entry) => String(entry.school) === schoolId) ||
    current[0] ||
    entries[entries.length - 1] ||
    null
  );
}

// Build the authoring-era snapshot stamped onto a writing at creation time, from
// the student's CURRENT enrollment. Used to label content as history after the
// student transfers. Falls back to the student's current grade for older docs
// that predate enrollment history.
export function buildAuthoredEraSnapshot(student) {
  const enr = getCurrentEnrollment(student);
  return {
    authorSchoolNameSnapshot: enr?.schoolNameSnapshot || "",
    authorGrade: enr?.grade || student?.grade || "",
    authorAcademicYear: enr?.academicYear || "",
    authorAcademicYearStart: enr?.academicYearStart ?? null,
  };
}

// Close any CURRENT enrollment entries on a student doc with the given outcome.
export function closeCurrentEnrollments(student, status, endedAt = new Date()) {
  (student.enrollments || []).forEach((entry) => {
    if (entry.status === "CURRENT") {
      entry.status = status;
      entry.endedAt = endedAt;
    }
  });
}
