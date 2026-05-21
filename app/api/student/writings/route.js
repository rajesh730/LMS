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
        title: article.title,
        content: article.content,
        category: article.category,
        submissionSource: article.submissionSource || "FREE_WRITE",
        challenge: article.challenge ? String(article.challenge) : null,
        challengeTitle: article.challengeTitle || "",
        status: article.status,
        reviewNote: article.reviewNote || "",
        submittedAt: article.submittedAt,
        reviewedAt: article.reviewedAt,
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
      .select("_id school grade")
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
    const category = String(body.category || "ESSAY").toUpperCase();
    const challengeId = String(body.challengeId || "").trim();
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

    if (challengeId) {
      return NextResponse.json(
        { message: "Challenge responses must use platform challenge submission" },
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
