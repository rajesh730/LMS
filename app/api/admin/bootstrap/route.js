import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";
import {
  errorResponse,
  successResponse,
  validationError,
} from "@/lib/apiResponse";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isStrongPassword(value) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(String(value || ""));
}

export async function POST(req) {
  try {
    const bootstrapToken = process.env.SUPER_ADMIN_BOOTSTRAP_TOKEN;
    if (!bootstrapToken) {
      return errorResponse(
        403,
        "Super admin bootstrap is disabled. Define SUPER_ADMIN_BOOTSTRAP_TOKEN to enable first-admin setup."
      );
    }

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const token = String(body?.token || "");

    if (!name || !email || !password || !token) {
      return validationError(
        "Name, email, password, and bootstrap token are required."
      );
    }

    if (token !== bootstrapToken) {
      return errorResponse(403, "Invalid bootstrap token.");
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

    const superAdminCount = await User.countDocuments({ role: "SUPER_ADMIN" });
    if (superAdminCount > 0) {
      return errorResponse(
        409,
        "A super admin already exists. Use the admin management surface to add more admins."
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
      isDefaultAdmin: true,
    });

    return successResponse(201, "Initial super admin created.", {
      id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("Admin bootstrap POST error:", error);
    return errorResponse(500, "Failed to bootstrap super admin.");
  }
}
