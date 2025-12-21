import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import ActivityLog from "@/models/ActivityLog";
import SchoolConfig from "@/models/SchoolConfig";
import StudentAcademicRecord from "@/models/StudentAcademicRecord";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { studentIds, targetGrade, isGraduating } = await req.json();

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { message: "No students selected for promotion" },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Fetch School Config to get Current Academic Year
    const schoolConfig = await SchoolConfig.findOne({ school: session.user.id });
    const currentYearId = schoolConfig?.currentAcademicYear;

    // 2. Fetch current student data BEFORE update to save history
    if (currentYearId) {
        const studentsToPromote = await Student.find({ 
            _id: { $in: studentIds }, 
            school: session.user.id 
        });

        const historyRecords = studentsToPromote.map(student => ({
            student: student._id,
            school: session.user.id,
            academicYear: currentYearId,
            grade: student.grade,
            section: student.section || "",
            rollNumber: student.rollNumber,
            finalStatus: isGraduating ? "GRADUATED" : "PROMOTED", // Simplified status
            promotedToGrade: isGraduating ? "ALUMNI" : targetGrade
        }));

        if (historyRecords.length > 0) {
            await StudentAcademicRecord.insertMany(historyRecords);
        }
    }

    let updateQuery = {};
    let actionDescription = "";

    if (isGraduating) {
      updateQuery = {
        status: "ALUMNI",
        statusReason: "Graduated",
        statusChangedAt: new Date(),
        statusChangedBy: session.user.id,
      };
      actionDescription = `Graduated ${studentIds.length} students`;
    } else {
      if (!targetGrade) {
        return NextResponse.json(
          { message: "Target grade is required for promotion" },
          { status: 400 }
        );
      }
      updateQuery = {
        grade: targetGrade,
      };
      // Check if it's a demotion or promotion based on grade string comparison (simple heuristic)
      // Ideally we would compare indices, but we don't have the grade structure here easily.
      // We'll just use "Moved" to be neutral, or keep "Promoted" as the generic term.
      // Let's try to be smart: if target < current (lexicographically for numbers), maybe demoted?
      // Actually, "Moved" is safer and accurate.
      actionDescription = `Moved ${studentIds.length} students to ${targetGrade}`;
    }

    const result = await Student.updateMany(
      { _id: { $in: studentIds }, school: session.user.id },
      { $set: updateQuery }
    );

    // Log activity
    try {
        await ActivityLog.create({
            school: session.user.id,
            user: session.user.id,
            action: "PROMOTION",
            details: actionDescription,
            entityType: "STUDENT",
            ipAddress: req.headers.get("x-forwarded-for") || "unknown"
        });
    } catch (logError) {
        console.error("Logging failed", logError);
    }

    return NextResponse.json(
      {
        message: "Promotion successful",
        modifiedCount: result.modifiedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Promotion Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
