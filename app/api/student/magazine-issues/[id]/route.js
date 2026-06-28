import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import MagazineIssue from "@/models/MagazineIssue";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { serializeMagazineIssue } from "@/lib/magazineIssues";
import { serializeAuthoredEra } from "@/lib/writingProvenance";

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

function serializeArticle(article) {
  return {
    id: String(article._id),
    title: article.title,
    content: article.content,
    category: article.category,
    publishedAt: article.publishedAt || article.updatedAt,
    ...serializeAuthoredEra(article),
    authorStudent: article.authorStudent
      ? {
          id: String(article.authorStudent._id),
          name: article.authorStudent.name,
          grade: article.authorStudent.grade,
          rollNumber: article.authorStudent.rollNumber,
        }
      : null,
  };
}

function issueDate(issue) {
  return new Date(issue.publishedAt || issue.weekStart || issue.createdAt || 0);
}

function getMonthIssueTitle(issue, issuesInMonth) {
  const orderedIssues = [...issuesInMonth].sort(
    (a, b) => issueDate(a) - issueDate(b)
  );
  const issueNumber =
    orderedIssues.findIndex((item) => String(item._id) === String(issue._id)) +
    1;
  const monthName = issueDate(issue).toLocaleDateString("en-US", {
    month: "long",
  });
  return `${monthName} Magazine ${Math.max(1, issueNumber)}`;
}

export async function GET(_request, props) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: "Magazine not found" },
        { status: 404 }
      );
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

    const issue = await MagazineIssue.findOne({
      _id: params.id,
      school: student.school,
      status: "PUBLISHED",
    }).lean();

    if (!issue) {
      return NextResponse.json(
        { message: "Magazine not found" },
        { status: 404 }
      );
    }

    const [articles, issuesInMonth] = await Promise.all([
      SchoolMagazineArticle.find({
        school: student.school,
        magazineIssue: issue._id,
        isMagazinePublished: true,
        isDeleted: { $ne: true },
      })
        .populate("authorStudent", "name grade rollNumber")
        .sort({ magazinePublishedAt: 1, publishedAt: 1, updatedAt: 1 })
        .lean(),
      MagazineIssue.find({
        school: student.school,
        month: issue.month,
        year: issue.year,
        status: "PUBLISHED",
      }).lean(),
    ]);

    if (articles.length === 0) {
      return NextResponse.json(
        { message: "This magazine has no published writing yet" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      issue: {
        ...serializeMagazineIssue(issue),
        title: getMonthIssueTitle(issue, issuesInMonth),
      },
      articles: articles.map(serializeArticle),
      student: {
        id: String(student._id),
        name: student.name,
        grade: student.grade,
        rollNumber: student.rollNumber,
      },
    });
  } catch (error) {
    console.error("GET /api/student/magazine-issues/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to load magazine" },
      { status: 500 }
    );
  }
}
