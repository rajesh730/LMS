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

export async function PATCH(request, props) {
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

    const params = await props.params;
    const article = await SchoolMagazineArticle.findOne({
      _id: params.id,
      authorStudent: student._id,
      school: student.school,
      isDeleted: { $ne: true },
    });

    if (!article) {
      return NextResponse.json(
        { message: "Writing not found" },
        { status: 404 }
      );
    }

    if (!["DRAFT", "REJECTED", "SUBMITTED"].includes(article.status)) {
      return NextResponse.json(
        { message: "This writing can no longer be changed" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const nextTitle = String(body.title || "").trim();
    const nextContent = String(body.content || "").trim();
    const nextCategory = String(body.category || article.category).toUpperCase();
    const requestedStatus =
      String(body.status || "").toUpperCase() === "SUBMITTED"
        ? "SUBMITTED"
        : "DRAFT";

    if (!nextTitle || !nextContent) {
      return NextResponse.json(
        { message: "Title and content are required" },
        { status: 400 }
      );
    }

    article.title = nextTitle;
    article.content = nextContent;
    article.category = nextCategory;
    article.status = requestedStatus;
    article.reviewNote = requestedStatus === "SUBMITTED" ? "" : article.reviewNote;

    if (requestedStatus === "SUBMITTED") {
      article.submittedAt = new Date();
      article.reviewedAt = null;
      article.reviewedBy = null;
    } else if (article.status !== "REJECTED") {
      article.submittedAt = article.submittedAt || null;
    }

    await article.save();

    return NextResponse.json({
      message:
        requestedStatus === "SUBMITTED"
          ? "Writing submitted for school review"
          : "Draft updated",
      article,
    });
  } catch (error) {
    console.error("PATCH /api/student/writings/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to update writing" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, props) {
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

    const params = await props.params;
    const article = await SchoolMagazineArticle.findOne({
      _id: params.id,
      authorStudent: student._id,
      school: student.school,
      isDeleted: { $ne: true },
    });

    if (!article) {
      return NextResponse.json(
        { message: "Writing not found" },
        { status: 404 }
      );
    }

    if (!["DRAFT", "REJECTED"].includes(article.status)) {
      return NextResponse.json(
        { message: "Only draft or rejected writings can be deleted" },
        { status: 400 }
      );
    }

    article.isDeleted = true;
    article.deletedAt = new Date();
    article.deletedBy = student._id;
    article.isPublished = false;
    article.publishedAt = null;
    await article.save();

    return NextResponse.json({ message: "Writing deleted" });
  } catch (error) {
    console.error("DELETE /api/student/writings/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to delete writing" },
      { status: 500 }
    );
  }
}

export async function POST(request, props) {
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

    const params = await props.params;
    const article = await SchoolMagazineArticle.findOne({
      _id: params.id,
      authorStudent: student._id,
      school: student.school,
      isDeleted: { $ne: true },
    }).lean();

    if (!article) {
      return NextResponse.json(
        { message: "Writing not found" },
        { status: 404 }
      );
    }

    if (!["APPROVED"].includes(article.status)) {
      return NextResponse.json(
        { message: "Only approved writing can be revised as a new draft" },
        { status: 400 }
      );
    }

    const revision = await SchoolMagazineArticle.create({
      school: student.school,
      authorStudent: student._id,
      title: `${article.title} (Revision)`,
      content: article.content,
      category: article.category,
      submissionSource: "FREE_WRITE",
      status: "DRAFT",
    });

    return NextResponse.json(
      {
        message: "Revision draft created",
        article: revision,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/student/writings/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to create revision draft" },
      { status: 500 }
    );
  }
}
