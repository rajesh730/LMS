import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import SchoolConfig from "@/models/SchoolConfig";
import User from "@/models/User";
import Teacher from "@/models/Teacher";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { buildGradeLabels } from "@/lib/schoolGrades";

export async function GET() {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let schoolId = session.user.schoolId || session.user.id;

    if (session.user.role === "TEACHER") {
      const teacher = await Teacher.findOne({
        _id: session.user.id,
        isDeleted: { $ne: true },
        status: { $ne: "INACTIVE" },
      }).select("school");
      schoolId = teacher?.school || schoolId;
    }

    const [school, schoolConfig] = await Promise.all([
      User.findById(schoolId).select("schoolConfig"),
      SchoolConfig.findOne({ school: schoolId }),
    ]);

    const grades = buildGradeLabels(school?.schoolConfig);
    if (
      schoolConfig &&
      JSON.stringify(schoolConfig.grades || []) !== JSON.stringify(grades)
    ) {
      schoolConfig.grades = grades;
      await schoolConfig.save();
    }

    const formattedGrades = grades.map((grade) => ({
      _id: grade,
      name: grade,
      originalValue: grade,
    }));

    return NextResponse.json({
      grades: formattedGrades,
      summary: {
        totalGrades: formattedGrades.length,
      },
    });
  } catch (error) {
    console.error("Error fetching grade structure:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
