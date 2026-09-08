import { successResponse, internalServerError } from "@/lib/apiResponse";
import { requireParentSession } from "@/lib/parentAccess";
import { listParentNotifications } from "@/lib/parentNotifications";

export const dynamic = "force-dynamic";

/** The signed-in parent's combined, tenant-labelled notification inbox. */
export async function GET(request) {
  try {
    const { parent, error } = await requireParentSession();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1
    );
    const limit = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(searchParams.get("limit") || "20", 10) || 20
      )
    );
    const result = await listParentNotifications({
      parentId: parent._id,
      page,
      limit,
    });

    return successResponse(200, "Notifications loaded", result);
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return internalServerError("Failed to load notifications");
  }
}

