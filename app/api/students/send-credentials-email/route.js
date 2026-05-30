import { successResponse, errorResponse } from "../../../../lib/apiResponse.js";
import { requireApiSession } from "../../../../lib/authz.js";
import { sendStudentCredentialsEmail } from "../../../../lib/emailService.js";

export async function POST(req) {
  try {
    const { error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const {
      parentEmail,
      parentName,
      studentName,
      username,
      password,
    } = await req.json();

    // Validate required fields
    if (
      !parentEmail ||
      !parentName ||
      !studentName ||
      !username ||
      !password
    ) {
      return errorResponse(400, "Missing required fields");
    }

    // Send email via Resend
    const emailResult = await sendStudentCredentialsEmail(
      parentEmail,
      parentName,
      studentName,
      username,
      password
    );

    if (!emailResult.success) {
      console.error("Email sending failed:", emailResult.error);
      return errorResponse(500, "Failed to send credentials email: " + emailResult.error);
    }

    // Send success response
    return successResponse(
      200,
      "Credentials email sent successfully",
      {
        message: "Student credentials email has been sent to " + parentEmail,
        recipientEmail: parentEmail,
        messageId: emailResult.messageId,
      }
    );
  } catch (error) {
    console.error("Email sending error:", error);
    return errorResponse(500, error.message || "Failed to send email");
  }
}
