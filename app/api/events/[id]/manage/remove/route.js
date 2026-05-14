import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import RoundParticipant from "@/models/RoundParticipant";

function canManageEvent(session, event) {
  if (!session?.user || !event) return false;

  if (session.user.role === "SUPER_ADMIN") return true;

  if (session.user.role === "SCHOOL_ADMIN") {
    const schoolId = session.user.schoolId || session.user.id;
    return (
      event.eventScope === "SCHOOL" &&
      event.school &&
      String(event.school) === String(schoolId)
    );
  }

  return false;
}

export async function PUT(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const params = await props.params;
    const body = await req.json();
    const studentIds = Array.isArray(body.studentIds)
      ? body.studentIds.map(String).filter(Boolean)
      : [];

    if (studentIds.length === 0) {
      return NextResponse.json(
        { message: "Select at least one student to remove." },
        { status: 400 }
      );
    }

    const event = await Event.findById(params.id);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (!canManageEvent(session, event)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    event.participants = (event.participants || [])
      .map((entry) => ({
        ...entry.toObject(),
        students: (entry.students || []).filter(
          (studentId) => !studentIds.includes(String(studentId))
        ),
      }))
      .filter((entry) => entry.students.length > 0);

    await Promise.all([
      event.save(),
      ParticipationRequest.updateMany(
        { event: params.id, student: { $in: studentIds } },
        {
          $set: {
            status: "REJECTED",
            rejectedAt: new Date(),
            rejectionReason: "Removed from event participants",
          },
          $unset: {
            approvedAt: 1,
            enrollmentConfirmedAt: 1,
          },
        }
      ),
      RoundParticipant.deleteMany({
        event: params.id,
        student: { $in: studentIds },
      }),
    ]);

    return NextResponse.json({ message: "Participant removed" });
  } catch (error) {
    console.error("Remove Event Participant Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
