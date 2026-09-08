import { successResponse, internalServerError } from "@/lib/apiResponse";
import { requireParentSession } from "@/lib/parentAccess";
import { markAllParentNotificationsRead } from "@/lib/parentNotifications";

export const dynamic = "force-dynamic";

export async function PATCH() {
  try {
    const { parent, error } = await requireParentSession();
    if (error) return error;

    const result = await markAllParentNotificationsRead({
      parentId: parent._id,
    });
    return successResponse(200, "All notifications marked as read", result);
  } catch (error) {
    console.error("PATCH /api/notifications/mark-all-read error:", error);
    return internalServerError("Failed to mark all notifications as read");
  }
}

