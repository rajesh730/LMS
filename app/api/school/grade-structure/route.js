import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Grade from "@/models/Grade";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the school user
    const schoolUser = await User.findOne({
      email: session.user.email,
      role: "SCHOOL_ADMIN",
    });

    if (!schoolUser) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Get all grades for this school
    const grades = await Grade.find({ school: schoolUser._id })
      .populate("subjects", "name")
      .populate("teachers", "name email")
      .populate("students", "name email")
      .sort({ name: 1 });

    // Get education configuration
    const educationConfig = {
      educationLevels: schoolUser.educationLevels || {},
      schoolConfig: schoolUser.schoolConfig || {},
      schoolName: schoolUser.schoolName,
    };

    return NextResponse.json({
      grades: grades,
      educationConfig: educationConfig,
      summary: {
        totalGrades: grades.length,
        gradesByLevel: {
          SCHOOL: grades.filter((g) => g.level === "SCHOOL").length,
          HIGH_SCHOOL: grades.filter((g) => g.level === "HIGH_SCHOOL").length,
          BACHELOR: grades.filter((g) => g.level === "BACHELOR").length,
        },
        totalStudents: grades.reduce(
          (sum, grade) => sum + (grade.students?.length || 0),
          0
        ),
        totalTeachers: grades.reduce(
          (sum, grade) => sum + (grade.teachers?.length || 0),
          0
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching grade structure:", error);
    return NextResponse.json(
      { error: "Failed to fetch grade structure" },
      { status: 500 }
    );
  }
}
