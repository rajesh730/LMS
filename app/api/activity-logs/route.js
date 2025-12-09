import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { getActivityLogs, getActivitySummary } from "@/lib/activityLog";

/**
 * GET /api/activity-logs
 * Fetch activity logs for school admin
 * Query params:
 * - action: Filter by action type
 * - targetType: Filter by target type
 * - limit: Number of records (default: 50)
 * - skip: Pagination offset
 * - summary: If "true", return summary instead of full logs
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return errorResponse(401, "Unauthorized");
    }

    if (session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Only school admins can view activity logs");
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const isSummary = searchParams.get("summary") === "true";
    const limit = parseInt(searchParams.get("limit")) || 50;
    const skip = parseInt(searchParams.get("skip")) || 0;

    if (isSummary) {
      // Return dashboard summary
      const daysBack = parseInt(searchParams.get("daysBack")) || 7;
      const summary = await getActivitySummary(session.user.schoolId, daysBack);
      return successResponse(200, "Activity summary retrieved", summary);
    }

    // Build filters
    const filters = {
      limit,
      skip,
    };

    const action = searchParams.get("action");
    if (action) filters.action = action;

    const targetType = searchParams.get("targetType");
    if (targetType) filters.targetType = targetType;

    // Fetch logs
    const logs = await getActivityLogs(session.user.schoolId, filters);

    // Get total count for pagination
    const total = await ActivityLog.countDocuments({
      school: session.user.schoolId,
      ...(action && { action }),
      ...(targetType && { targetType }),
    });

    return successResponse(200, "Activity logs retrieved", {
      logs,
      pagination: {
        total,
        limit,
        skip,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return internalServerError("Failed to fetch activity logs");
  }
}
