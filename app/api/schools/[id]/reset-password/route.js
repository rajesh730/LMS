import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { hashPassword } from "@/lib/credentialGenerator";
import {
  errorResponse,
  notFoundError,
  successResponse,
  unauthorizedError,
} from "@/lib/apiResponse";

const SCHOOL_RESET_TEMP_PASSWORD = "password@123";

export async function POST(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return unauthorizedError();
    }

    const params = await props.params;

    await connectDB();

    const school = await User.findById(params.id);
    if (!school || school.role !== "SCHOOL_ADMIN") {
      return notFoundError("School admin");
    }

    const temporaryPassword = SCHOOL_RESET_TEMP_PASSWORD;
    const hashedPassword = await hashPassword(temporaryPassword);
    const before = {
      email: school.email,
      status: school.status,
      authVersion: school.authVersion || 0,
      updatedAt: school.updatedAt,
    };

    school.password = hashedPassword;
    school.authVersion = (school.authVersion || 0) + 1;
    await school.save();

    await AuditLog.create({
      entityType: "SCHOOL_ADMIN_USER",
      entityId: school._id,
      action: "PASSWORD_RESET",
      performedBy: session.user.id,
      role: session.user.role,
      reason: "Support-triggered school admin password reset",
      before,
      after: {
        email: school.email,
        status: school.status,
        authVersion: school.authVersion || 0,
        updatedAt: school.updatedAt,
      },
    });

    return successResponse(200, "School admin password reset.", {
      credentials: {
        name: school.schoolName || school.name || "School Admin",
        email: school.email,
        password: temporaryPassword,
      },
    });
  } catch (error) {
    console.error("School password reset error:", error);
    return errorResponse(500, "Failed to reset school admin password.");
  }
}
