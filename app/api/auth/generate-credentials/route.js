import { generateStudentCredentials } from "../../../../lib/credentialGenerator.js";
import { successResponse, errorResponse } from "../../../../lib/apiResponse.js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(401, "Unauthorized");
    }

    const { firstName, lastName, schoolId } = await req.json();

    // Validate input
    if (!firstName || !lastName || !schoolId) {
      return errorResponse(
        400,
        "Missing required fields: firstName, lastName, schoolId"
      );
    }

    if (String(schoolId) !== String(session.user.id)) {
      return errorResponse(403, "Forbidden");
    }

    // Generate credentials
    const { username, password } = await generateStudentCredentials(
      firstName,
      lastName,
      schoolId
    );

    return successResponse(200, "Credentials generated successfully", {
      username,
      password, // Plain text for display
    });
  } catch (error) {
    console.error("Credential generation error:", error);
    return errorResponse(500, error.message || "Failed to generate credentials");
  }
}
