import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { logActivity } from "@/lib/activityLog";

/**
 * PATCH /api/students/[id]/status
 * Update student status (ACTIVE, SUSPENDED, INACTIVE)
 * Supports: SUSPEND, ACTIVATE, DEACTIVATE
 */
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Only school admins can change student status");
    }

    await connectDB();

    const { id } = await params;
    const { action, reason } = await req.json();

    // Validate action
    const validActions = ["SUSPEND", "ACTIVATE", "DEACTIVATE"];
    if (!validActions.includes(action)) {
      return errorResponse(400, "Invalid action");
    }

    const student = await Student.findById(id);
    if (!student) {
      return errorResponse(404, "Student not found");
    }

    // Verify student belongs to school
    if (student.school.toString() !== session.user.schoolId) {
      return errorResponse(403, "Unauthorized");
    }

    const previousStatus = student.status;

    // Update based on action
    switch (action) {
      case "SUSPEND":
        student.status = "SUSPENDED";
        break;
      case "ACTIVATE":
        student.status = "ACTIVE";
        break;
      case "DEACTIVATE":
        student.status = "INACTIVE";
        break;
    }

    student.statusChangedAt = new Date();
    student.statusChangedBy = session.user.id;
    student.statusReason = reason || null;

    await student.save();

    // Log activity
    await logActivity({
      action:
        action === "SUSPEND"
          ? "SUSPEND"
          : action === "ACTIVATE"
          ? "ACTIVATE"
          : "UPDATE",
      targetType: "Student",
      targetId: student._id,
      targetName: student.name,
      performedBy: session.user.id,
      school: session.user.schoolId,
      changes: {
        before: { status: previousStatus },
        after: { status: student.status },
      },
      details: { reason: reason || null },
    });

    return successResponse(
      200,
      `Student ${action.toLowerCase()}d successfully`,
      {
        student: {
          _id: student._id,
          name: student.name,
          status: student.status,
          statusChangedAt: student.statusChangedAt,
        },
      }
    );
  } catch (error) {
    console.error("Error updating student status:", error);
    return internalServerError("Failed to update student status");
  }
}
