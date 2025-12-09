import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Attendance from "@/models/Attendance";
import Teacher from "@/models/Teacher";
import connectDB from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";

/**
 * GET /api/attendance/monthly/teacher
 * Fetch monthly teacher attendance report
 * Query params: month, year, teacherId (optional)
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse(401, "Unauthorized");
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month"));
    const year = parseInt(searchParams.get("year"));
    const teacherId = searchParams.get("teacherId");

    if (!month || !year) {
      return errorResponse(400, "Missing month or year parameters");
    }

    // Build query
    let query = {
      school: session.user.schoolId || session.user.id,
      type: "teacher",
      date: {
        $gte: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
        $lte: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
      },
    };

    if (teacherId) {
      query.teacher = teacherId;
    }

    // Fetch attendance records
    const attendance = await Attendance.find(query)
      .populate("teacher", "name email subject")
      .sort({ teacher: 1, date: 1 });

    // Get all teachers if not filtering by specific teacher
    let teachers = [];
    if (!teacherId) {
      teachers = await Teacher.find({
        school: session.user.schoolId || session.user.id,
      })
        .select("_id name email subject")
        .sort({ name: 1 });
    }

    // Calculate statistics
    const stats = {};
    attendance.forEach((record) => {
      const tid = record.teacher._id.toString();
      if (!stats[tid]) {
        stats[tid] = {
          teacherId: tid,
          name: record.teacher.name,
          email: record.teacher.email,
          subject: record.teacher.subject,
          present: 0,
          absent: 0,
          leave: 0,
          total: 0,
        };
      }
      stats[tid].total++;
      if (record.status === "PRESENT") stats[tid].present++;
      else if (record.status === "ABSENT") stats[tid].absent++;
      else if (record.status === "LEAVE") stats[tid].leave++;
    });

    // Convert to array and sort
    const statsArray = Object.values(stats).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Calculate percentages
    const statsWithPercentage = statsArray.map((stat) => ({
      ...stat,
      percentage:
        stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0,
    }));

    return successResponse(200, "Teacher attendance report retrieved", {
      month,
      year,
      attendance,
      teachers,
      stats: statsWithPercentage,
      summary: {
        totalTeachers: statsWithPercentage.length,
        averageAttendance:
          statsWithPercentage.length > 0
            ? Math.round(
                statsWithPercentage.reduce((sum, s) => sum + s.percentage, 0) /
                  statsWithPercentage.length
              )
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching teacher monthly attendance:", error);
    return errorResponse(500, "Failed to fetch teacher attendance report");
  }
}
