import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import PlatformChallengeSubmission from "@/models/PlatformChallengeSubmission";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { recordLifecycleAudit } from "@/lib/lifecycle";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";
import "@/models/PlatformChallenge";

export async function PATCH(request, props) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const params = await props.params;
    const schoolIds = [session.user.id, session.user.schoolId]
      .filter(Boolean)
      .map(String);

    const submission = await PlatformChallengeSubmission.findOne({
      _id: params.id,
      school: { $in: schoolIds },
      status: "SELECTED",
      isPublic: true,
    }).populate("challenge", "title");

    if (!submission) {
      return NextResponse.json(
        { message: "Challenge response not found" },
        { status: 404 }
      );
    }

    if (submission.addedToSchoolMagazine && submission.schoolMagazineArticle) {
      return NextResponse.json(
        { message: "This response is already in your school magazine" },
        { status: 409 }
      );
    }

    const article = await SchoolMagazineArticle.create({
      school: submission.school,
      authorStudent: submission.student,
      title: submission.title,
      content: submission.content,
      category: submission.category,
      status: "APPROVED",
      submissionSource: "PLATFORM_CHALLENGE",
      challenge: submission.challenge?._id || submission.challenge || null,
      challengeTitle: submission.challenge?.title || "Platform Challenge",
      reviewedAt: new Date(),
      reviewedBy: session.user.id,
      isPublished: true,
      publishedAt: new Date(),
    });

    submission.addedToSchoolMagazine = true;
    submission.schoolMagazineArticle = article._id;
    await submission.save();
    await recordLifecycleAudit({
      entityType: "PlatformChallengeSubmission",
      entityId: submission._id,
      action: "ADDED_TO_SCHOOL_MAGAZINE",
      session,
      after: {
        addedToSchoolMagazine: submission.addedToSchoolMagazine,
        schoolMagazineArticle: submission.schoolMagazineArticle,
      },
    });

    publishWorkIndicatorsUpdate("challenge-response-added-to-magazine", {
      schoolId: String(submission.school),
      submissionId: String(submission._id),
      articleId: String(article._id),
    });

    return NextResponse.json({
      message: "Challenge response added to school magazine",
      article,
    });
  } catch (error) {
    console.error("PATCH /api/school/challenge-winners/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to add response to school magazine" },
      { status: 500 }
    );
  }
}
