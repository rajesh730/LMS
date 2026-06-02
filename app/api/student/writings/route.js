import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";
import { notifySchoolMagazineSubmitted } from "@/lib/magazineNotifications";
import { normalizeWritingCategory } from "@/lib/writingCategories";

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

    const writings = await SchoolMagazineArticle.find({
      authorStudent: student._id,
      school: student.school,
      isDeleted: { $ne: true },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      writings: writings.map((article) => ({
          id: String(article._id),
          sourceType: "SCHOOL_MAGAZINE_ARTICLE",
          title: article.title,
          content: article.content,
          category: article.category,
          submissionSource: article.submissionSource || "FREE_WRITE",
          status: article.status,
          reviewNote: article.reviewNote || "",
          isPublished: Boolean(article.isPublished),
          isMagazinePublished: Boolean(article.isMagazinePublished),
          isFeatured: Boolean(article.isFeatured),
          publicationScope: article.publicationScope || "SCHOOL_ONLY",
          submittedAt: article.submittedAt,
          reviewedAt: article.reviewedAt,
          publishedAt: article.publishedAt,
          updatedAt: article.updatedAt,
          createdAt: article.createdAt,
      })),
      student: {
        id: String(student._id),
        name: student.name,
        grade: student.grade,
        rollNumber: student.rollNumber,
      },
    });
  } catch (error) {
    console.error("GET /api/student/writings error:", error);
    return NextResponse.json(
      { message: "Failed to load student writings" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const student = await Student.findOne(buildStudentLookup(session))
      .select("_id school grade name")
      .lean();

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    const category = normalizeWritingCategory(body.category);
    const requestedStatus =
      String(body.status || "").toUpperCase() === "SUBMITTED"
        ? "SUBMITTED"
        : "DRAFT";

    if (!title || !content) {
      return NextResponse.json(
        { message: "Title and content are required" },
        { status: 400 }
      );
    }

    const article = await SchoolMagazineArticle.create({
      school: student.school,
      authorStudent: student._id,
      title,
      content,
      category,
      submissionSource: "FREE_WRITE",
      status: requestedStatus,
      submittedAt: requestedStatus === "SUBMITTED" ? new Date() : null,
    });

    publishWorkIndicatorsUpdate("student-writing-created", {
      schoolId: String(student.school),
      studentId: String(student._id),
      status: article.status,
    });

    if (requestedStatus === "SUBMITTED") {
      await notifySchoolMagazineSubmitted({
        article,
        student,
        schoolId: student.school,
      });
    }

    return NextResponse.json(
      {
        message:
          requestedStatus === "SUBMITTED"
            ? "Writing submitted for school review"
            : "Draft saved",
        article,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/student/writings error:", error);
    return NextResponse.json(
      { message: "Failed to save writing" },
      { status: 500 }
    );
  }
}
