import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Teacher from "@/models/Teacher";
import Event from "@/models/Event";
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

    // Fetch all data in parallel
    const [students, teachers, events] =
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

    // Get students by grade
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
      teachers: {
        total: teachers,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return errorResponse(500, "Failed to fetch dashboard statistics");
  }
}
