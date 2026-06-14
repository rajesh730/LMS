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

export async function PATCH(request, props) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const student = await Student.findOne(buildStudentLookup(session))
      .select("_id school name")
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

    const body = await request.json();
    const action = String(body.action || "").toUpperCase();

    if (action === "MAKE_PRIVATE") {
      article.status = "DRAFT";
      article.showOnSchoolWall = false;
      article.isMagazinePublished = false;
      article.isPublished = false;
      article.isFeatured = false;
      article.isGlobalWallPublished = false;
      article.publicationScope = "SCHOOL_ONLY";
      article.magazineIssue = null;
      article.magazineIssueAssignedAt = null;
      article.magazinePublishedAt = null;
      article.publishedAt = null;
      article.reviewedAt = null;
      article.reviewedBy = null;
      article.reviewNote = "";

      await article.save();

      publishWorkIndicatorsUpdate("student-writing-updated", {
        schoolId: String(student.school),
        studentId: String(student._id),
        status: article.status,
      });

      return NextResponse.json({
        message: "Writing made private",
        article,
      });
    }

    if (article.isMagazinePublished || article.isPublished) {
      return NextResponse.json(
        {
          message: "Published writing can no longer be changed here",
        },
        { status: 400 }
      );
    }

    const nextTitle = String(body.title || "").trim();
    const nextContent = String(body.content || "").trim();
    const nextCategory = normalizeWritingCategory(body.category || article.category);
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

    const previousStatus = article.status;

    article.title = nextTitle;
    article.content = nextContent;
    article.category = nextCategory;
    article.status = requestedStatus;
    article.showOnSchoolWall = requestedStatus === "SUBMITTED";
    article.isMagazinePublished = false;
    article.isPublished = false;
    article.magazinePublishedAt = null;
    article.publishedAt = null;
    article.reviewNote = requestedStatus === "SUBMITTED" ? "" : article.reviewNote;

    if (requestedStatus === "SUBMITTED") {
      const submittedAt = new Date();
      article.firstSubmittedAt = article.firstSubmittedAt || article.submittedAt || submittedAt;
      article.submittedAt = submittedAt;
      if (previousStatus === "REJECTED") {
        article.lastResubmittedAt = submittedAt;
        article.revisionCount = Number(article.revisionCount || 0) + 1;
      }
      article.reviewedAt = null;
      article.reviewedBy = null;
    } else if (article.status !== "REJECTED") {
      article.submittedAt = article.submittedAt || null;
    }

    await article.save();

    publishWorkIndicatorsUpdate("student-writing-updated", {
      schoolId: String(student.school),
      studentId: String(student._id),
      status: article.status,
    });

    if (requestedStatus === "SUBMITTED") {
      await notifySchoolMagazineSubmitted({
        article,
        student,
        schoolId: student.school,
        isResubmission: previousStatus === "REJECTED",
      });
    }

    return NextResponse.json({
      message:
        requestedStatus === "SUBMITTED"
          ? "Posted to school wall"
          : "Private writing updated",
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

    article.isDeleted = true;
    article.deletedAt = new Date();
    article.deletedBy = student._id;
    article.showOnSchoolWall = false;
    article.isPublished = false;
    article.isFeatured = false;
    article.isMagazinePublished = false;
    article.isGlobalWallPublished = false;
    article.publishedAt = null;
    article.magazinePublishedAt = null;
    article.homeShownAt = null;
    await article.save();

    publishWorkIndicatorsUpdate("student-writing-deleted", {
      schoolId: String(student.school),
      studentId: String(student._id),
    });

    return NextResponse.json({ message: "Writing deleted" });
  } catch (error) {
    console.error("DELETE /api/student/writings/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to delete writing" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        message:
          "This action was removed. Students can edit private or school wall writing directly.",
      },
      { status: 410 }
    );
  } catch (error) {
    console.error("POST /api/student/writings/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to update writing" },
      { status: 500 }
    );
  }
}
