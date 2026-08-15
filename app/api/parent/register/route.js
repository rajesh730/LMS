import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import Parent from "@/models/Parent";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { applyRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Create a guardian account (§27, step 2).
 *
 * Creating an account grants NOTHING on its own — a parent with an account and
 * no invitation sees the "Connect to Your Child" screen and nothing else (§26).
 * All access comes from redeeming a school-issued code at /api/parent/link.
 * That separation is what makes open signup safe here.
 *
 * Contrast with school registration, which is reviewed by a super admin: there
 * is nothing to review for a guardian account, because it is inert until a
 * school authorises it.
 */
export async function POST(request) {
  try {
    const ip =
      String(request.headers.get("x-forwarded-for") || "")
        .split(",")[0]
        .trim() || "unknown";

    const rate = await applyRateLimit({
      key: `parent-register:${ip}`,
      windowMs: 60 * 60 * 1000,
      max: 5,
    });
    if (!rate.ok) {
      return errorResponse(
        429,
        `Too many attempts. Try again in ${rate.retryAfter}s.`,
        "RATE_LIMITED"
      );
    }

    const body = await request.json().catch(() => ({}));

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!name) return validationError("Please enter your name");
    // Either contact works as an identifier — many guardians have a phone but
    // no email address, and requiring email would lock them out entirely.
    if (!email && !phone) {
      return validationError("Please enter an email address or phone number");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return validationError("Please enter a valid email address");
    }
    if (password.length < 8) {
      return validationError("Password must be at least 8 characters");
    }

    await connectDB();

    const existing = await Parent.findOne({
      $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      isDeleted: { $ne: true },
    })
      .select("_id")
      .lean();

    if (existing) {
      return errorResponse(
        409,
        "An account already exists for these details. Please sign in.",
        "ALREADY_EXISTS"
      );
    }

    const parent = await Parent.create({
      name,
      email: email || undefined,
      phone: phone || undefined,
      password: await bcrypt.hash(password, 10),
      status: "ACTIVE",
    });

    return successResponse(201, "Account created", {
      parentId: String(parent._id),
      // The client signs in next, then lands on /parent/link.
      needsChildLink: true,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return errorResponse(
        409,
        "An account already exists for these details. Please sign in.",
        "ALREADY_EXISTS"
      );
    }
    console.error("POST /api/parent/register error:", err);
    return internalServerError("Failed to create your account");
  }
}
