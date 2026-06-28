import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import MagazineIssue from "@/models/MagazineIssue";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";
import { notifySchoolMagazineSubmitted } from "@/lib/magazineNotifications";
import { normalizeWritingCategory } from "@/lib/writingCategories";
import { requireApiSession } from "@/lib/authz";

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

function hasVisibleSurface(article) {
  return Boolean(
    (article.status !== "DRAFT" && article.showOnSchoolWall !== false) ||
      article.isPublished ||
      article.isMagazinePublished ||
      article.isGlobalWallPublished
  );
}

function resetReviewStateIfFullyWithdrawn(article) {
  if (hasVisibleSurface(article)) return;
  article.status = "DRAFT";
  article.reviewedAt = null;
  article.reviewedBy = null;
  article.reviewNote = "";
}

// Handles student actions on a piece written at a school she has since left.
// The piece is portfolio-owned now: she edits/hides/shows it directly, it never
// re-enters a school review queue, and the origin school's magazine archive is
// only touched when she explicitly hides or deletes the piece.
async function handleTransferredOutWriting({ article, action, body, student }) {
  if (action === "MAKE_PRIVATE") {
    const previousMagazineIssue = article.magazineIssue;
    article.showOnSchoolWall = false;
    article.isPublished = false;
    article.isFeatured = false;
    article.isMagazinePublished = false;
    article.isGlobalWallPublished = false;
    article.publishedAt = null;
    article.magazinePublishedAt = null;
    article.magazineIssue = null;
    article.magazineIssueAssignedAt = null;
    await article.save();

    if (previousMagazineIssue) {
      await MagazineIssue.updateOne(
        { _id: previousMagazineIssue, school: article.school },
        { $pull: { articles: article._id } }
      );
    }

    return NextResponse.json({ message: "Writing hidden from your portfolio", article });
  }

  // Restore a previously hidden portfolio piece to public visibility.
  if (action === "RELEASE_SCHOOL_WALL" || action === "SHOW_PORTFOLIO") {
    article.status = "APPROVED";
    article.isPublished = true;
    article.publishedAt = article.publishedAt || new Date();
    article.showOnSchoolWall = false;
    await article.save();
    return NextResponse.json({ message: "Writing shown on your portfolio", article });
  }

  // Default: edit the content of her own portfolio piece.
  const nextTitle = String(body.title || "").trim();
  const nextContent = String(body.content || "").trim();
  const nextCategory = normalizeWritingCategory(body.category || article.category);

  if (!nextTitle || !nextContent) {
    return NextResponse.json(
      { message: "Title and content are required" },
      { status: 400 }
    );
  }

  article.title = nextTitle;
  article.content = nextContent;
  article.category = nextCategory;
  // Stays in her portfolio; never re-attaches to a school wall or review queue.
  article.showOnSchoolWall = false;
  article.isGlobalWallPublished = false;
  await article.save();

  return NextResponse.json({ message: "Writing updated", article });
}

