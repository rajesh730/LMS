import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { getActiveCertificateFilter } from "@/lib/certificates";
import Student from "@/models/Student";
import Achievement from "@/models/Achievement";
import ParticipationRequest from "@/models/ParticipationRequest";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import User from "@/models/User";

function buildStudentLookup(session) {
  return {
    isDeleted: { $ne: true },
    status: "ACTIVE",
    $or: [
      { _id: session.user.id },
      { userId: session.user.id },
      { email: session.user.email },
      { username: session.user.email },
    ],
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

    const student = await Student.findOne(buildStudentLookup(session))
      .select("name firstName lastName grade rollNumber username email school")
      .lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    const [school, schoolProfile, achievements, participationRequests, writings] =
      await Promise.all([
        User.findById(student.school).select("schoolName schoolLocation").lean(),
        SchoolShowcaseProfile.findOne({ school: student.school })
          .select("coverImageUrl")
          .lean(),
        Achievement.find({
          student: student._id,
          ...getActiveCertificateFilter(),
        })
          .populate(
            "event",
            "title date eventScope publicResultsEnabled resultsPublished"
          )
          .sort({ awardedAt: -1, createdAt: -1 })
          .lean(),
        ParticipationRequest.find({
          student: student._id,
          status: { $in: ["APPROVED", "ENROLLED"] },
        })
          .select("event status approvedAt enrollmentConfirmedAt requestedAt")
          .lean(),
        SchoolMagazineArticle.find({
          authorStudent: student._id,
          isDeleted: { $ne: true },
        })
          .select(
            "status category showOnSchoolWall isPublished isMagazinePublished isGlobalWallPublished magazineIssue publishedAt magazinePublishedAt createdAt updatedAt"
          )
          .lean(),
      ]);

    const writingSummary = writings.reduce(
      (summary, writing) => {
        const status = String(writing.status || "DRAFT").toUpperCase();
        const category = String(writing.category || "BLOG_ARTICLE").toUpperCase();
        const visibleOnSchoolWall =
          ["SUBMITTED", "APPROVED"].includes(status) &&
          writing.showOnSchoolWall !== false;
        const inMagazine =
          Boolean(writing.isMagazinePublished) && Boolean(writing.magazineIssue);

        summary.total += 1;
        summary.status[status] = (summary.status[status] || 0) + 1;
        summary.categories[category] = (summary.categories[category] || 0) + 1;
        if (visibleOnSchoolWall) summary.destinations.schoolWall += 1;
        if (writing.isPublished) summary.destinations.homepage += 1;
        if (inMagazine) summary.destinations.magazine += 1;
        if (writing.isGlobalWallPublished) summary.destinations.globalWall += 1;
        if (status === "APPROVED") summary.approved += 1;
        if (status === "SUBMITTED") summary.pendingReview += 1;
        if (status === "DRAFT") summary.drafts += 1;
        if (status === "REJECTED") summary.rejected += 1;
        return summary;
      },
      {
        total: 0,
        approved: 0,
        pendingReview: 0,
        drafts: 0,
        rejected: 0,
        status: {},
        categories: {},
        destinations: {
          schoolWall: 0,
          homepage: 0,
          magazine: 0,
          globalWall: 0,
        },
      }
    );

    // Mirrors the public portfolio gate at /students/[id]: a profile is public
    // only if there is at least one publicly-published achievement or writing.
    const publicAchievementsCount = achievements.filter(
      (achievement) =>
        achievement.event?.eventScope === "PLATFORM" &&
        achievement.event?.publicResultsEnabled &&
        achievement.event?.resultsPublished
    ).length;
    const publicProfileAvailable =
      publicAchievementsCount > 0 || writingSummary.destinations.homepage > 0;

    const winsCount = achievements.filter((achievement) =>
      ["WINNER", "RUNNER_UP", "THIRD_PLACE"].includes(
        String(achievement.placement || "").toUpperCase()
      )
    ).length;

    const finalistCount = achievements.filter((achievement) =>
      ["FINALIST", "MERIT", "SPECIAL_MENTION"].includes(
        String(achievement.placement || "").toUpperCase()
      )
    ).length;

    return NextResponse.json(
      {
        success: true,
        data: {
          student: {
            id: String(student._id),
            name: student.name,
            grade: student.grade,
            rollNumber: student.rollNumber,
            username: student.username,
            email: student.email || "",
            schoolName: school?.schoolName || "School",
            schoolLocation: school?.schoolLocation || "",
            schoolLogoUrl: schoolProfile?.coverImageUrl || "",
          },
          publicProfileAvailable,
          metrics: {
            achievementsCount: achievements.length,
            winsCount,
            finalistCount,
            certificatesCount: achievements.filter(
              (achievement) => Boolean(achievement.certificateUrl)
            ).length,
            registeredEventsCount: participationRequests.length,
            writingsCount: writingSummary.total,
          },
          writingSummary,
          achievements: achievements.map((achievement) => ({
            id: String(achievement._id),
            title: achievement.title,
            description: achievement.description || "",
            placement: achievement.placement,
            level: achievement.level,
            awardedAt: achievement.awardedAt,
            certificateUrl: achievement.certificateUrl || "",
            certificateCode: achievement.certificateCode || "",
            certificateIssuedAt: achievement.certificateIssuedAt || null,
            recipientName: achievement.certificateRecipientName || "",
            scorePercentage: achievement.scorePercentage || 0,
            totalScore: achievement.totalScore || 0,
            event: achievement.event
              ? {
                  id: String(achievement.event._id),
                  title: achievement.event.title,
                  date: achievement.event.date,
                }
              : null,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/student/activity-summary error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load student activity summary" },
      { status: 500 }
    );
  }
}
