import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  errorResponse,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import connectDB from "@/lib/db";
import { recordSettingsAudit } from "@/lib/settingsAudit";
import User from "@/models/User";

function isStrongPassword(value) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(String(value || ""));
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return unauthorizedError();
    }

    const body = await req.json();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return validationError(
        "Current password, new password, and confirmation are required."
      );
    }

    if (newPassword !== confirmPassword) {
      return validationError("New password and confirmation do not match.");
    }

    if (!isStrongPassword(newPassword)) {
      return validationError(
        "New password must be at least 8 characters and include a letter and a number."
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id).select(
      "password authVersion role"
    );

    if (!user || user.role !== "SCHOOL_ADMIN") {
      return errorResponse(404, "School account not found");
    }

    const matchesCurrentPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!matchesCurrentPassword) {
      return validationError("Your current password is incorrect.");
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return validationError(
        "New password must be different from your current password."
      );
    }

    const previousAuthVersion = user.authVersion || 0;
    user.password = await bcrypt.hash(newPassword, 10);
    user.authVersion = previousAuthVersion + 1;
    await user.save();

    await recordSettingsAudit({
      entityType: "SCHOOL_SECURITY",
      entityId: user._id,
      action: "PASSWORD_CHANGE",
      performedBy: session.user.id,
      role: session.user.role,
      before: {
        authVersion: previousAuthVersion,
      },
      after: {
        authVersion: user.authVersion,
      },
      reason: "School admin changed account password.",
    });

    return successResponse(200, "Password updated successfully. Please sign in again.");
  } catch (error) {
    console.error("School change password POST error:", error);
    return errorResponse(500, "Failed to change password");
  }
}
