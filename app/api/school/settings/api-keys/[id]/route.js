import connectDB from "@/lib/db";
import { errorResponse, internalServerError, successResponse } from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import SchoolWebsiteApiKey from "@/models/SchoolWebsiteApiKey";

export async function DELETE(_request, { params }) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;
    const { id } = await params;
    await connectDB();
    const key = await SchoolWebsiteApiKey.findOneAndUpdate(
      { _id: id, school: getSessionSchoolId(session), revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { new: true }
    );
    if (!key) return errorResponse(404, "Active API key not found", "NOT_FOUND");
    return successResponse(200, "Website API key revoked");
  } catch (error) {
    console.error("DELETE school website API key error:", error);
    return internalServerError("Failed to revoke website API key");
  }
}
