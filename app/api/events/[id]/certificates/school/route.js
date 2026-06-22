import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { getActiveCertificateFilter } from "@/lib/certificates";
import Achievement from "@/models/Achievement";
import Event from "@/models/Event";
import "@/models/Student";

export const dynamic = "force-dynamic";

const PLACEMENT_ORDER = {
  WINNER: 1,
  RUNNER_UP: 2,
  FINALIST: 3,
  THIRD_PLACE: 4,
  SPECIAL_MENTION: 5,
  PARTICIPANT: 6,
};

export async function GET(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    await connectDB();

    const event = await Event.findById(params.id)
      .select("title visibility publicResultsEnabled resultsPublished participationFormat")
      .lean();

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    const certificates = await Achievement.find({
      event: params.id,
      school: session.user.id,
      ...getActiveCertificateFilter(),
      schoolSharedAt: { $ne: null },
    })
      .populate("parentAchievement", "certificateRecipientName teamName recipientType")
      .populate("student", "name grade")
      .populate("captainStudent", "name grade")
      .sort({ awardedAt: -1 })
      .lean();
    const sortedCertificates = [...certificates].sort((a, b) => {
      const recipientTypeDelta =
        String(a.recipientType || "STUDENT") === String(b.recipientType || "STUDENT")
          ? 0
          : String(a.recipientType || "STUDENT") === "TEAM"
          ? -1
          : 1;
      if (recipientTypeDelta !== 0) return recipientTypeDelta;
      const placementDelta =
        (PLACEMENT_ORDER[a.placement] || 99) - (PLACEMENT_ORDER[b.placement] || 99);
      if (placementDelta !== 0) return placementDelta;
      return String(
        a.certificateRecipientName || a.teamName || a.student?.name || ""
      ).localeCompare(
        String(b.certificateRecipientName || b.teamName || b.student?.name || "")
      );
    });

    const overallResultUrl =
      event.visibility === "PUBLIC" && event.publicResultsEnabled && event.resultsPublished
        ? `/events/${params.id}`
        : "";

    const resultSummary = {
      eventTitle: event.title,
      participationFormat: event.participationFormat || "INDIVIDUAL",
      totalRecognizedEntries: sortedCertificates.filter((item) => item.recipientType === "TEAM").length,
      winnerCount: sortedCertificates.filter((item) => item.recipientType === "TEAM" && item.placement === "WINNER").length,
      runnerUpCount: sortedCertificates.filter((item) => item.recipientType === "TEAM" && item.placement === "RUNNER_UP").length,
      finalistCount: sortedCertificates.filter((item) => item.recipientType === "TEAM" && item.placement === "FINALIST").length,
      participantCount: sortedCertificates.filter((item) => item.recipientType === "TEAM" && item.placement === "PARTICIPANT").length,
      entries: sortedCertificates
        .filter((item) => item.recipientType === "TEAM")
        .map((item) => ({
        _id: item._id,
        recipientType: item.recipientType || "TEAM",
        teamName: item.teamName || "",
        displayName:
          item.certificateRecipientName || item.teamName || item.student?.name || "Student",
        studentName: item.student?.name || "Student",
        grade: item.student?.grade || "",
        captainName: item.captainStudent?.name || "",
        placement: item.placement,
        certificateUrl: item.certificateUrl,
      })),
    };

    const publicResultState = !event.resultsPublished
      ? "Results are not published yet."
      : event.visibility !== "PUBLIC"
      ? "Results are published for schools, but this event is not public."
      : !event.publicResultsEnabled
      ? "Results are published for schools, but public result visibility is turned off."
      : "Public result page is available.";

    return NextResponse.json(
      {
        certificates: sortedCertificates,
        overallResultUrl,
        resultSummary,
        publicResultState,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("School Event Certificates Error:", error);
    return NextResponse.json(
      { message: "Failed to load school event certificates" },
      { status: 500 }
    );
  }
}
