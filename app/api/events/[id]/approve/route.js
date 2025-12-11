import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import Student from "@/models/Student";

/**
 * PUT /api/events/[id]/approve
 * Batch approve/reject requests for an event
 * Only admin/event creator can do this
 */
export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { id: eventId } = await params;
    const body = await req.json();
    let { requestIds } = body;
    const { action, rejectionReason, schoolId } = body;

    if ((!Array.isArray(requestIds) || requestIds.length === 0) && !schoolId) {
      return NextResponse.json(
        {
          message:
            "requestIds must be a non-empty array or schoolId must be provided",
        },
        { status: 400 }
      );
    }

    if (!["approve", "reject", "pending"].includes(action)) {
      return NextResponse.json(
        { message: "action must be 'approve', 'reject', or 'pending'" },
        { status: 400 }
      );
    }

    // ===== Get event =====
    const event = await Event.findById(eventId);

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Handle case where we want to reject a school but have no request IDs (e.g. manual entry)
    if (
      (!requestIds || requestIds.length === 0) &&
      schoolId &&
      action === "reject"
    ) {
      const schoolIdStr = schoolId.toString();
      // Remove school from participants
      event.participants = event.participants.filter(
        (p) => p.school.toString() !== schoolIdStr
      );
      await event.save();

      // Also try to find any requests for this school and reject them
      await ParticipationRequest.updateMany(
        { event: eventId, school: schoolId },
        {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectionReason: rejectionReason || "Admin rejection",
        }
      );

      return NextResponse.json({ message: "School removed from event" });
    }

    // Handle case where we want to approve a school but have no request IDs (fallback)
    if (
      (!requestIds || requestIds.length === 0) &&
      schoolId &&
      action === "approve"
    ) {
      // Find all pending/rejected requests for this school to approve them
      const pendingRequests = await ParticipationRequest.find({
        event: eventId,
        school: schoolId,
        status: { $in: ["PENDING", "REJECTED"] },
      });

      if (pendingRequests.length === 0) {
        return NextResponse.json(
          { message: "No pending requests found for this school" },
          { status: 404 }
        );
      }
      requestIds = pendingRequests.map((r) => r._id);
    }

    // ===== Get requests =====
    // Allow finding requests in any status (PENDING, APPROVED, REJECTED) to allow changing status
    const requests = await ParticipationRequest.find({
      _id: { $in: requestIds },
      event: eventId,
    }).populate("student", "grade _id"); // Don't need school from student, we have it on request

    if (requests.length === 0) {
      console.log("No requests found for IDs:", requestIds);
      return NextResponse.json(
        { message: "No requests found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const results = {
      approved: [],
      rejected: [],
      failed: [],
    };

    // ===== Process each request =====
    for (const request of requests) {
      try {
        // Use request.school instead of request.student.school for reliability
        const schoolIdStr = request.school.toString();
        const studentIdStr = request.student._id.toString();

        // Helper to remove student from event participants
        const removeStudentFromEvent = () => {
          const schoolParticipant = event.participants.find(
            (p) => p.school.toString() === schoolIdStr
          );
          if (schoolParticipant && schoolParticipant.students) {
            schoolParticipant.students = schoolParticipant.students.filter(
              (sId) => sId.toString() !== studentIdStr
            );
            // If school has no students left, we could remove the school entry, but keeping it is fine
          }
        };

        if (action === "approve") {
          // Check capacity before approving
          if (event.maxParticipants) {
            const totalEnrolled = event.participants.reduce(
              (sum, p) => sum + (p.students ? p.students.length : 0),
              0
            );

            if (totalEnrolled >= event.maxParticipants) {
              results.failed.push({
                requestId: request._id,
                reason: "Event capacity full",
              });
              continue;
            }
          }

          // Check per-school capacity
          if (event.maxParticipantsPerSchool) {
            const schoolParticipant = event.participants.find(
              (p) => p.school.toString() === schoolIdStr
            );

            const schoolCount = schoolParticipant
              ? schoolParticipant.students.length
              : 0;

            if (schoolCount >= event.maxParticipantsPerSchool) {
              results.failed.push({
                requestId: request._id,
                reason: "School capacity full",
              });
              continue;
            }
          }

          // Update request
          request.status = "APPROVED";
          request.approvedAt = now;
          request.approvedBy = session.user.id;
          request.enrollmentConfirmedAt = now;
          request.studentNotifiedAt = now;
          request.rejectedAt = null;
          request.rejectionReason = null;

          // Add to event participants
          const schoolParticipant = event.participants.find(
            (p) => p.school.toString() === schoolIdStr
          );

          if (schoolParticipant) {
            // Use string comparison for ObjectIds to be safe
            const studentExists = schoolParticipant.students.some(
              (sId) => sId.toString() === request.student._id.toString()
            );

            if (!studentExists) {
              schoolParticipant.students.push(request.student._id);
            }
          } else {
            event.participants.push({
              school: request.school,
              students: [request.student._id],
              joinedAt: now,
            });
          }

          await request.save();
          results.approved.push(request._id);
        } else if (action === "reject") {
          // Remove from event participants if they were previously approved
          removeStudentFromEvent();

          // Update request
          request.status = "REJECTED";
          request.rejectedAt = now;
          request.approvedBy = session.user.id;
          request.rejectionReason = rejectionReason || "Admin rejection";
          request.studentNotifiedAt = now;
          request.approvedAt = null;
          request.enrollmentConfirmedAt = null;

          await request.save();
          results.rejected.push(request._id);
        } else if (action === "pending") {
          // Remove from event participants if they were previously approved
          removeStudentFromEvent();

          // Update request
          request.status = "PENDING";
          request.approvedAt = null;
          request.rejectedAt = null;
          request.rejectionReason = null;
          request.enrollmentConfirmedAt = null;
          request.approvedBy = null;

          await request.save();
          // We can track pending resets in 'approved' or a new array, but let's put in approved for now as "success"
          results.approved.push(request._id);
        }
      } catch (error) {
        console.error("Error processing request:", request._id, error);
        results.failed.push({
          requestId: request._id,
          reason: error.message,
        });
      }
    }

    // Save event changes (always save if we processed anything, as removals might have happened)
    if (results.approved.length > 0 || results.rejected.length > 0) {
      // Cleanup empty participants (schools with 0 students)
      event.participants = event.participants.filter(
        (p) => p.students && p.students.length > 0
      );

      await event.save();
    }

    return NextResponse.json(
      {
        message: `Processed ${
          results.approved.length + results.rejected.length
        } requests`,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error approving requests:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/[id]/approve
 * Get all pending requests for an event
 * Only admin can view
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { id: eventId } = params;

    // Get event
    const event = await Event.findById(eventId).populate("createdBy", "name");

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Get all pending requests
    const requests = await ParticipationRequest.find({
      event: eventId,
      status: "PENDING",
    })
      .populate("student", "name email grade")
      .populate("school", "name")
      .sort({ requestedAt: 1 })
      .lean();

    // Get capacity info
    const capacityInfo = {
      total: event.maxParticipants || null,
      filled: event.participants.reduce(
        (sum, p) => sum + (p.students ? p.students.length : 0),
        0
      ),
      pending: requests.length,
    };

    if (capacityInfo.total) {
      capacityInfo.available = Math.max(
        0,
        capacityInfo.total - capacityInfo.filled
      );
      capacityInfo.percentage = Math.round(
        (capacityInfo.filled / capacityInfo.total) * 100
      );
    }

    return NextResponse.json(
      {
        event: {
          id: event._id,
          title: event.title,
          date: event.date,
          createdBy: event.createdBy,
        },
        capacityInfo,
        requests: requests.map((r) => ({
          id: r._id,
          studentName: r.student.name,
          studentEmail: r.student.email,
          studentGrade: r.student.grade,
          schoolName: r.school.name,
          requestedAt: r.requestedAt,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
