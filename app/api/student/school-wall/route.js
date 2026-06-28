import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { requireApiSession } from "@/lib/authz";
import { serializeAuthoredEra } from "@/lib/writingProvenance";

function studentLookup(session) {
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
    const { session, error } = await requireApiSession(["STUDENT"]);
    if (error) return error;

    await connectDB();
    const student = await Student.findOne(studentLookup(session))
      .select("_id school name grade rollNumber")
      .lean();

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    const articles = await SchoolMagazineArticle.find({
      school: student.school,
      status: { $in: ["SUBMITTED", "APPROVED"] },
      showOnSchoolWall: { $ne: false },
      isDeleted: { $ne: true },
    })
      .populate("authorStudent", "name grade")
      .sort({ submittedAt: -1, updatedAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      items: articles.map((article) => ({
        id: String(article._id),
        title: article.title,
        content: article.content,
        category: article.category,
        publishedAt:
          article.publishedAt || article.submittedAt || article.updatedAt,
        ...serializeAuthoredEra(article),
        authorStudent: article.authorStudent
          ? {
              id: String(article.authorStudent._id),
              name: article.authorStudent.name,
              grade: article.authorStudent.grade,
            }
          : null,
      })),
      student: {
        id: String(student._id),
        name: student.name,
        grade: student.grade,
        rollNumber: student.rollNumber,
      },
    });
  } catch (error) {
    console.error("GET /api/student/school-wall error:", error);
    return NextResponse.json(
      { message: "Failed to load school wall" },
      { status: 500 }
    );
  }
}
