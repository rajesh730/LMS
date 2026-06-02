import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const student = await Student.findOne(buildStudentLookup(session))
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
      isMagazinePublished: true,
      isDeleted: { $ne: true },
    })
      .populate("authorStudent", "name grade rollNumber")
      .sort({ publishedAt: -1, updatedAt: -1 })
      .lean();

    return NextResponse.json({
      articles: articles.map((article) => ({
        id: String(article._id),
        title: article.title,
        content: article.content,
        category: article.category,
        publishedAt: article.publishedAt,
        authorStudent: article.authorStudent
          ? {
              id: String(article.authorStudent._id),
              name: article.authorStudent.name,
              grade: article.authorStudent.grade,
              rollNumber: article.authorStudent.rollNumber,
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
    console.error("GET /api/student/magazine error:", error);
    return NextResponse.json(
      { message: "Failed to load school magazine" },
      { status: 500 }
    );
  }
}
