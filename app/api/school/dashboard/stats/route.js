import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Teacher from "@/models/Teacher";
import Event from "@/models/Event";
import Attendance from "@/models/Attendance";
import { successResponse, errorResponse } from "@/lib/apiResponse";

/**
 * GET /api/school/dashboard/stats
 * Get dashboard statistics for school admin
 * Returns: students, teachers, classrooms, events, attendance data
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

    // Fetch all data in parallel
    const [students, teachers, events, attendance] =
      await Promise.all([
        Student.countDocuments({
          school: session.user.schoolId,
          isDeleted: { $ne: true },
        }),
        Teacher.countDocuments({
          school: session.user.schoolId,
        }),
        Event.countDocuments({
          schools: session.user.schoolId,
        }),
        Attendance.countDocuments({
          school: session.user.schoolId,
        }),
      ]);

    // Get status breakdown
    const studentsByStatus = await Student.aggregate([
      {
        $match: {
          school: session.user.schoolId,
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

    // Get students by grade (classroom feature removed)
    const studentsByGrade = await Student.aggregate([
      {
        $match: {
          school: session.user.schoolId,
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

    // Get attendance data for current month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const attendanceThisMonth = await Attendance.countDocuments({
      school: session.user.schoolId,
      date: {
        $gte: currentMonth,
        $lt: nextMonth,
      },
    });

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendanceToday = await Attendance.countDocuments({
      school: session.user.schoolId,
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    // Calculate attendance percentage
    const totalExpected = students * 1; // Simplified: 1 day per student
    const attendancePercentage =
      totalExpected > 0
        ? Math.round((attendanceToday / (students || 1)) * 100)
        : 0;

    // Format status breakdown
    const statusBreakdown = {};
    studentsByStatus.forEach((item) => {
      statusBreakdown[item._id || "UNKNOWN"] = item.count;
    });

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
      attendance: {
        total: attendance,
        thisMonth: attendanceThisMonth,
        today: attendanceToday,
        percentage: attendancePercentage,
      },
      teachers: {
        total: teachers,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return errorResponse(500, "Failed to fetch dashboard statistics");
  }
}
