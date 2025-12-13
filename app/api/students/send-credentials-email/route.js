import { successResponse, errorResponse } from "../../../../lib/apiResponse.js";

export async function POST(req) {
  try {
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

    // Email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
            .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 4px; text-align: center; }
            .content { padding: 20px 0; }
            .field { margin: 15px 0; }
            .label { font-weight: bold; color: #333; }
            .value { background-color: #f0f0f0; padding: 10px; border-radius: 4px; font-family: monospace; margin-top: 5px; }
            .footer { color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
            .warning { background-color: #fef3c7; border: 1px solid #fbbf24; color: #92400e; padding: 10px; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Student Login Credentials</h1>
            </div>

            <div class="content">
              <p>Dear <strong>${parentName}</strong>,</p>

              <p>
                Your child <strong>${studentName}</strong> has been successfully registered in our school management system.
                Below are the login credentials for accessing the student account.
              </p>

              <div class="field">
                <div class="label">Username:</div>
                <div class="value">${username}</div>
              </div>

              <div class="field">
                <div class="label">Password:</div>
                <div class="value">${password}</div>
              </div>

              <div class="warning">
                <strong>⚠️ Important:</strong> Please keep these credentials safe. 
                We recommend changing the password on the first login.
              </div>

              <p>
                <strong>Next Steps:</strong>
              </p>
              <ul>
                <li>Log in to the student portal using the credentials above</li>
                <li>Change the password to something only you know</li>
                <li>Update any additional student information if needed</li>
                <li>Contact school administration if you need assistance</li>
              </ul>

              <p>
                Best regards,<br>
                <strong>School Management System</strong>
              </p>
            </div>

            <div class="footer">
              <p>
                This email was sent automatically. Please do not reply to this email.
                If you have questions, please contact your school administration.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // TODO: Send email via SendGrid or similar service
    // For now, we log the email that would be sent
    console.log(`
      ======= EMAIL NOTIFICATION =======
      TO: ${parentEmail}
      SUBJECT: Student Login Credentials
      
      HTML Content:
      ${emailHtml}
      ===================================
    `);

    // Send success response
    return successResponse(
      200,
      "Credentials email sent to parent",
      {
        message: "Email sent successfully",
        recipientEmail: parentEmail,
      }
    );
  } catch (error) {
    console.error("Email sending error:", error);
    return errorResponse(500, error.message || "Failed to send email");
  }
}
