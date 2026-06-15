import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Teacher from "@/models/Teacher";
import Event from "@/models/Event";
import ActivityLog from "@/models/ActivityLog";
import { successResponse, errorResponse } from "@/lib/apiResponse";

/**
 * GET /api/school/dashboard/stats
 * Get dashboard statistics for school admin
 * Returns: students, teachers, and event data
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(
        403,
        "Only school admins can access dashboard stats"
      );
    }

    await connectDB();
    const schoolId = session.user.schoolId || session.user.id;

    // Fetch all data in parallel
    const [students, teachers, events] =
      await Promise.all([
        Student.countDocuments({
          school: schoolId,
          isDeleted: { $ne: true },
        }),
        Teacher.countDocuments({
          school: schoolId,
          isDeleted: { $ne: true },
        }),
        Event.countDocuments({
          $or: [{ school: schoolId }, { ownerId: schoolId }],
          lifecycleStatus: { $ne: "ARCHIVED" },
        }),
      ]);

    // Get status breakdown
    const studentsByStatus = await Student.aggregate([
      {
        $match: {
          school: schoolId,
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get students by grade
    const studentsByGrade = await Student.aggregate([
      {
        $match: {
          school: schoolId,
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$grade",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          gradeName: "$_id",
          count: 1,
        },
      },
    ]);

    const teachersByStatus = await Teacher.aggregate([
      {
        $match: {
          school: schoolId,
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const eventsByLifecycle = await Event.aggregate([
      {
        $match: {
          $or: [{ school: schoolId }, { ownerId: schoolId }],
        },
      },
      {
        $group: {
          _id: "$lifecycleStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const eventsByScope = await Event.aggregate([
      {
        $match: {
          $or: [{ school: schoolId }, { ownerId: schoolId }],
          lifecycleStatus: { $ne: "ARCHIVED" },
        },
      },
      {
        $group: {
          _id: "$eventScope",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format status breakdown
    const statusBreakdown = {};
    studentsByStatus.forEach((item) => {
      statusBreakdown[item._id || "UNKNOWN"] = item.count;
    });

    const teacherStatusBreakdown = {};
    teachersByStatus.forEach((item) => {
      teacherStatusBreakdown[item._id || "UNKNOWN"] = item.count;
    });

    const eventLifecycleBreakdown = {};
    eventsByLifecycle.forEach((item) => {
      eventLifecycleBreakdown[item._id || "UNKNOWN"] = item.count;
    });

    const eventScopeBreakdown = {};
    eventsByScope.forEach((item) => {
      eventScopeBreakdown[item._id || "UNKNOWN"] = item.count;
    });

    const [activityLogs, recentStudents, recentTeachers, recentEvents] =
      await Promise.all([
        ActivityLog.find({ school: schoolId, status: "SUCCESS" })
          .select("action targetType targetName createdAt")
          .sort({ createdAt: -1 })
          .limit(30)
          .lean(),
        Student.find({ school: schoolId, isDeleted: { $ne: true } })
          .select("name grade status createdAt")
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
        Teacher.find({ school: schoolId, isDeleted: { $ne: true } })
          .select("name subject status createdAt")
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
        Event.find({
          $or: [{ school: schoolId }, { ownerId: schoolId }],
          lifecycleStatus: { $ne: "ARCHIVED" },
        })
          .select("title eventScope lifecycleStatus date createdAt")
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
      ]);

    const recentActivity = [
      ...activityLogs.map((log) => ({
        id: String(log._id),
        type: log.targetType || "Activity",
        title: `${String(log.action || "UPDATE").replaceAll("_", " ")} ${log.targetType || "record"}`,
        description: log.targetName || "School record updated",
        createdAt: log.createdAt,
      })),
      ...recentStudents.map((student) => ({
        id: String(student._id),
        type: "Student",
        title: "Student record added",
        description: `${student.name || "Student"}${student.grade ? ` - ${student.grade}` : ""}`,
        createdAt: student.createdAt,
      })),
      ...recentTeachers.map((teacher) => ({
        id: String(teacher._id),
        type: "Teacher",
        title: "Teacher record added",
        description: `${teacher.name || "Teacher"}${teacher.subject ? ` - ${teacher.subject}` : ""}`,
        createdAt: teacher.createdAt,
      })),
      ...recentEvents.map((event) => ({
        id: String(event._id),
        type: "Event",
        title: "School event created",
        description: event.title || "Event",
        createdAt: event.createdAt,
      })),
    ]
      .filter((item) => item.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 30);

    return successResponse(200, "Dashboard stats retrieved", {
      overview: {
        totalStudents: students,
        totalTeachers: teachers,
        totalEvents: events,
      },
      students: {
        total: students,
        byStatus: statusBreakdown,
        byGrade: studentsByGrade,
      },
      teachers: {
        total: teachers,
        byStatus: teacherStatusBreakdown,
      },
      events: {
        total: events,
        byLifecycle: eventLifecycleBreakdown,
        byScope: eventScopeBreakdown,
      },
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return errorResponse(500, "Failed to fetch dashboard statistics");
  }
}
