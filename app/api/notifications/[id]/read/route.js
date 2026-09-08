import {
  successResponse,
  notFoundError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireParentSession } from "@/lib/parentAccess";
import { markParentNotificationRead } from "@/lib/parentNotifications";

export const dynamic = "force-dynamic";

export async function PATCH(_request, { params }) {
  try {
    const { parent, error } = await requireParentSession();
    if (error) return error;

    const { id } = await params;
    const result = await markParentNotificationRead({
      parentId: parent._id,
      notificationId: id,
    });
    // A missing row and another parent's row intentionally look identical.
    if (!result.found) return notFoundError("Notification");

    return successResponse(200, "Notification marked as read", result);
  } catch (error) {
    console.error("PATCH /api/notifications/[id]/read error:", error);
    return internalServerError("Failed to mark notification as read");
  }
}
