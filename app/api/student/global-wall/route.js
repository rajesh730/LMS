import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import SchoolConfig from "@/models/SchoolConfig";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import "@/models/User";
import { diversifyBySchool } from "@/lib/schoolDiversifiedFeed";

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
      .select("_id school")
      .lean();

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    const schoolConfig = await SchoolConfig.findOne({ school: student.school })
      .select("allowStudentGlobalWall")
      .lean();

    if (!schoolConfig?.allowStudentGlobalWall) {
      return NextResponse.json({
        enabled: false,
        articles: [],
      });
    }

    const articles = await SchoolMagazineArticle.find({
      status: "APPROVED",
      isPublished: true,
      isDeleted: { $ne: true },
    })
      .populate("authorStudent", "name grade rollNumber")
      .populate("school", "schoolName")
      .sort({ publishedAt: -1, updatedAt: -1 })
      .limit(50)
      .lean();

    const globalArticles = articles.map((article) => ({
      id: String(article._id),
      title: article.title,
      content: article.content,
      category: article.category,
      publishedAt: article.publishedAt || article.updatedAt,
      schoolId: article.school?._id ? String(article.school._id) : "",
      schoolName: article.school?.schoolName || "",
      authorStudent: article.authorStudent
        ? {
            name: article.authorStudent.name || "Student Writer",
            grade: article.authorStudent.grade || "",
            rollNumber: article.authorStudent.rollNumber || "",
          }
        : null,
    }));

    const diversifiedArticles = diversifyBySchool(globalArticles, {
      limit: 5,
      getSchoolKey: (article) => article.schoolId || article.schoolName,
      getTime: (article) => article.publishedAt,
    });

    return NextResponse.json({
      enabled: true,
      articles: diversifiedArticles.map((article) => ({
        id: article.id,
        title: article.title,
        content: article.content,
        category: article.category,
        publishedAt: article.publishedAt,
        authorStudent: article.authorStudent,
      })),
    });
  } catch (error) {
    console.error("GET /api/student/global-wall error:", error);
    return NextResponse.json(
      { message: "Failed to load global wall" },
      { status: 500 }
    );
  }
}
