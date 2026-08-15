import { successResponse, internalServerError } from "@/lib/apiResponse";
import { requireParentChild } from "@/lib/parentAccess";
import {
  buildStudentJourney,
  groupJourney,
  matchesFilter,
  JOURNEY_FILTERS,
  JOURNEY_GROUP_BY,
} from "@/lib/parentJourney";

export const dynamic = "force-dynamic";

/**
 * The child's Journey (§5).
 *
 * Filtering and grouping happen server-side and the response is paginated,
 * because a long journey on a slow connection should not ship the whole history
 * to be filtered in the browser (§22).
 *
 * Requires `canViewPortfolio` — a guardian the school restricted to notices
 * only does not get the child's portfolio (§20).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    const { student, context, error } = await requireParentChild(
      studentId,
      "canViewPortfolio"
    );
    if (error) return error;

    const filter = JOURNEY_FILTERS.includes(
      String(searchParams.get("filter") || "").toUpperCase()
    )
      ? String(searchParams.get("filter")).toUpperCase()
      : "ALL";

    const groupBy = JOURNEY_GROUP_BY.includes(
      String(searchParams.get("groupBy") || "").toUpperCase()
    )
      ? String(searchParams.get("groupBy")).toUpperCase()
      : "YEAR";

    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "40", 10) || 40)
    );

    const journey = await buildStudentJourney(student._id);
    if (!journey) return internalServerError("Failed to build journey");

    const filtered = journey.entries.filter((entry) =>
      matchesFilter(entry, filter)
    );

    const start = (page - 1) * limit;
    const pageEntries = filtered.slice(start, start + limit);

    return successResponse(200, "Journey loaded", {
      child: {
        id: context.studentId,
        name: student.name,
        grade: student.grade || "",
        photoUrl: student.photoUrl || "",
        status: student.status,
        school: { id: context.schoolId, name: context.schoolName },
      },
      // Every school the child has ever attended, so the UI can show that the
      // journey spans more than the current school (§24).
      schools: journey.schools,
      counts: journey.counts,
      filter,
      groupBy,
      groups: groupJourney(pageEntries, groupBy),
      pagination: {
        page,
        limit,
        total: filtered.length,
        hasNextPage: start + limit < filtered.length,
      },
    });
  } catch (err) {
    console.error("GET /api/parent/journey error:", err);
    return internalServerError("Failed to load journey");
  }
}
