import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import { ensureSchoolInvitationsForPublishedEvents } from "@/lib/eventInvitations";
import "@/models/Event";
import "@/models/ExternalOrganizer";
import "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    await ensureSchoolInvitationsForPublishedEvents(session.user.id);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const query = {
      school: session.user.id,
      status: { $ne: "WITHDRAWN" },
    };

    if (status && status !== "ALL") {
      query.status = status;
    }

    const invitations = await EventSchoolInvitation.find(query)
      .sort({ notifiedAt: -1 })
      .populate({
        path: "event",
        select:
          "title description date eventType visibility registrationDeadline maxParticipants maxParticipantsPerSchool participationFormat minTeamSize maxTeamSize eligibleGrades eventScope lifecycleStatus status partnerBrandingEnabled partners",
        populate: [
          {
            path: "partners.organizer",
            select:
              "organizationName slug logoUrl website verificationStatus profileVisibility",
          },
        ],
      })
      .populate("decisionBy", "name schoolName email")
      .lean();

    const eventIds = invitations
      .map((invitation) => invitation.event?._id)
      .filter(Boolean);
    const participationRequests = await ParticipationRequest.find({
      school: session.user.id,
      event: { $in: eventIds },
      status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
    })
      .select("event status student")
      .lean();

    const participationByEvent = new Map();
    participationRequests.forEach((request) => {
      const eventId = String(request.event);
      const summary = participationByEvent.get(eventId) || {
        hasParticipation: false,
        participationStatus: null,
        registeredStudentCount: 0,
      };

      summary.hasParticipation = true;
      summary.registeredStudentCount += 1;
      if (request.status === "APPROVED" || request.status === "ENROLLED") {
        summary.participationStatus = request.status;
      } else if (!summary.participationStatus) {
        summary.participationStatus = request.status;
      }
      participationByEvent.set(eventId, summary);
    });

    const invitationsWithParticipation = invitations.map((invitation) => ({
      ...invitation,
      participation: participationByEvent.get(String(invitation.event?._id)) || {
        hasParticipation: false,
        participationStatus: null,
        registeredStudentCount: 0,
      },
    }));

    return NextResponse.json(
      { invitations: invitationsWithParticipation },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch School Event Invitations Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
