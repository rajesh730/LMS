import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import {
  errorResponse,
  successResponse,
  unauthorizedError,
} from "@/lib/apiResponse";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return unauthorizedError();
    }

    await connectDB();
    const logs = await AuditLog.find({
      entityType: "SCHOOL_SETTINGS",
      entityId: session.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("performedBy", "name email")
      .lean();

    return successResponse(200, "School settings audit history", logs);
  } catch (error) {
    console.error("School settings audit GET error:", error);
    return errorResponse(500, "Failed to load school settings history");
  }
}
