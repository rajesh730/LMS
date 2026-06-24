import connectDB from "@/lib/db";
import Student from "@/models/Student";
import SchoolConfig from "@/models/SchoolConfig";
import AcademicYear from "@/models/AcademicYear";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import { ensureActiveAcademicYear } from "@/lib/studentEnrollment";
import {
  buildAcademicYear,
  formatAcademicYear,
  getOrderedGrades,
  nextAcademicYear,
  normalizeCalendar,
} from "@/lib/academicYear";

// Ordered grade list for the school: union of configured grades and the grades
// students are actually in, so promotion works even if config grades are unset.
async function resolveOrderedGrades(schoolId) {
  const [config, distinctGrades] = await Promise.all([
    SchoolConfig.findOne({ school: schoolId }).select("grades").lean(),
    Student.distinct("grade", {
      school: schoolId,
      isDeleted: { $ne: true },
      status: { $in: ["ACTIVE", "SUSPENDED"] },
    }),
  ]);

  return getOrderedGrades([...(config?.grades || []), ...(distinctGrades || [])]);
}

export async function GET() {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) return errorResponse(403, "Forbidden", "FORBIDDEN");

    await connectDB();

    const config = await SchoolConfig.findOne({ school: schoolId })
      .select("academicCalendar")
      .lean();
    const calendar = normalizeCalendar(config?.academicCalendar);

    const current = await ensureActiveAcademicYear(schoolId, { calendar });
    const [history, orderedGrades] = await Promise.all([
      AcademicYear.find({ school: schoolId })
        .sort({ yearStart: -1 })
        .lean(),
      resolveOrderedGrades(schoolId),
    ]);

    const upcoming = current
      ? nextAcademicYear({
          yearStart: current.yearStart,
          calendar: current.calendar,
        })
      : null;

    return successResponse(200, "Academic year loaded", {
      calendar,
      current,
      upcoming,
      history,
      orderedGrades,
    });
  } catch (err) {
    console.error("GET /api/school/academic-year error:", err);
    return internalServerError("Failed to load academic year");
  }
}

// Update the school's calendar preference and/or correct the current session's
// start year. Allowed only while the current session has no recorded promotions.
export async function PUT(req) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) return errorResponse(403, "Forbidden", "FORBIDDEN");

    const body = await req.json().catch(() => ({}));
    await connectDB();

    const current = await ensureActiveAcademicYear(schoolId);
    if (!current) return errorResponse(404, "Active academic year not found");

    const calendar = body.calendar
      ? normalizeCalendar(body.calendar)
      : current.calendar;

    let yearStart = current.yearStart;
    if (body.yearStart !== undefined && body.yearStart !== null) {
      const parsed = Number.parseInt(body.yearStart, 10);
      if (!Number.isFinite(parsed) || parsed < 1900 || parsed > 3000) {
        return errorResponse(400, "Enter a valid academic year.");
      }
      yearStart = parsed;
    }

    // Guard against changing the start year onto an already-recorded session.
    if (yearStart !== current.yearStart) {
      const clash = await AcademicYear.findOne({
        school: schoolId,
        yearStart,
        _id: { $ne: current._id },
      }).select("_id");
      if (clash) {
        return errorResponse(
          409,
          "That academic year already exists in your history."
        );
      }
    }

    const descriptor = buildAcademicYear(yearStart, calendar);

    await AcademicYear.updateOne(
      { _id: current._id },
      {
        $set: {
          calendar: descriptor.calendar,
          yearStart: descriptor.yearStart,
          year: descriptor.year,
        },
      }
    );

    await SchoolConfig.updateOne(
      { school: schoolId },
      { $set: { academicCalendar: descriptor.calendar } },
      { upsert: true }
    );

    return successResponse(200, "Academic year updated", {
      calendar: descriptor.calendar,
      current: { ...current, ...descriptor },
      preview: {
        thisYear: descriptor.year,
        sample: formatAcademicYear(descriptor.yearStart, descriptor.calendar),
      },
    });
  } catch (err) {
    console.error("PUT /api/school/academic-year error:", err);
    return internalServerError("Failed to update academic year");
  }
}
