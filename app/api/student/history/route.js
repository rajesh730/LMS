import connectDB from "@/lib/db";
import Student from "@/models/Student";
import User from "@/models/User";
import Achievement from "@/models/Achievement";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession } from "@/lib/authz";

// Tag an item (by its school + date) with the academic year whose enrollment
// window contains it, so the student can filter their history by year.
function findEnrollmentYear(enrollments, school, date) {
  if (!date) return { year: "", yearStart: null };
  const time = new Date(date).getTime();
  const schoolStr = String(school || "");

  const within = (entry) => {
    const start = entry.startedAt ? new Date(entry.startedAt).getTime() : -Infinity;
    const end = entry.endedAt ? new Date(entry.endedAt).getTime() : Infinity;
    return time >= start && time <= end;
  };

  const sameSchool = enrollments.find(
    (entry) => String(entry.school) === schoolStr && within(entry)
  );
  const anyMatch = sameSchool || enrollments.find(within);
  return anyMatch
    ? { year: anyMatch.academicYear || "", yearStart: anyMatch.academicYearStart ?? null }
    : { year: "", yearStart: null };
}

export async function GET() {
  try {
    const { session, error } = await requireApiSession(["STUDENT"]);
    if (error) return error;

    await connectDB();

    const student = await Student.findOne({
      isDeleted: { $ne: true },
      $or: [
        { _id: session.user.id },
        { email: session.user.email },
        { username: session.user.email },
      ],
    })
      .select("name grade school status enrollments platformStudentId")
      .lean();

    if (!student) return errorResponse(404, "Student profile not found");

    const enrollments = Array.isArray(student.enrollments)
      ? student.enrollments
      : [];

    // Resolve any missing school-name snapshots in one batch.
    const schoolIds = Array.from(
      new Set(enrollments.map((entry) => String(entry.school)).filter(Boolean))
    );
    const schools = await User.find({ _id: { $in: schoolIds } })
      .select("schoolName name")
      .lean();
    const schoolNameById = new Map(
      schools.map((s) => [String(s._id), s.schoolName || s.name || "School"])
    );

    const [achievementsRaw, writingsRaw] = await Promise.all([
      Achievement.find({ student: student._id })
        .sort({ awardedAt: -1 })
        .select("title placement level awardedAt certificateUrl school event")
        .populate("event", "title date eventScope")
        .lean(),
      SchoolMagazineArticle.find({
        authorStudent: student._id,
        isDeleted: { $ne: true },
        $or: [{ isPublished: true }, { status: "APPROVED" }],
      })
        .sort({ publishedAt: -1, updatedAt: -1 })
        .select("title category school publishedAt updatedAt")
        .lean(),
    ]);

    const journey = enrollments
      .map((entry) => ({
        school: String(entry.school),
        schoolName:
          entry.schoolNameSnapshot ||
          schoolNameById.get(String(entry.school)) ||
          "School",
        grade: entry.grade,
        rollNumber: entry.rollNumber,
        academicYear: entry.academicYear,
        academicYearStart: entry.academicYearStart ?? null,
        status: entry.status,
        startedAt: entry.startedAt,
        endedAt: entry.endedAt,
      }))
      .sort(
        (a, b) =>
          (b.academicYearStart ?? 0) - (a.academicYearStart ?? 0) ||
          new Date(b.startedAt) - new Date(a.startedAt)
      );

    const achievements = achievementsRaw.map((a) => {
      const tag = findEnrollmentYear(
        enrollments,
        a.school,
        a.awardedAt || a.event?.date
      );
      return {
        id: String(a._id),
        title: a.title,
        placement: a.placement,
        level: a.level,
        awardedAt: a.awardedAt || a.event?.date || null,
        certificateUrl: a.certificateUrl || "",
        eventTitle: a.event?.title || "",
        schoolName: schoolNameById.get(String(a.school)) || "School",
        academicYear: tag.year,
        academicYearStart: tag.yearStart,
      };
    });

    const writings = writingsRaw.map((w) => {
      const date = w.publishedAt || w.updatedAt;
      const tag = findEnrollmentYear(enrollments, w.school, date);
      return {
        id: String(w._id),
        title: w.title,
        category: w.category || "WRITING",
        date,
        schoolName: schoolNameById.get(String(w.school)) || "School",
        academicYear: tag.year,
        academicYearStart: tag.yearStart,
      };
    });

    // The set of academic years available for filtering (from the journey,
    // plus any item that maps to a year outside the recorded journey).
    const yearMap = new Map();
    const addYear = (year, yearStart) => {
      if (yearStart === null || yearStart === undefined) return;
      if (!yearMap.has(yearStart)) {
        yearMap.set(yearStart, { year: year || String(yearStart), yearStart });
      }
    };
    journey.forEach((j) => addYear(j.academicYear, j.academicYearStart));
    achievements.forEach((a) => addYear(a.academicYear, a.academicYearStart));
    writings.forEach((w) => addYear(w.academicYear, w.academicYearStart));
    const years = Array.from(yearMap.values()).sort(
      (a, b) => b.yearStart - a.yearStart
    );

    return successResponse(200, "History loaded", {
      student: {
        name: student.name,
        grade: student.grade,
        status: student.status,
        platformStudentId: student.platformStudentId || "",
        schoolsCount: schoolIds.length,
      },
      years,
      journey,
      achievements,
      writings,
    });
  } catch (err) {
    console.error("GET /api/student/history error:", err);
    return internalServerError("Failed to load history");
  }
}
