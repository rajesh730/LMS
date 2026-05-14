import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import PlatformSetting from "@/models/PlatformSetting";
import {
  errorResponse,
  successResponse,
  unauthorizedError,
} from "@/lib/apiResponse";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return unauthorizedError();
    }

    await connectDB();
    const settings = await PlatformSetting.findOne({ singletonKey: "platform" }).select(
      "_id"
    );

    if (!settings) {
      return successResponse(200, "No platform settings audit history yet", []);
    }

    const logs = await AuditLog.find({
      entityType: "PLATFORM_SETTINGS",
      entityId: settings._id,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("performedBy", "name email")
      .lean();

    return successResponse(200, "Platform settings audit history", logs);
  } catch (error) {
    console.error("Platform settings audit GET error:", error);
    return errorResponse(500, "Failed to load platform settings history");
  }
}
