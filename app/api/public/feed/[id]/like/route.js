import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import PlatformChallengeSubmission from "@/models/PlatformChallengeSubmission";
import PublicFeedReaction from "@/models/PublicFeedReaction";
import {
  buildPublicFeedViewerCookieOptions,
  createPublicFeedViewerId,
  PUBLIC_FEED_VIEWER_COOKIE,
} from "@/lib/publicFeedViewer";
import { publishRealtimeEvent } from "@/lib/realtimeBus";

function getSubmissionId(feedItemId = "") {
  if (!feedItemId.startsWith("pulse-")) return "";
  return feedItemId.slice("pulse-".length).trim();
}

export async function POST(_request, { params }) {
  try {
    const submissionId = getSubmissionId(params.id);

    if (!submissionId) {
      return NextResponse.json(
        { message: "Only pulse posts can be liked." },
        { status: 400 }
      );
    }

    await connectDB();

    const submission = await PlatformChallengeSubmission.findOne({
      _id: submissionId,
      status: "SELECTED",
      isPublic: true,
    })
      .select("_id")
      .lean();

    if (!submission) {
      return NextResponse.json({ message: "Post not found." }, { status: 404 });
    }

    const cookieStore = await cookies();
    let viewerId = cookieStore.get(PUBLIC_FEED_VIEWER_COOKIE)?.value || "";
    let shouldSetCookie = false;

    if (!viewerId) {
      viewerId = createPublicFeedViewerId();
      shouldSetCookie = true;
    }

    const existingReaction = await PublicFeedReaction.findOne({
      submission: submissionId,
      actorKey: viewerId,
    })
      .select("_id")
      .lean();

    if (existingReaction) {
      await PublicFeedReaction.deleteOne({ _id: existingReaction._id });
    } else {
      await PublicFeedReaction.create({
        submission: submissionId,
        actorKey: viewerId,
      });
    }

    const reactionCount = await PublicFeedReaction.countDocuments({
      submission: submissionId,
    });

    publishRealtimeEvent("public-feed", {
      kind: "like-updated",
      itemId: params.id,
      reactionCount,
    });

    const response = NextResponse.json({
      liked: !existingReaction,
      reactionCount,
    });

    if (shouldSetCookie) {
      response.cookies.set(
        PUBLIC_FEED_VIEWER_COOKIE,
        viewerId,
        buildPublicFeedViewerCookieOptions()
      );
    }

    return response;
  } catch (error) {
    console.error("POST /api/public/feed/[id]/like error:", error);
    return NextResponse.json(
      { message: "Failed to update like" },
      { status: 500 }
    );
  }
}