export async function PATCH(request, props) {
  try {
    const { session, error } = await requireApiSession(["STUDENT"]);
    if (error) return error;

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
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: "Invalid writing id" },
        { status: 400 }
      );
    }

    // Match by author only — her writing follows her across schools, so she keeps
    // full control of pieces written at a school she has since left.
    const article = await SchoolMagazineArticle.findOne({
      _id: params.id,
      authorStudent: student._id,
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

    // Piece written at a school she has left: it's now a portfolio-owned item.
    // She edits/hides/shows it directly with no school re-review (there is no
    // school to moderate it anymore); it never re-attaches to a school wall.
    const isTransferredOut =
      String(article.school || "") !== String(student.school || "");

    if (isTransferredOut) {
      return handleTransferredOutWriting({ article, action, body, student });
    }

    if (action === "MAKE_PRIVATE") {
      const previousMagazineIssue = article.magazineIssue;

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

      if (previousMagazineIssue) {
        await MagazineIssue.updateOne(
          { _id: previousMagazineIssue, school: student.school },
          { $pull: { articles: article._id } }
        );
      }

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

    if (action === "WITHDRAW_SCHOOL_WALL") {
      article.showOnSchoolWall = false;
      resetReviewStateIfFullyWithdrawn(article);
      await article.save();

      publishWorkIndicatorsUpdate("student-writing-updated", {
        schoolId: String(student.school),
        studentId: String(student._id),
        status: article.status,
      });

      return NextResponse.json({
        message: "Writing withdrawn from school wall",
        article,
      });
    }

    if (action === "WITHDRAW_HOMEPAGE") {
      article.isPublished = false;
      article.isFeatured = false;
      article.publishedAt = null;
      article.homeShownAt = null;
      resetReviewStateIfFullyWithdrawn(article);
      await article.save();

      publishWorkIndicatorsUpdate("student-writing-updated", {
        schoolId: String(student.school),
        studentId: String(student._id),
        status: article.status,
      });

      return NextResponse.json({
        message: "Writing withdrawn from homepage",
        article,
      });
    }

    if (action === "WITHDRAW_GLOBAL_WALL") {
      article.isGlobalWallPublished = false;
      resetReviewStateIfFullyWithdrawn(article);
      await article.save();

      publishWorkIndicatorsUpdate("student-writing-updated", {
        schoolId: String(student.school),
        studentId: String(student._id),
        status: article.status,
      });

      return NextResponse.json({
        message: "Writing withdrawn from global wall",
        article,
      });
    }

    if (action === "WITHDRAW_MAGAZINE") {
      const previousMagazineIssue = article.magazineIssue;
      article.isMagazinePublished = false;
      article.magazineIssue = null;
      article.magazineIssueAssignedAt = null;
      article.magazinePublishedAt = null;
      resetReviewStateIfFullyWithdrawn(article);
      await article.save();

      if (previousMagazineIssue) {
        await MagazineIssue.updateOne(
          { _id: previousMagazineIssue, school: student.school },
          { $pull: { articles: article._id } }
        );
      }

      publishWorkIndicatorsUpdate("student-writing-updated", {
        schoolId: String(student.school),
        studentId: String(student._id),
        status: article.status,
      });

      return NextResponse.json({
        message: "Writing withdrawn from school magazine",
        article,
      });
    }

    if (action === "RELEASE_SCHOOL_WALL") {
      const previousStatus = article.status;
      const submittedAt = new Date();

      article.status =
        previousStatus === "APPROVED" || previousStatus === "SUBMITTED"
          ? previousStatus
          : "SUBMITTED";
      article.showOnSchoolWall = true;

      if (article.status === "SUBMITTED") {
        article.firstSubmittedAt =
          article.firstSubmittedAt || article.submittedAt || submittedAt;
        article.submittedAt = submittedAt;
        if (previousStatus === "REJECTED") {
          article.lastResubmittedAt = submittedAt;
          article.revisionCount = Number(article.revisionCount || 0) + 1;
        }
        article.reviewedAt = null;
        article.reviewedBy = null;
      }

      await article.save();

      publishWorkIndicatorsUpdate("student-writing-updated", {
        schoolId: String(student.school),
        studentId: String(student._id),
        status: article.status,
      });

      if (article.status === "SUBMITTED") {
        await notifySchoolMagazineSubmitted({
          article,
          student,
          schoolId: student.school,
          isResubmission: previousStatus === "REJECTED",
        });
      }

      return NextResponse.json({
        message: "Writing released to school wall",
        article,
      });
    }

    if (
      article.isMagazinePublished ||
      article.isPublished ||
      article.isGlobalWallPublished
    ) {
      return NextResponse.json(
        {
          message: "Make this writing private before editing published work",
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
    // Author-only match: she can delete her own writing from any school she
    // attended, including ones she has transferred away from.
    const article = await SchoolMagazineArticle.findOne({
      _id: params.id,
      authorStudent: student._id,
      isDeleted: { $ne: true },
    });

    if (!article) {
      return NextResponse.json(
        { message: "Writing not found" },
        { status: 404 }
      );
    }

    const previousMagazineIssue = article.magazineIssue;

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
    article.magazineIssue = null;
    article.magazineIssueAssignedAt = null;
    article.homeShownAt = null;
    await article.save();

    if (previousMagazineIssue) {
      await MagazineIssue.updateOne(
        { _id: previousMagazineIssue, school: article.school },
        { $pull: { articles: article._id } }
      );
    }

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
