import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import Event from "@/models/Event";
import Achievement from "@/models/Achievement";
import ParticipationRequest from "@/models/ParticipationRequest";

export const dynamic = "force-dynamic";

async function buildMetrics(schoolId) {
  const [eventsHosted, participatedEventIds, awardsCount] =
    await Promise.all([
      Event.countDocuments({ school: schoolId, lifecycleStatus: { $ne: "ARCHIVED" } }),
      ParticipationRequest.distinct("event", {
        school: schoolId,
        status: { $in: ["APPROVED", "ENROLLED"] },
      }),
      Achievement.countDocuments({
        school: schoolId,
        isPublic: true,
        certificateIssuedAt: { $ne: null },
      }),
    ]);

  return {
    eventsHosted,
    eventsParticipated: participatedEventIds.length,
    awardsCount,
    studentParticipationRate: 0,
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    let profile = await SchoolShowcaseProfile.findOne({ school: session.user.id })
      .populate("featuredEvents", "title date visibility eventType")
      .lean();

    const metrics = await buildMetrics(session.user.id);

    if (!profile) {
      profile = {
        school: session.user.id,
        tagline: "",
        summary: "",
        coverImageUrl: "",
        websiteUrl: "",
        visibility: "PRIVATE",
        highlightMetrics: metrics,
        featuredEvents: [],
        publicHighlights: [],
      };
    } else {
      profile.highlightMetrics = {
        ...profile.highlightMetrics,
        ...metrics,
      };
    }

    return NextResponse.json({ success: true, data: profile }, { status: 200 });
  } catch (error) {
    console.error("Showcase Profile GET Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch showcase profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const metrics = await buildMetrics(session.user.id);

    const profile = await SchoolShowcaseProfile.findOneAndUpdate(
      { school: session.user.id },
      {
        $set: {
          tagline: body.tagline || "",
          summary: body.summary || "",
          coverImageUrl: body.coverImageUrl || "",
          websiteUrl: body.websiteUrl || "",
          visibility: ["PRIVATE", "PUBLIC"].includes(body.visibility)
            ? body.visibility
            : "PRIVATE",
          featuredEvents: body.featuredEvents || [],
          publicHighlights: body.publicHighlights || [],
          highlightMetrics: metrics,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .populate("featuredEvents", "title date visibility eventType");

    return NextResponse.json({ success: true, data: profile }, { status: 200 });
  } catch (error) {
    console.error("Showcase Profile PUT Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update showcase profile" },
      { status: 500 }
    );
  }
}
