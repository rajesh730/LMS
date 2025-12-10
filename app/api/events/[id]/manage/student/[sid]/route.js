import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";

/**
 * DELETE /api/events/[id]/manage/student/[sid]
 * Remove an approved student from an event
 */
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id: eventId, sid: studentId } = params;

    // Get event and student
    const [event, student] = await Promise.all([
      Event.findById(eventId),
      Student.findById(studentId),
    ]);

    if (!event) {
      return NextResponse.json(
        { message: "Event not found" },
        { status: 404 }
      );
    }

    if (!student) {
      return NextResponse.json(
        { message: "Student not found" },
        { status: 404 }
      );
    }

    // Get participation request
    const request = await ParticipationRequest.findOne({
      student: studentId,
      event: eventId,
      status: { $in: ["APPROVED", "ENROLLED"] },
    });

    if (!request) {
      return NextResponse.json(
        { message: "Student not enrolled in this event" },
        { status: 404 }
      );
    }

    // Update request status
    request.status = "WITHDRAWN";
    request.studentNotifiedAt = new Date();
    await request.save();

    // Remove from event participants
    const schoolParticipant = event.participants.find(
      (p) => p.school.toString() === student.school.toString()
    );

    if (schoolParticipant) {
      schoolParticipant.students = schoolParticipant.students.filter(
        (sid) => sid.toString() !== studentId
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
        message: "Student removed from event",
        studentId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing student:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
