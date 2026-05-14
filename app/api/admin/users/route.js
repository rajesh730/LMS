import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { recordSettingsAudit } from "@/lib/settingsAudit";
import {
  errorResponse,
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isStrongPassword(value) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(String(value || ""));
}

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return unauthorizedError();
    }

    await connectDB();
    const admins = await User.find({ role: "SUPER_ADMIN" })
      .sort({ isDefaultAdmin: -1, createdAt: 1 })
      .select("name email status isDefaultAdmin createdAt updatedAt");

    return successResponse(200, "Super admins retrieved.", {
      count: admins.length,
      currentAdminId: session.user.id,
      admins: admins.map(serializeAdmin),
    });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return errorResponse(500, "Failed to load super admins.");
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return unauthorizedError();
    }

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const currentPassword = String(body?.currentPassword || "");

    if (!name || !email || !password || !currentPassword) {
      return validationError(
        "Name, email, new admin password, and your current password are required."
      );
    }

    if (!isValidEmail(email)) {
      return validationError("Please provide a valid email address.");
    }

    if (!isStrongPassword(password)) {
      return validationError(
        "Password must be at least 8 characters and include a letter and a number."
      );
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
        "Your current password is required to create another super admin."
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(409, "A user with this email already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "SUPER_ADMIN",
      status: "APPROVED",
      isDefaultAdmin: false,
    });

    await recordSettingsAudit({
      entityType: "SUPER_ADMIN_USER",
      entityId: user._id,
      action: "CREATE",
      performedBy: session.user.id,
      role: session.user.role,
      before: null,
      after: serializeAdmin(user),
    });

    return successResponse(201, "Super admin created.", serializeAdmin(user));
  } catch (error) {
    console.error("Admin users POST error:", error);
    return errorResponse(500, "Failed to create super admin.");
  }
}
