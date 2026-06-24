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

// Close any CURRENT enrollment entries on a student doc with the given outcome.
export function closeCurrentEnrollments(student, status, endedAt = new Date()) {
  (student.enrollments || []).forEach((entry) => {
    if (entry.status === "CURRENT") {
      entry.status = status;
      entry.endedAt = endedAt;
    }
  });
}
