import { generateStudentCredentials } from "../../../../lib/credentialGenerator.js";
import { successResponse, errorResponse } from "../../../../lib/apiResponse.js";

export async function POST(req) {
  try {
    const { firstName, lastName, schoolId } = await req.json();

    // Validate input
    if (!firstName || !lastName || !schoolId) {
      return errorResponse(
        400,
        "Missing required fields: firstName, lastName, schoolId"
      );
    }

    // Generate credentials
    const { username, password, hashedPassword } =
      await generateStudentCredentials(firstName, lastName, schoolId);

    return successResponse(
      200,
      "Credentials generated successfully",
      {
        username,
        password, // Plain text for display
      }
    );
  } catch (error) {
    console.error("Credential generation error:", error);
    return errorResponse(
      500,
      error.message || "Failed to generate credentials"
    );
  }
}
