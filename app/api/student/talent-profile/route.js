import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import TalentProfile from "@/models/TalentProfile";
import Achievement from "@/models/Achievement";
import TalentSubmission from "@/models/TalentSubmission";

export const dynamic = "force-dynamic";

async function buildStats(studentId) {
  const [submissionsCount, awardsCount] = await Promise.all([
    TalentSubmission.countDocuments({ student: studentId }),
    Achievement.countDocuments({ student: studentId }),
  ]);

  const participatedEventIds = await TalentSubmission.distinct("event", {
    student: studentId,
  });

  return {
    submissionsCount,
    awardsCount,
    eventsParticipated: participatedEventIds.length,
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const student = await Student.findById(session.user.id)
      .select("name grade school")
      .lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    const [profile, achievements, stats] = await Promise.all([
      TalentProfile.findOne({ student: session.user.id }).lean(),
      Achievement.find({ student: session.user.id })
        .sort({ awardedAt: -1 })
        .limit(12)
        .populate("event", "title")
        .select(
          "title placement level awardedAt description certificateUrl totalScore scorePercentage event"
        )
        .lean(),
      buildStats(session.user.id),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          student,
          profile: profile || null,
          achievements,
          stats,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Student talent profile GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load talent profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const student = await Student.findById(session.user.id)
      .select("school")
      .lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const stats = await buildStats(session.user.id);

    const media = Array.isArray(body.media)
      ? body.media
          .filter((item) => item?.url)
          .map((item) => ({
            type: item.type || "LINK",
            title: item.title || "",
            url: item.url,
            isFeatured: Boolean(item.isFeatured),
          }))
      : [];

    const profile = await TalentProfile.findOneAndUpdate(
      { student: session.user.id },
      {
        $set: {
          school: student.school,
          headline: body.headline || "",
          bio: body.bio || "",
          skillLevel: body.skillLevel || "BEGINNER",
          visibility: body.visibility || "SCHOOL_ONLY",
          isPubliclyFeatured: Boolean(body.isPubliclyFeatured),
          media,
          stats,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(
      { success: true, data: profile },
      { status: 200 }
    );
  } catch (error) {
    console.error("Student talent profile PUT error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save talent profile" },
      { status: 500 }
    );
  }
}
