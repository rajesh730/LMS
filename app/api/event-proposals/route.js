import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import EventProposal, { EVENT_PROPOSAL_ROLES } from "@/models/EventProposal";
import { normalizeGradeValue } from "@/lib/schoolGrades";
import { isBeforeToday } from "@/lib/eventDates";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";

export const dynamic = "force-dynamic";

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : null;
}

function sanitizeRoles(roles) {
  if (!Array.isArray(roles)) return ["ORGANIZER_PARTNER"];
  const next = roles.filter((role) => EVENT_PROPOSAL_ROLES.includes(role));
  return next.length ? next : ["ORGANIZER_PARTNER"];
}

export async function POST(req) {
  try {
    const body = await req.json();

    const requiredFields = [
      "organizationName",
      "contactName",
      "contactEmail",
      "eventTitle",
      "eventDescription",
    ];

    const missing = requiredFields.filter((field) => !body[field]?.trim?.());
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, message: `Missing fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    if (body.preferredDate && isBeforeToday(body.preferredDate)) {
      return NextResponse.json(
        { success: false, message: "Preferred date cannot be in the past." },
        { status: 400 }
      );
    }

    await connectDB();

    const proposal = await EventProposal.create({
      organizationName: body.organizationName,
      organizationType: body.organizationType || "COMPANY",
      website: body.website || "",
      location: body.location || "",
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone || "",
      eventTitle: body.eventTitle,
      eventDescription: body.eventDescription,
      proposedRoles: sanitizeRoles(body.proposedRoles),
      targetGrades: Array.isArray(body.targetGrades)
        ? body.targetGrades.map(normalizeGradeValue).filter(Boolean)
        : [],
      expectedSchools: parseOptionalNumber(body.expectedSchools),
      expectedStudents: parseOptionalNumber(body.expectedStudents),
      preferredDate: body.preferredDate || null,
      eventMode: body.eventMode || "UNDECIDED",
      venue: body.venue || "",
      prizeDetails: body.prizeDetails || "",
      dataAccessNeeds: body.dataAccessNeeds || "",
      safetyNotes: body.safetyNotes || "",
      status: "NEW",
    });

    publishWorkIndicatorsUpdate("partner-proposal-created", {
      proposalId: String(proposal._id),
      status: proposal.status,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Event proposal submitted",
        data: { id: proposal._id },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create event proposal error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          process.env.NODE_ENV === "production"
            ? "Failed to submit event proposal"
            : error?.message || "Failed to submit event proposal",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const proposals = await EventProposal.find({})
      .sort({ createdAt: -1 })
      .populate("organizer", "organizationName slug verificationStatus profileVisibility")
      .populate("linkedEvent", "title date visibility lifecycleStatus")
      .populate("reviewedBy", "name email")
      .populate("statusHistory.changedBy", "name email")
      .lean();

    return NextResponse.json({ success: true, data: proposals }, { status: 200 });
  } catch (error) {
    console.error("Fetch event proposals error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load event proposals" },
      { status: 500 }
    );
  }
}
