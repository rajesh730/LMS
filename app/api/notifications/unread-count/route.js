import { successResponse, internalServerError } from "@/lib/apiResponse";
import { requireParentSession } from "@/lib/parentAccess";
import { countUnreadParentNotifications } from "@/lib/parentNotifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { parent, error } = await requireParentSession();
    if (error) return error;

    const unreadCount = await countUnreadParentNotifications({
      parentId: parent._id,
    });
    return successResponse(200, "Unread notification count loaded", {
      unreadCount,
    });
  } catch (error) {
    console.error("GET /api/notifications/unread-count error:", error);
    return internalServerError("Failed to load notification count");
  }
}

