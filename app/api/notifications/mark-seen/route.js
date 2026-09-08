import { successResponse, internalServerError } from "@/lib/apiResponse";
import { requireParentSession } from "@/lib/parentAccess";
import { markParentNotificationsSeen } from "@/lib/parentNotifications";

export const dynamic = "force-dynamic";

export async function PATCH() {
  try {
    const { parent, error } = await requireParentSession();
    if (error) return error;

    const result = await markParentNotificationsSeen({ parentId: parent._id });
    return successResponse(200, "Notifications marked as seen", result);
  } catch (error) {
    console.error("PATCH /api/notifications/mark-seen error:", error);
    return internalServerError("Failed to mark notifications as seen");
  }
}

