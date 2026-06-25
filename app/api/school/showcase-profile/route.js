import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { getActiveCertificateFilter } from "@/lib/certificates";
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
        ...getActiveCertificateFilter(),
      }),
    ]);

  return {
    eventsHosted,
    eventsParticipated: participatedEventIds.length,
    awardsCount,
    studentParticipationRate: 0,
  };
}

function sanitizeString(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function sanitizePublicHighlights(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeString(item, 90))
    .filter(Boolean)
    .slice(0, 8);
}

const SOCIAL_KEYS = [
  "facebook",
  "instagram",
  "linkedin",
  "tiktok",
  "youtube",
  "twitter",
];

const SCHOOL_STORY_MAX_LENGTH = 2000;

function sanitizeSocialLinks(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return SOCIAL_KEYS.reduce((acc, key) => {
    acc[key] = sanitizeString(source[key], 300);
    return acc;
  }, {});
}

const EMPTY_SOCIAL_LINKS = SOCIAL_KEYS.reduce((acc, key) => {
  acc[key] = "";
  return acc;
}, {});

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
        motto: "",
        contactEmail: "",
        contactPhone: "",
        socialLinks: { ...EMPTY_SOCIAL_LINKS },
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
          tagline: sanitizeString(body.tagline, 160),
          summary: sanitizeString(body.summary, SCHOOL_STORY_MAX_LENGTH),
          coverImageUrl: sanitizeString(body.coverImageUrl, 1000),
          websiteUrl: sanitizeString(body.websiteUrl, 1000),
          motto: sanitizeString(body.motto, 160),
          contactEmail: sanitizeString(body.contactEmail, 160),
          contactPhone: sanitizeString(body.contactPhone, 40),
          socialLinks: sanitizeSocialLinks(body.socialLinks),
          visibility: ["PRIVATE", "PUBLIC"].includes(body.visibility)
            ? body.visibility
            : "PRIVATE",
          featuredEvents: Array.isArray(body.featuredEvents)
            ? body.featuredEvents
            : [],
          publicHighlights: sanitizePublicHighlights(body.publicHighlights),
          highlightMetrics: metrics,
        },
      },
      // strict:false ensures newer fields (socialLinks, contact, motto) persist
      // even if a long-running process cached an older schema.
      { new: true, upsert: true, setDefaultsOnInsert: true, strict: false }
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
