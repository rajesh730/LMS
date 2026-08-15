import { successResponse, internalServerError } from "@/lib/apiResponse";
import {
  requireParentSession,
  getParentChildren,
} from "@/lib/parentAccess";
import {
  listParentNotifications,
  markParentNotificationsRead,
} from "@/lib/parentNotifications";

export const dynamic = "force-dynamic";

/**
 * The guardian's notification inbox (§17).
 *
 * `studentId` is optional here — unlike most parent endpoints, this one can
 * legitimately return a combined inbox across children. §36 allows that
 * provided every row names the child and school, which listParentNotifications
 * guarantees ("Aayush • Green Village").
 *
 * When a studentId IS supplied it is still validated against this parent's
 * links, so it cannot be used to read another family's notifications.
 */
export async function GET(request) {
  try {
    const { parent, error } = await requireParentSession();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const requestedStudentId = searchParams.get("studentId");

    let studentId = null;
    if (requestedStudentId) {
      const children = await getParentChildren(parent._id);
      const match = children.find(
        (child) => child.studentId === String(requestedStudentId)
      );
      // Silently fall back to the combined inbox rather than erroring — the
      // client may hold a stale selection for a child whose link was revoked.
      studentId = match ? match.studentId : null;
    }

    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "20", 10) || 20)
    );

    const result = await listParentNotifications({
      parentId: parent._id,
      studentId,
      page,
      limit,
    });

    return successResponse(200, "Notifications loaded", result);
  } catch (err) {
    console.error("GET /api/parent/notifications error:", err);
    return internalServerError("Failed to load notifications");
  }
}

/** Mark one notification, or the whole inbox, as read. */
export async function PATCH(request) {
  try {
    const { parent, error } = await requireParentSession();
    if (error) return error;

    const body = await request.json().catch(() => ({}));

    const result = await markParentNotificationsRead({
      parentId: parent._id,
      notificationId: body.notificationId || null,
    });

    return successResponse(200, "Marked as read", result);
  } catch (err) {
    console.error("PATCH /api/parent/notifications error:", err);
    return internalServerError("Failed to update notifications");
  }
}
