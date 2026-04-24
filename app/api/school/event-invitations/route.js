import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import { ensureSchoolInvitationsForPublishedEvents } from "@/lib/eventInvitations";
import "@/models/Event";
import "@/models/ExternalOrganizer";
import "@/models/Group";
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
          "title description date eventType visibility registrationDeadline maxParticipants maxParticipantsPerSchool eligibleGrades eventScope lifecycleStatus status partnerBrandingEnabled partners targetGroup",
        populate: [
          {
            path: "partners.organizer",
            select:
              "organizationName slug logoUrl website verificationStatus profileVisibility",
          },
          { path: "targetGroup", select: "name" },
        ],
      })
      .populate("decisionBy", "name schoolName email")
      .lean();

    return NextResponse.json({ invitations }, { status: 200 });
  } catch (error) {
    console.error("Fetch School Event Invitations Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
