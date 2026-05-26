import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { recordLifecycleAudit } from "@/lib/lifecycle";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";
import { notifyStudentMagazineReviewed } from "@/lib/magazineNotifications";

export async function PATCH(request, props) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const params = await props.params;
    const article = await SchoolMagazineArticle.findOne({
      _id: params.id,
      school: session.user.id,
      isDeleted: { $ne: true },
    });

    if (!article) {
      return NextResponse.json(
        { message: "Submission not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const action = String(body.action || "").toUpperCase();
    const reviewNote = String(body.reviewNote || "").trim();

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { message: "Invalid review action" },
        { status: 400 }
      );
    }

    if (article.status !== "SUBMITTED") {
      return NextResponse.json(
        { message: "Only submitted writings can be reviewed" },
        { status: 400 }
      );
    }

    const before = {
      status: article.status,
      reviewNote: article.reviewNote,
      reviewedAt: article.reviewedAt,
    };
    article.status = action === "APPROVE" ? "APPROVED" : "REJECTED";
    article.reviewNote = reviewNote;
    article.reviewedAt = new Date();
    article.reviewedBy = session.user.id;

    await article.save();
    await recordLifecycleAudit({
      entityType: "SchoolMagazineArticle",
      entityId: article._id,
      action: article.status,
      session,
      reason: reviewNote,
      before,
      after: {
        status: article.status,
        reviewNote: article.reviewNote,
        reviewedAt: article.reviewedAt,
      },
    });

    publishWorkIndicatorsUpdate("school-magazine-reviewed", {
      schoolId: String(session.user.id),
      articleId: String(article._id),
      status: article.status,
    });

    await notifyStudentMagazineReviewed({
      article,
      schoolId: session.user.id,
      status: article.status,
      reviewNote,
    });

    return NextResponse.json({
      message:
        action === "APPROVE"
          ? "Writing approved for the school magazine"
          : "Writing sent back to the student",
      article,
    });
  } catch (error) {
    console.error("PATCH /api/school/magazine-submissions/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to review submission" },
      { status: 500 }
    );
  }
}
