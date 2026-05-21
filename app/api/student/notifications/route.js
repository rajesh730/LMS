import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Notice from "@/models/Notice";
import Event from "@/models/Event";
import EventNotice from "@/models/EventNotice";
import { getEquivalentGradeValues } from "@/lib/schoolGrades";

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

function matchesStudentGradeFilter(notice, eligibleGradeValues) {
  const noticeGrades = Array.isArray(notice?.grades)
    ? notice.grades.map((grade) => String(grade || "").trim()).filter(Boolean)
    : [];

  if (noticeGrades.length === 0) {
    return true;
  }

  return noticeGrades.some((grade) => eligibleGradeValues.includes(grade));
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const student = await Student.findOne(buildStudentLookup(session))
      .select("grade school")
      .lean();

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number.parseInt(
      searchParams.get("limit") || "20",
      10
    );
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 100))
      : 20;

    const eligibleGradeValues = getEquivalentGradeValues(student.grade);

    const [schoolNotices, schoolEvents] = await Promise.all([
      Notice.find({
        scope: "SCHOOL",
        school: student.school,
        status: "PUBLISHED",
        isActive: true,
        "targetAudience.students": true,
        $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }],
      })
        .select("title content grades publishedAt createdAt")
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(Math.max(limit, 50))
        .lean(),
      Event.find({
        eventScope: "SCHOOL",
        school: student.school,
      })
        .select("_id title")
        .lean(),
    ]);

    const schoolNotifications = schoolNotices
      .filter((notice) => matchesStudentGradeFilter(notice, eligibleGradeValues))
      .map((notice) => ({
        id: String(notice._id),
        noticeType: "SCHOOL",
        title: notice.title,
        message: notice.content || "",
        publishedAt: notice.publishedAt || notice.createdAt,
        event: null,
        href: "/student/notices",
      }));

    const schoolEventIds = schoolEvents.map((event) => event._id);
    const eventTitleMap = new Map(
      schoolEvents.map((event) => [String(event._id), event.title || "Event"])
    );

    let eventNotifications = [];
    if (schoolEventIds.length > 0) {
      const eventNotices = await EventNotice.find({
        event: { $in: schoolEventIds },
        round: null,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        isDeleted: { $ne: true },
      })
        .select("event title message publishedAt createdAt")
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(Math.max(limit, 50))
        .lean();

      eventNotifications = eventNotices.map((notice) => ({
        id: String(notice._id),
        noticeType: "EVENT",
        title: notice.title,
        message: notice.message || "",
        publishedAt: notice.publishedAt || notice.createdAt,
        event: {
          id: String(notice.event),
          title: eventTitleMap.get(String(notice.event)) || "Event",
        },
        href: `/events/${String(notice.event)}`,
      }));
    }

    const notifications = [...schoolNotifications, ...eventNotifications]
      .sort(
        (a, b) =>
          new Date(b.publishedAt || 0).getTime() -
          new Date(a.publishedAt || 0).getTime()
      )
      .slice(0, limit);

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("GET /api/student/notifications error:", error);
    return NextResponse.json(
      { message: "Failed to load student notifications" },
      { status: 500 }
    );
  }
}
