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

    const { id: eventId } = params;
    const body = await req.json();
    const { requestIds, action, rejectionReason } = body;

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { message: "requestIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { message: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // ===== Get event =====
    const event = await Event.findById(eventId);

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // ===== Get requests =====
    const requests = await ParticipationRequest.find({
      _id: { $in: requestIds },
      event: eventId,
      status: "PENDING",
    }).populate("student", "grade school _id");

    if (requests.length === 0) {
      return NextResponse.json(
        { message: "No pending requests found" },
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
              (p) => p.school.toString() === request.student.school.toString()
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

          // Add to event participants
          const schoolParticipant = event.participants.find(
            (p) => p.school.toString() === request.student.school.toString()
          );

          if (schoolParticipant) {
            if (!schoolParticipant.students.includes(request.student._id)) {
              schoolParticipant.students.push(request.student._id);
            }
          } else {
            event.participants.push({
              school: request.student.school,
              students: [request.student._id],
              joinedAt: now,
            });
          }

          await request.save();
          results.approved.push(request._id);
        } else if (action === "reject") {
          // Update request
          request.status = "REJECTED";
          request.rejectedAt = now;
          request.approvedBy = session.user.id;
          request.rejectionReason = rejectionReason || "Admin rejection";
          request.studentNotifiedAt = now;

          await request.save();
          results.rejected.push(request._id);
        }
      } catch (error) {
        results.failed.push({
          requestId: request._id,
          reason: error.message,
        });
      }
    }

    // Save event changes
    if (results.approved.length > 0) {
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
