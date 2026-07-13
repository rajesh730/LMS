import mongoose from "mongoose";
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
    // Aggregation pipelines skip Mongoose's schema casting, so the session's
    // string id must be converted to an ObjectId for $match to hit documents.
    const schoolObjectId = new mongoose.Types.ObjectId(String(schoolId));

    // Fetch all data in parallel; totals are derived from the breakdowns
    // below instead of separate count queries.
    const [
      studentsByStatus,
      studentsByGrade,
      teachersByStatus,
      eventsByLifecycle,
      activityLogs,
      recentStudents,
      recentTeachers,
      recentEvents,
    ] = await Promise.all([
      Student.aggregate([
        {
          $match: {
            school: schoolObjectId,
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Student.aggregate([
        {
          $match: {
            school: schoolObjectId,
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
      ]),
      Teacher.aggregate([
        {
          $match: {
            school: schoolObjectId,
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Event.aggregate([
        {
          $match: {
            $or: [{ school: schoolObjectId }, { ownerId: schoolObjectId }],
          },
        },
        {
          $group: {
            _id: "$lifecycleStatus",
            count: { $sum: 1 },
          },
        },
      ]),
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
        .select("title lifecycleStatus date createdAt")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
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

    const students = studentsByStatus.reduce((sum, item) => sum + item.count, 0);
    const teachers = teachersByStatus.reduce((sum, item) => sum + item.count, 0);
    const events = eventsByLifecycle
      .filter((item) => item._id !== "ARCHIVED")
      .reduce((sum, item) => sum + item.count, 0);

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
      },
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return errorResponse(500, "Failed to fetch dashboard statistics");
  }
}
