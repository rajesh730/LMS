import { successResponse, internalServerError } from "@/lib/apiResponse";
import { requireParentChild } from "@/lib/parentAccess";
import { buildParentHome } from "@/lib/parentHome";
import { countOutstandingNotices } from "@/lib/parentNotices";
import { countUnreadParentNotifications } from "@/lib/parentNotifications";

export const dynamic = "force-dynamic";

/**
 * Parent Home for the selected child (§3, §30).
 *
 * `studentId` comes from the query string but is treated as a CLAIM:
 * requireParentChild resolves it against an ACTIVE ParentStudentLink and hands
 * back the verified student. Nothing below re-reads the request for identity.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    const { parent, student, link, permissions, context, error } =
      await requireParentChild(studentId);
    if (error) return error;

    const simpleMode = Boolean(parent.preferences?.simpleMode);

    const [home, noticeCounts, unreadNotifications] = await Promise.all([
      buildParentHome({ parent, student, link, simpleMode }),
      countOutstandingNotices({ parentId: parent._id, student }),
      countUnreadParentNotifications({
        parentId: parent._id,
        studentId: student._id,
      }),
    ]);

    return successResponse(200, "Home loaded", {
      child: {
        id: context.studentId,
        name: student.name,
        grade: student.grade || "",
        photoUrl: student.photoUrl || "",
        status: student.status,
        school: {
          id: context.schoolId,
          name: context.schoolName,
        },
      },
      permissions,
      cards: home.cards,
      badges: {
        notices: noticeCounts.actionRequired + noticeCounts.unread,
        noticesActionRequired: noticeCounts.actionRequired,
        notifications: unreadNotifications,
      },
      simpleMode,
      generatedAt: home.generatedAt,
    });
  } catch (err) {
    console.error("GET /api/parent/home error:", err);
    return internalServerError("Failed to load home");
  }
}
