import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SupportTicket from "@/models/SupportTicket";
import connectDB from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session) {
      return errorResponse(401, "Unauthorized");
    }

    const ticket = await SupportTicket.findById(id)
      .populate("school", "name email")
      .populate("replies.author", "name email role")
      .populate("internalNotes.author", "name email role")
      .populate("resolvedBy", "name email")
      .lean();

    if (!ticket) {
      return errorResponse(404, "Ticket not found");
    }

    if (session.user.role === "SUPER_ADMIN") {
      return successResponse(200, "Ticket fetched successfully", { ticket });
    }

    if (
      session.user.role === "SCHOOL_ADMIN" &&
      ticket.school._id.toString() !== session.user.id
    ) {
      return errorResponse(403, "Forbidden");
    }

    return successResponse(200, "Ticket fetched successfully", { ticket });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return errorResponse(500, "Internal server error: " + error.message);
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;

    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session) {
      return errorResponse(401, "Unauthorized");
    }

    const body = await req.json();
    const { action, message, status, internalNote, sendNotification } = body;

    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      return errorResponse(404, "Ticket not found");
    }

    // Authorization check
    if (
      session.user.role === "SCHOOL_ADMIN" &&
      ticket.school.toString() !== session.user.id
    ) {
      return errorResponse(403, "Forbidden");
    }

    // Only super admin can add internal notes and change status to in-progress
    if (
      internalNote &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return errorResponse(403, "Only super admin can add internal notes");
    }

    // Check status change permissions
    if (status) {
      // Only super admin can change to in-progress, both can resolve
      if (
        status === "in-progress" &&
        session.user.role !== "SUPER_ADMIN"
      ) {
        return errorResponse(403, "Only super admin can change status to in-progress");
      }

      // School admin can only resolve their own tickets
      if (
        status === "resolved" &&
        session.user.role === "SCHOOL_ADMIN" &&
        ticket.school.toString() !== session.user.id
      ) {
        return errorResponse(403, "Can only resolve your own tickets");
      }
    }

    // Add reply
    if (action === "reply" && message) {
      ticket.replies.push({
        author: session.user.id,
        authorName: session.user.name || session.user.email,
        authorRole: session.user.role,
        message: message.trim(),
      });
    }

    // Update status (super admin only)
    if (status) {
      if (!["pending", "in-progress", "resolved"].includes(status)) {
        return errorResponse(400, "Invalid status");
      }

      ticket.status = status;

      // Auto-set resolved timestamp
      if (status === "resolved") {
        ticket.resolvedAt = new Date();
        ticket.resolvedBy = session.user.id;
      }
    }

    // Add internal note (super admin only)
    if (internalNote) {
      ticket.internalNotes.push({
        author: session.user.id,
        authorName: session.user.name || session.user.email,
        note: internalNote.trim(),
      });
    }

    await ticket.save();

    const updatedTicket = await SupportTicket.findById(id)
      .populate("school", "name email")
      .populate("replies.author", "name email role")
      .populate("internalNotes.author", "name email role")
      .populate("resolvedBy", "name email");

    // Send email notification if ticket is resolved
    if (status === "resolved" && sendNotification) {
      try {
        const schoolEmail = updatedTicket.school.email;
        const schoolName = updatedTicket.schoolName;

        // Email template (in production, use a proper email service like SendGrid, Mailgun, etc.)
        const emailBody = `
Dear ${schoolName},

Your support ticket has been resolved!

Ticket: ${updatedTicket.title}
Status: Resolved
Resolution: ${message || "Thank you for contacting our support team. Your issue has been resolved."}

Ticket ID: ${updatedTicket._id}

If you have any further questions, please feel free to create a new support ticket.

Best regards,
E-Grantha Support Team
        `;

        // TODO: Integrate actual email service (SendGrid, Mailgun, etc.)
      } catch (emailError) {
        console.error("Error sending notification email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return successResponse(
      200,
      "Ticket updated successfully",
      { ticket: updatedTicket }
    );
  } catch (error) {
    console.error("Error updating ticket:", error);
    return errorResponse(500, error.message);
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return errorResponse(403, "Only super admin can delete tickets");
    }

    const ticket = await SupportTicket.findByIdAndDelete(id);

    if (!ticket) {
      return errorResponse(404, "Ticket not found");
    }

    return successResponse(200, "Ticket deleted successfully");
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return errorResponse(500, error.message);
  }
}
