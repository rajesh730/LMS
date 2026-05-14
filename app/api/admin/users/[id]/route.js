import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { recordSettingsAudit } from "@/lib/settingsAudit";
import {
  errorResponse,
  notFoundError,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";

function serializeAdmin(user) {
  return {
    id: user._id.toString(),
    name: user.name || "",
    email: user.email,
    status: user.status,
    isDefaultAdmin: Boolean(user.isDefaultAdmin),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return unauthorizedError();
    }

    const body = await req.json();
    const action = String(body?.action || "").trim().toLowerCase();
    const currentPassword = String(body?.currentPassword || "");
    const targetId = params?.id;

    if (!targetId) {
      return validationError("Target admin id is required.");
    }

    if (!["deactivate", "reactivate"].includes(action)) {
      return validationError("Action must be deactivate or reactivate.");
    }

    if (!currentPassword) {
      return validationError("Your current password is required.");
    }

    await connectDB();

    const actingAdmin = await User.findById(session.user.id);
    if (!actingAdmin) {
      return unauthorizedError();
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      actingAdmin.password
    );
    if (!passwordMatches) {
      return errorResponse(
        403,
        "Your current password is required to manage super admin access."
      );
    }

    const targetAdmin = await User.findById(targetId);
    if (!targetAdmin || targetAdmin.role !== "SUPER_ADMIN") {
      return notFoundError("Super admin");
    }

    if (action === "deactivate") {
      if (targetAdmin._id.toString() === session.user.id) {
        return errorResponse(
          400,
          "You cannot deactivate your own super admin account from this screen."
        );
      }

      const activeSuperAdmins = await User.countDocuments({
        role: "SUPER_ADMIN",
        status: { $nin: ["UNSUBSCRIBED", "REJECTED"] },
      });

      if (activeSuperAdmins <= 1) {
        return errorResponse(
          400,
          "The last active super admin cannot be deactivated."
        );
      }

      if (targetAdmin.status === "UNSUBSCRIBED") {
        return successResponse(
          200,
          "Super admin already inactive.",
          serializeAdmin(targetAdmin)
        );
      }

      const before = targetAdmin.toObject();
      targetAdmin.status = "UNSUBSCRIBED";
      await targetAdmin.save();

      await recordSettingsAudit({
        entityType: "SUPER_ADMIN_USER",
        entityId: targetAdmin._id,
        action: "DEACTIVATE",
        performedBy: session.user.id,
        role: session.user.role,
        before,
        after: targetAdmin.toObject(),
      });

      return successResponse(
        200,
        "Super admin deactivated.",
        serializeAdmin(targetAdmin)
      );
    }

    const before = targetAdmin.toObject();
    targetAdmin.status = "APPROVED";
    await targetAdmin.save();

    await recordSettingsAudit({
      entityType: "SUPER_ADMIN_USER",
      entityId: targetAdmin._id,
      action: "REACTIVATE",
      performedBy: session.user.id,
      role: session.user.role,
      before,
      after: targetAdmin.toObject(),
    });

    return successResponse(
      200,
      "Super admin reactivated.",
      serializeAdmin(targetAdmin)
    );
  } catch (error) {
    console.error("Admin users PATCH error:", error);
    return errorResponse(500, "Failed to update super admin.");
  }
}
