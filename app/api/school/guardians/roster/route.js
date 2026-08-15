import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import {
  successResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import { parsePagination, buildPagination, escapeRegex } from "@/lib/pagination";
import { getEquivalentGradeValues } from "@/lib/schoolGrades";
import {
  buildRosterRows,
  summariseCoverage,
  classifyCoverage,
  COVERAGE_STATES,
} from "@/lib/guardianRoster";
import { runGuardianBackfill } from "@/lib/guardianBackfill";

export const dynamic = "force-dynamic";

/**
 * School-wide guardian roster (one row per student).
 *
 * Answers the question the old master/detail screen could not: *which of my
 * students has nobody connected?*
 *
 * Query shape is fixed at four round trips regardless of school size —
 * count, students page, links for that page, parents for those links. A
 * per-student lookup would be an N+1 against a cluster where latency, not CPU,
 * is the bottleneck.
 *
 * The one unavoidable compromise: filtering by COVERAGE requires knowing each
 * student's links, which cannot be expressed in the student query. That filter
 * is therefore applied after loading, over a capped candidate set — see below.
 */
export async function GET(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
    ]);
    if (error) return error;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const schoolId =
      session.user.role === "SUPER_ADMIN"
        ? searchParams.get("schoolId") || getSessionSchoolId(session)
        : getSessionSchoolId(session);

    const grade = searchParams.get("grade") || "";
    const search = String(searchParams.get("search") || "").trim();
    const coverage = COVERAGE_STATES.includes(searchParams.get("coverage"))
      ? searchParams.get("coverage")
      : "ALL";

    const { page, limit, skip } = parsePagination(searchParams, {
      limit: 25,
      maxLimit: 200,
    });

    // Close the gap for students registered before Parent Access existed,
    // automatically. Batched, idempotent, and self-stopping once complete —
    // see lib/guardianBackfill.js. Awaited so the rows below already reflect
    // it, which is why a school never sees "not imported" and has to act.
    const backfill = await runGuardianBackfill(schoolId);

    // --- Student query ------------------------------------------------------
    const studentQuery = {
      school: schoolId,
      isDeleted: { $ne: true },
      // Alumni and transferred students keep their guardians (§46), so the
      // roster covers everyone except soft-deleted records.
      status: { $ne: "INACTIVE" },
    };

    if (grade) {
      // Grades are messy in production ("9" / "Grade 9" / "Class 9"), so match
      // every equivalent form rather than an exact string.
      studentQuery.grade = { $in: getEquivalentGradeValues(grade) };
    }

    if (search) {
      const safe = escapeRegex(search);
      studentQuery.$or = [
        { name: { $regex: safe, $options: "i" } },
        { rollNumber: { $regex: safe, $options: "i" } },
        { platformStudentId: { $regex: safe, $options: "i" } },
        // Searching the registration parent name matters: it is how a school
        // finds "the Sharma family" before any guardian account exists.
        { parentName: { $regex: safe, $options: "i" } },
      ];
    }

    // Coverage filtering needs link data, so the page cannot be sliced in Mongo.
    // Load a bounded candidate window instead, classify, then paginate. The cap
    // keeps a 2,000-student school from pulling everything into memory.
    const needsPostFilter = coverage !== "ALL";
    const CANDIDATE_CAP = 1500;

    const [totalMatching, students] = await Promise.all([
      Student.countDocuments(studentQuery),
      Student.find(studentQuery)
        .sort({ grade: 1, name: 1 })
        .skip(needsPostFilter ? 0 : skip)
        .limit(needsPostFilter ? CANDIDATE_CAP : limit)
        .select(
          "name grade rollNumber status parentName parentEmail parentContactNumber guardianRelationship"
        )
        .lean(),
    ]);

    if (students.length === 0) {
      return successResponse(200, "Roster loaded", {
        rows: [],
        summary: summariseCoverage([]),
        pagination: buildPagination({ page, limit, total: 0 }),
        coverage,
        autoLinked: backfill.linked,
        backfillInProgress: false,
      });
    }

    const studentIds = students.map((s) => s._id);

    const links = await ParentStudentLink.find({ student: { $in: studentIds } })
      .select(
        "parent student status relationshipType isPrimaryGuardian canGiveConsent canReceiveNotices"
      )
      .lean();

    const parents = links.length
      ? await Parent.find({
          _id: { $in: Array.from(new Set(links.map((l) => String(l.parent)))) },
          isDeleted: { $ne: true },
        })
          .select("name parentId email phone accessState isHousehold householdName")
          .lean()
      : [];

    let rows = buildRosterRows({ students, links, parents });

    // Summary always describes the FULL filtered set, not the visible page —
    // "12 students with nobody connected" must not change as you page.
    const summaryRows = needsPostFilter ? rows : null;

    let total = totalMatching;

    if (needsPostFilter) {
      rows = rows.filter((row) => row.coverage === coverage);
      total = rows.length;
      rows = rows.slice(skip, skip + limit);
    }

    // For the unfiltered case the summary needs counts across everything, which
    // the loaded page alone cannot give. Compute it from a lightweight pass.
    const summary = needsPostFilter
      ? summariseCoverage(summaryRows)
      : await computeSchoolSummary(studentQuery);

    return successResponse(200, "Roster loaded", {
      rows,
      summary,
      pagination: buildPagination({ page, limit, total }),
      coverage,
      // Warn the UI when a coverage filter hit the candidate cap, so it can say
      // so rather than silently showing a partial answer.
      truncated: needsPostFilter && students.length >= CANDIDATE_CAP,
      // So the UI can report what just happened by itself, and keep polling
      // while a large school is still being worked through.
      autoLinked: backfill.linked,
      idsAssigned: backfill.idsAssigned || 0,
      guardiansSplit: backfill.guardiansSplit || 0,
      backfillInProgress: backfill.remaining === -1,
    });
  } catch (err) {
    console.error("GET /api/school/guardians/roster error:", err);
    return internalServerError("Failed to load the guardian roster");
  }
}

/**
 * Coverage counts across every matching student, not just the current page.
 *
 * Uses lean projections and two bulk reads. Deliberately not an aggregation
 * pipeline: the classification rules (including the "registration data on file"
 * case) live in lib/guardianRoster.js and must not be duplicated in Mongo query
 * language where they would drift.
 */
async function computeSchoolSummary(studentQuery) {
  const students = await Student.find(studentQuery)
    .select("_id parentName")
    .lean();

  if (students.length === 0) return summariseCoverage([]);

  const links = await ParentStudentLink.find({
    student: { $in: students.map((s) => s._id) },
  })
    .select("parent student status")
    .lean();

  const parents = links.length
    ? await Parent.find({
        _id: { $in: Array.from(new Set(links.map((l) => String(l.parent)))) },
      })
        .select("accessState")
        .lean()
    : [];

  const accessByParent = new Map(
    parents.map((p) => [String(p._id), p.accessState])
  );
  const linksByStudent = new Map();
  links.forEach((link) => {
    const key = String(link.student);
    if (!linksByStudent.has(key)) linksByStudent.set(key, []);
    linksByStudent.get(key).push({
      ...link,
      parentAccessState: accessByParent.get(String(link.parent)) || "NOT_CREATED",
    });
  });

  const rows = students.map((student) => ({
    coverage: classifyCoverage(student, linksByStudent.get(String(student._id)) || []),
  }));

  return summariseCoverage(rows);
}
