import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SupportTicket from "@/models/SupportTicket";
import connectDB from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function GET(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session) {
      return errorResponse(401, "Unauthorized");
    }

    const { searchParams } = new URL(req.url);
    const role = session.user.role;

    let query = {};

    // School admin can only see their own tickets
    if (role === "SCHOOL_ADMIN") {
      query.school = session.user.id;
    }
    // Super admin can see all tickets, optionally filtered
    else if (role === "SUPER_ADMIN") {
      const schoolFilter = searchParams.get("school");
      const statusFilter = searchParams.get("status");

      if (schoolFilter) query.school = schoolFilter;
      if (statusFilter) query.status = statusFilter;
    } else {
      return errorResponse(403, "Forbidden");
    }

    const tickets = await SupportTicket.find(query)
      .populate("school", "name email")
      .populate("replies.author", "name email")
      .populate("internalNotes.author", "name email")
      .populate("resolvedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(200, "Tickets fetched successfully", { tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return errorResponse(500, error.message);
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(401, "Unauthorized");
    }

    const body = await req.json();
    const { title, description, priority, attachments } = body;

    if (!title || !description) {
      return errorResponse(400, "Title and description are required");
    }

    const ticket = new SupportTicket({
      school: session.user.id,
      schoolName: session.user.name || session.user.email,
      title: title.trim(),
      description: description.trim(),
      priority: priority || "medium",
      attachments: attachments || [],
      status: "pending",
    });

    await ticket.save();

    return successResponse(201, "Ticket created successfully", { ticket });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return errorResponse(500, error.message);
  }
}
