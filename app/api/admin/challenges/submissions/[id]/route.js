import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import PlatformChallengeSubmission from "@/models/PlatformChallengeSubmission";
import { recordLifecycleAudit } from "@/lib/lifecycle";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";

export async function PATCH(request, props) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const params = await props.params;
    const submission = await PlatformChallengeSubmission.findById(params.id);

    if (!submission) {
      return NextResponse.json(
        { message: "Submission not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const action = String(body.action || "").toUpperCase();
    const reviewNote = String(body.reviewNote || "").trim();

    if (!["SELECT_PUBLISH", "REJECT"].includes(action)) {
      return NextResponse.json(
        { message: "Invalid review action" },
        { status: 400 }
      );
    }

    const before = {
      status: submission.status,
      isPublic: submission.isPublic,
      publishedAt: submission.publishedAt,
      reviewNote: submission.reviewNote,
    };

    if (action === "SELECT_PUBLISH") {
      submission.status = "SELECTED";
      submission.isPublic = true;
      submission.publishedAt = submission.publishedAt || new Date();
      submission.reviewNote = reviewNote;
    }

    if (action === "REJECT") {
      submission.status = "REJECTED";
      submission.isPublic = false;
      submission.publishedAt = null;
      submission.reviewNote = reviewNote;
    }

    submission.reviewedAt = new Date();
    submission.reviewedBy = session.user.id;

    await submission.save();
    await recordLifecycleAudit({
      entityType: "PlatformChallengeSubmission",
      entityId: submission._id,
      action: submission.status === "SELECTED" ? "SELECTED_PUBLISHED" : "REJECTED",
      session,
      reason: reviewNote,
      before,
      after: {
        status: submission.status,
        isPublic: submission.isPublic,
        publishedAt: submission.publishedAt,
        reviewNote: submission.reviewNote,
      },
    });

    publishWorkIndicatorsUpdate("challenge-response-reviewed", {
      submissionId: String(submission._id),
      schoolId: String(submission.school || ""),
      status: submission.status,
      isPublic: Boolean(submission.isPublic),
    });

    return NextResponse.json({
      message:
        action === "SELECT_PUBLISH"
          ? "Response selected and published publicly"
          : "Response rejected",
      submission,
    });
  } catch (error) {
    console.error("PATCH /api/admin/challenges/submissions/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to update challenge submission" },
      { status: 500 }
    );
  }
}
