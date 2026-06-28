import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";
import { syncApprovedRequestsToRoundOne } from "@/lib/competitionFlow";
import { getRegistrationLockMessage } from "@/lib/eventWorkflow";
import {
  acquireEventCapacityLock,
  EventCapacityBusyError,
  releaseEventCapacityLock,
} from "@/lib/eventCapacityLock";

const ACTIVE_REQUEST_STATUSES = ["PENDING", "APPROVED", "ENROLLED"];

/**
 * POST /api/events/[id]/manage/student/add
 * Manually add a student to an event
 * Only admin can do this
 */
export async function POST(req, { params }) {
  let capacityLock = null;
  let lockedEventId = null;
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
    const { studentIds } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { message: "studentIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Get event
    const eventExists = await Event.exists({ _id: eventId });
    if (!eventExists) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    const lockResult = await acquireEventCapacityLock(eventId);
    capacityLock = lockResult.token;
    lockedEventId = eventId;
    const event = lockResult.event;

    // Block new enrollments once the competition has started or the deadline
    // has passed — the participant list must be frozen at that point.
    const lockMessage = getRegistrationLockMessage(event, "add students");
    if (lockMessage) {
      return NextResponse.json({ message: lockMessage }, { status: 400 });
    }

    // Get students with school info
    const students = await Student.find({
      _id: { $in: studentIds },
      status: "ACTIVE",
      isDeleted: { $ne: true },
    }).populate("school");

    if (students.length === 0) {
      return NextResponse.json(
        { message: "No students found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const added = [];
    const failed = [];

    // Process each student
    for (const student of students) {
      try {
        // Check if already has request for this event
        const existingRequest = await ParticipationRequest.findOne({
          student: student._id,
          event: eventId,
        });

        if (existingRequest && existingRequest.status !== "WITHDRAWN") {
          failed.push({
            studentId: student._id,
            reason: `Already has ${existingRequest.status.toLowerCase()} request`,
          });
          continue;
        }

        // Check capacity
        if (event.maxParticipants) {
          const totalEnrolled = await ParticipationRequest.countDocuments({
            event: eventId,
            status: { $in: ACTIVE_REQUEST_STATUSES },
          });

          if (totalEnrolled >= event.maxParticipants) {
            failed.push({
              studentId: student._id,
              reason: "Event at full capacity",
            });
            continue;
          }
        }

        // Check per-school capacity
        if (event.maxParticipantsPerSchool) {
          const schoolCount = await ParticipationRequest.countDocuments({
            event: eventId,
            school: student.school._id,
            status: { $in: ACTIVE_REQUEST_STATUSES },
          });

          if (schoolCount >= event.maxParticipantsPerSchool) {
            failed.push({
              studentId: student._id,
              reason: "School at capacity limit",
            });
            continue;
          }
        }

        // Create or update request
        let request = existingRequest;

        if (!request) {
          request = new ParticipationRequest({
            student: student._id,
            event: eventId,
            school: student.school._id,
            status: "APPROVED",
            requestedAt: now,
            approvedAt: now,
            approvedBy: session.user.id,
            enrollmentConfirmedAt: now,
            studentNotifiedAt: now,
          });
        } else {
          request.status = "APPROVED";
          request.approvedAt = now;
          request.approvedBy = session.user.id;
          request.enrollmentConfirmedAt = now;
          request.studentNotifiedAt = now;
        }

        await request.save();

        // Add to event participants
        const schoolParticipant = event.participants.find(
          (p) => p.school.toString() === student.school._id.toString()
        );

        if (schoolParticipant) {
          if (!schoolParticipant.students.includes(student._id)) {
            schoolParticipant.students.push(student._id);
          }
        } else {
          event.participants.push({
            school: student.school._id,
            students: [student._id],
            joinedAt: now,
          });
        }

        added.push({
          studentId: student._id,
          name: student.name,
        });
      } catch (error) {
        failed.push({
          studentId: student._id,
          reason: error.message,
        });
      }
    }

    // Save event
    if (added.length > 0) {
      await event.save();
      await syncApprovedRequestsToRoundOne({
        eventId,
        createdBy: session.user.id,
      });
    }

    return NextResponse.json(
      {
        message: `Added ${added.length} students`,
        added,
        failed,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof EventCapacityBusyError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    console.error("Error adding students:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  } finally {
    if (capacityLock) {
      await releaseEventCapacityLock(lockedEventId, capacityLock).catch(
        (releaseError) => {
          console.error("Failed to release event capacity lock:", releaseError);
        }
      );
    }
  }
}
