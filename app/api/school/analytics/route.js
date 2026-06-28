import connectDB from "@/lib/db";
import Student from "@/models/Student";
import StudentTransfer from "@/models/StudentTransfer";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import AcademicYear from "@/models/AcademicYear";
import SchoolConfig from "@/models/SchoolConfig";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import { ensureActiveAcademicYear } from "@/lib/studentEnrollment";
import { normalizeCalendar } from "@/lib/academicYear";

// Resolve the [start, end) date window a school session covers, so date-based
// records (events, transfers) can be bucketed into the right academic year.
// Closed years carry closedAt; the active year runs until now.
function yearWindow(years, index) {
  const row = years[index];
  const start = row.startedAt
    ? new Date(row.startedAt)
    : new Date(Date.UTC(row.yearStart, 0, 1));
  // years are sorted newest-first, so the previous (newer) session is index-1.
  const end = row.closedAt
    ? new Date(row.closedAt)
    : years[index - 1]?.startedAt
    ? new Date(years[index - 1].startedAt)
    : new Date();
  return { start, end };
}

function inWindow(date, { start, end }) {
  if (!date) return false;
  const t = new Date(date).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function otherSchoolName(school, snapshot) {
  if (school && typeof school === "object") {
    return school.schoolName || school.name || snapshot || "School";
  }
  return snapshot || "School";
}

export async function GET(req) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) return errorResponse(403, "Forbidden", "FORBIDDEN");

    await connectDB();

    const config = await SchoolConfig.findOne({ school: schoolId })
      .select("academicCalendar")
      .lean();
    await ensureActiveAcademicYear(schoolId, {
      calendar: normalizeCalendar(config?.academicCalendar),
    });

    const years = await AcademicYear.find({ school: schoolId })
      .sort({ yearStart: -1 })
      .lean();

    if (years.length === 0) {
      return successResponse(200, "No academic years yet", {
        years: [],
        selectedYearStart: null,
      });
    }

    const { searchParams } = new URL(req.url);
    const requested = Number.parseInt(searchParams.get("yearStart") || "", 10);
    const selectedIndex = Number.isFinite(requested)
      ? Math.max(
          0,
          years.findIndex((y) => y.yearStart === requested)
        )
      : years.findIndex((y) => y.status === "ACTIVE");
    const index = selectedIndex >= 0 ? selectedIndex : 0;
    const selectedYear = years[index];
    const Y = selectedYear.yearStart;
    const window = yearWindow(years, index);

    // --- Students who joined / left this school in the selected session ---
    const lifetimeStudents = await Student.find({
      "enrollments.school": schoolId,
    })
      .select("name enrollments")
      .lean();

    const joined = [];
    const left = [];
    const schoolStr = String(schoolId);

    for (const student of lifetimeStudents) {
      const entries = (student.enrollments || []).filter(
        (e) => String(e.school) === schoolStr
      );
      if (entries.length === 0) continue;

      const firstYear = Math.min(
        ...entries.map((e) => e.academicYearStart ?? Infinity)
      );

      if (firstYear === Y) {
        const entry =
          entries.find((e) => e.academicYearStart === Y) || entries[0];
        // Transferred in if they were enrolled elsewhere on/before this year.
        const transferredIn = (student.enrollments || []).some(
          (e) =>
            String(e.school) !== schoolStr &&
            (e.academicYearStart ?? Infinity) <= Y
        );
        joined.push({
          studentId: String(student._id),
          name: student.name,
          grade: entry.grade || "",
          academicYear: entry.academicYear || selectedYear.year,
          type: transferredIn ? "TRANSFER_IN" : "ADMISSION",
        });
      }

      entries
        .filter(
          (e) =>
            e.academicYearStart === Y &&
            ["TRANSFERRED", "GRADUATED"].includes(e.status)
        )
        .forEach((entry) => {
          left.push({
            studentId: String(student._id),
            name: student.name,
            grade: entry.grade || "",
            academicYear: entry.academicYear || selectedYear.year,
            type: entry.status,
          });
        });
    }

    // --- Transfer history (incoming + outgoing), completed in this session ---
    const [incomingRaw, outgoingRaw] = await Promise.all([
      StudentTransfer.find({
        toSchool: schoolId,
        status: "COMPLETED",
      })
        .sort({ decidedAt: -1 })
        .populate("fromSchool", "schoolName name")
        .lean(),
      StudentTransfer.find({
        fromSchool: schoolId,
        status: "COMPLETED",
      })
        .sort({ decidedAt: -1 })
        .populate("toSchool", "schoolName name")
        .lean(),
    ]);

    const incoming = incomingRaw
      .filter((t) => inWindow(t.decidedAt || t.updatedAt, window))
      .map((t) => ({
        id: String(t._id),
        studentName: t.studentNameSnapshot || "Student",
        grade: t.toGrade || "",
        counterpartSchool: otherSchoolName(t.fromSchool, t.fromSchoolNameSnapshot),
        date: t.decidedAt || t.updatedAt,
      }));

    const outgoing = outgoingRaw
      .filter((t) => inWindow(t.decidedAt || t.updatedAt, window))
      .map((t) => ({
        id: String(t._id),
        studentName: t.studentNameSnapshot || "Student",
        grade: t.toGrade || "",
        counterpartSchool: otherSchoolName(t.toSchool, ""),
        date: t.decidedAt || t.updatedAt,
      }));

    // --- Event history (organized + participated) within this session ---
    const [organizedRaw, participatedRaw] = await Promise.all([
      Event.find({ eventScope: "SCHOOL", school: schoolId })
        .select("title date lifecycleStatus status resultsPublished academicYearStart")
        .sort({ date: -1 })
        .lean(),
      ParticipationRequest.find({
        school: schoolId,
        status: { $in: ["APPROVED", "ENROLLED"] },
      })
        .populate("event", "title date eventScope")
        .lean(),
    ]);

    const organized = organizedRaw
      // Prefer the stamped academic year; fall back to date-bucketing for
      // events created before year-stamping existed.
      .filter((e) =>
        e.academicYearStart != null
          ? e.academicYearStart === Y
          : inWindow(e.date, window)
      )
      .map((e) => ({
        id: String(e._id),
        title: e.title,
        date: e.date,
        status: e.lifecycleStatus || e.status || "",
        resultsPublished: Boolean(e.resultsPublished),
      }));

    const participatedMap = new Map();
    participatedRaw.forEach((p) => {
      if (!p.event || !inWindow(p.event.date, window)) return;
      const id = String(p.event._id);
      if (!participatedMap.has(id)) {
        participatedMap.set(id, {
          id,
          title: p.event.title,
          date: p.event.date,
          scope: p.event.eventScope || "PLATFORM",
        });
      }
    });
    const participated = Array.from(participatedMap.values()).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return successResponse(200, "Analytics loaded", {
      years: years.map((y) => ({
        year: y.year,
        yearStart: y.yearStart,
        status: y.status,
      })),
      selectedYearStart: Y,
      selectedYearLabel: selectedYear.year,
      summary: selectedYear.summary || {},
      counts: {
        joined: joined.length,
        left: left.length,
        incoming: incoming.length,
        outgoing: outgoing.length,
        organized: organized.length,
        participated: participated.length,
      },
      joined,
      left,
      transfers: { incoming, outgoing },
      events: { organized, participated },
    });
  } catch (err) {
    console.error("GET /api/school/analytics error:", err);
    return internalServerError("Failed to load analytics");
  }
}
