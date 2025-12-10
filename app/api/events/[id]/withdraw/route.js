import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";

/**
 * DELETE /api/events/[id]/withdraw
 * Student withdraws from an event
 * Updates participation request status to WITHDRAWN
 * Frees up capacity
 */
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { id: eventId } = params;

    // ===== Get student =====
    const student = await Student.findOne({ userId: session.user.id });

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    // ===== Get participation request =====
    const request = await ParticipationRequest.findOne({
      student: student._id,
      event: eventId,
      status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
    });

    if (!request) {
      return NextResponse.json(
        { message: "No active request found for this event" },
        { status: 404 }
      );
    }

    // ===== Get event =====
    const event = await Event.findById(eventId);

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    const now = new Date();

    // ===== Update request status =====
    request.status = "WITHDRAWN";
    request.studentNotifiedAt = now;
    await request.save();

    // ===== Remove from event participants =====
    const schoolParticipant = event.participants.find(
      (p) => p.school.toString() === student.school.toString()
    );

    if (schoolParticipant) {
      schoolParticipant.students = schoolParticipant.students.filter(
        (sid) => sid.toString() !== student._id.toString()
      );

      // Remove school participant if no students left
      if (schoolParticipant.students.length === 0) {
        event.participants = event.participants.filter(
          (p) => p.school.toString() !== student.school.toString()
        );
      }
    }

    await event.save();

    return NextResponse.json(
      {
        message: "Successfully withdrawn from event",
        eventId: event._id,
        eventTitle: event.title,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error withdrawing from event:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
