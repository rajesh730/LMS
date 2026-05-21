import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import EventRound from "@/models/EventRound";
import RoundParticipant from "@/models/RoundParticipant";
import RoundSubmission from "@/models/RoundSubmission";
import EventNotice from "@/models/EventNotice";
import ParticipationRequest from "@/models/ParticipationRequest";
import "@/models/Student";
import { buildRoundParticipantEntries } from "@/lib/competitionFlow";

function getSchoolId(session) {
  return session?.user?.schoolId || session?.user?.id || null;
}

export async function GET(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const params = await props.params;
    const schoolId = getSchoolId(session);

    const event = await Event.findById(params.id).select(
      "title eventScope school status lifecycleStatus participationFormat"
    );
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    const hasRegistration = await ParticipationRequest.exists({
      event: params.id,
      school: schoolId,
      status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
    });
    if (!hasRegistration) {
      return NextResponse.json(
        { message: "No registration found for this school" },
        { status: 403 }
      );
    }

    const rounds = await EventRound.find({ event: params.id })
      .sort({ roundNumber: 1 })
      .lean();
    const roundIds = rounds.map((round) => round._id);

    const [participants, submissions, eventNotices] = await Promise.all([
      RoundParticipant.find({
        event: params.id,
        round: { $in: roundIds },
        school: schoolId,
      })
        .populate("student", "name grade rollNumber platformStudentId")
        .populate("captainStudent", "name grade")
        .sort({ roundNumber: 1, createdAt: 1 })
        .lean(),
      RoundSubmission.find({
        event: params.id,
        round: { $in: roundIds },
        school: schoolId,
      }).lean(),
      EventNotice.find({
        event: params.id,
        round: null,
        status: "PUBLISHED",
        isDeleted: { $ne: true },
        $or: [
          { visibility: "PUBLIC" },
          {
            visibility: "PRIVATE",
            targetAudience: {
              $in: [
                "REGISTERED_SCHOOLS",
                "SHORTLISTED_SCHOOLS",
                "FINALIST_SCHOOLS",
                "ALL_SCHOOLS",
              ],
            },
          },
        ],
      })
        .sort({ publishedAt: -1, createdAt: -1 })
        .lean(),
    ]);

    const participantsByRound = new Map();
    roundIds.forEach((roundId) => {
      const roundParticipants = participants.filter(
        (participant) => String(participant.round) === String(roundId)
      );
      participantsByRound.set(
        String(roundId),
        buildRoundParticipantEntries({
          event,
          participants: roundParticipants,
          submissions: submissions.filter(
            (submission) => String(submission.round) === String(roundId)
          ),
        })
      );
    });

    return NextResponse.json({
      event: {
        _id: event._id,
        title: event.title,
        participationFormat: event.participationFormat || "INDIVIDUAL",
      },
      notices: eventNotices,
      rounds: rounds
        .filter((round) => participantsByRound.has(String(round._id)))
        .map((round) => ({
          ...round,
          participants: participantsByRound.get(String(round._id)) || [],
        })),
    });
  } catch (error) {
    console.error("School Round View Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
