import connectDB from "@/lib/db";
import Notice from "@/models/Notice";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireParentChild } from "@/lib/parentAccess";
import {
  buildNoticeQuery,
  decorateNotice,
  markNoticeOpened,
  getGuardianReadStates,
} from "@/lib/parentNotices";

export const dynamic = "force-dynamic";

/**
 * Notice detail — and the ONLY place a read receipt is created (§11).
 *
 * The open is recorded AFTER the notice has been fetched and confirmed
 * deliverable to this child, never before. If the notice does not exist, is not
 * targeted at this parent, or the request fails authorisation, nothing is
 * written — so a probe cannot mark notices read.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    const { parent, student, context, error } = await requireParentChild(
      studentId,
      "canReceiveNotices"
    );
    if (error) return error;

    await connectDB();

    // Re-apply the full targeting query rather than a bare findById: a notice
    // this child was never sent must 404 even if the parent knows its id.
    const notice = await Notice.findOne({
      _id: id,
      ...buildNoticeQuery(student),
    }).lean();

    if (!notice) {
      return errorResponse(404, "Notice not found", "NOT_FOUND");
    }

    // Delivery confirmed and content assembled — now the open is genuine.
    const receipt = await markNoticeOpened({
      noticeId: notice._id,
      parentId: parent._id,
      student,
    });

    const guardians = await getGuardianReadStates({
      noticeId: notice._id,
      studentId: student._id,
    });

    return successResponse(200, "Notice loaded", {
      child: {
        id: context.studentId,
        name: student.name,
        school: { id: context.schoolId, name: context.schoolName },
      },
      notice: {
        ...decorateNotice(notice, receipt),
        // Full body only on the detail view.
        content: notice.content,
        attachments: notice.attachments || [],
      },
      // "Mother: ✓ Read · Father: ○ Not read" (§11). Names + relationship only,
      // never another guardian's contact details (§19).
      guardians,
      canGiveConsent: Boolean(context.permissions.canGiveConsent),
    });
  } catch (err) {
    console.error("GET /api/parent/notices/[id] error:", err);
    return internalServerError("Failed to load notice");
  }
}
