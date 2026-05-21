import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Achievement from "@/models/Achievement";
import ParticipationRequest from "@/models/ParticipationRequest";
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

    const [school, achievements, participationRequests] = await Promise.all([
      User.findById(student.school).select("schoolName schoolLocation").lean(),
      Achievement.find({
        student: student._id,
        certificateIssuedAt: { $ne: null },
      })
        .populate("event", "title date eventScope")
        .sort({ awardedAt: -1, createdAt: -1 })
        .lean(),
      ParticipationRequest.find({
        student: student._id,
        status: { $in: ["APPROVED", "ENROLLED"] },
      })
        .select("event status approvedAt enrollmentConfirmedAt requestedAt")
        .lean(),
    ]);

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
          },
          metrics: {
            achievementsCount: achievements.length,
            winsCount,
            finalistCount,
            certificatesCount: achievements.filter(
              (achievement) => Boolean(achievement.certificateUrl)
            ).length,
            registeredEventsCount: participationRequests.length,
          },
          achievements: achievements.map((achievement) => ({
            id: String(achievement._id),
            title: achievement.title,
            description: achievement.description || "",
            placement: achievement.placement,
            level: achievement.level,
            awardedAt: achievement.awardedAt,
            certificateUrl: achievement.certificateUrl || "",
            scorePercentage: achievement.scorePercentage || 0,
            totalScore: achievement.totalScore || 0,
            event: achievement.event
              ? {
                  id: String(achievement.event._id),
                  title: achievement.event.title,
                  date: achievement.event.date,
                  eventScope: achievement.event.eventScope,
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
