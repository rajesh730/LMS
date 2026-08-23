import connectDB from "@/lib/db";
import { errorResponse, internalServerError, successResponse } from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import { createWebsiteApiKey } from "@/lib/websiteApiAuth";
import SchoolWebsiteApiKey from "@/models/SchoolWebsiteApiKey";

export async function GET() {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;
    await connectDB();
    const keys = await SchoolWebsiteApiKey.find({ school: getSessionSchoolId(session) })
      .select("name prefix lastFour lastUsedAt revokedAt createdAt")
      .sort({ createdAt: -1 })
      .lean();
    return successResponse(200, "Website API keys loaded", keys);
  } catch (error) {
    console.error("GET school website API keys error:", error);
    return internalServerError("Failed to load website API keys");
  }
}

export async function POST(request) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;
    const schoolId = getSessionSchoolId(session);
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "Official school website").trim().slice(0, 80);
    if (!name) return errorResponse(400, "Key name is required", "NAME_REQUIRED");

    await connectDB();
    const activeCount = await SchoolWebsiteApiKey.countDocuments({
      school: schoolId,
      revokedAt: null,
    });
    if (activeCount >= 5) {
      return errorResponse(409, "Revoke an existing key before creating another.", "KEY_LIMIT");
    }

    const generated = createWebsiteApiKey();
    const created = await SchoolWebsiteApiKey.create({
      school: schoolId,
      name,
      keyHash: generated.keyHash,
      prefix: generated.prefix,
      lastFour: generated.lastFour,
      createdBy: session.user.id,
    });

    return successResponse(201, "API key created. Copy it now; it will not be shown again.", {
      id: String(created._id),
      name: created.name,
      apiKey: generated.rawKey,
      lastFour: created.lastFour,
      createdAt: created.createdAt,
    });
  } catch (error) {
    console.error("POST school website API key error:", error);
    return internalServerError("Failed to create website API key");
  }
}
