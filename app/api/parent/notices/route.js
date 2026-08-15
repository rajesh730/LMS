import { successResponse, internalServerError } from "@/lib/apiResponse";
import { requireParentChild } from "@/lib/parentAccess";
import {
  listNoticesForStudent,
  sectionNotices,
} from "@/lib/parentNotices";

export const dynamic = "force-dynamic";

/**
 * The Parent Notice Centre list (§11).
 *
 * IMPORTANT: this endpoint records DELIVERY only. It must never set `openedAt`
 * — a notice appearing in a list is not the parent having read it. Opening is
 * recorded solely by GET /api/parent/notices/[id].
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    const { parent, student, context, error } = await requireParentChild(
      studentId,
      "canReceiveNotices"
    );
    if (error) return error;

    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "20", 10) || 20)
    );

    const { notices, total } = await listNoticesForStudent({
      parentId: parent._id,
      student,
      page,
      limit,
    });

    return successResponse(200, "Notices loaded", {
      child: {
        id: context.studentId,
        name: student.name,
        school: { id: context.schoolId, name: context.schoolName },
      },
      sections: sectionNotices(notices),
      pagination: {
        page,
        limit,
        total,
        hasNextPage: page * limit < total,
      },
    });
  } catch (err) {
    console.error("GET /api/parent/notices error:", err);
    return internalServerError("Failed to load notices");
  }
}
