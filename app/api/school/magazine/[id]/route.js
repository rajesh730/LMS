import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { recordLifecycleAudit } from "@/lib/lifecycle";
import MagazineIssue from "@/models/MagazineIssue";
import {
  getCurrentMagazineIssue,
  serializeMagazineIssue,
} from "@/lib/magazineIssues";

function isFreshForMagazine(article) {
  const sourceDate = new Date(
    article.submittedAt ||
      article.createdAt ||
      article.publishedAt ||
      article.updatedAt ||
      0
  );
  if (Number.isNaN(sourceDate.getTime())) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 2);
  return sourceDate >= cutoff;
}

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
        { message: "Article not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const action = String(body.action || "").toUpperCase();
    const requestedIssueId = body.magazineIssueId;

    if (
      ![
        "PUBLISH",
        "UNPUBLISH",
        "PUBLISH_HOMEPAGE",
        "UNPUBLISH_HOMEPAGE",
        "PUBLISH_MAGAZINE",
        "UNPUBLISH_MAGAZINE",
        "SHOW_SCHOOL_WALL",
        "HIDE_SCHOOL_WALL",
        "PUBLISH_GLOBAL_WALL",
        "UNPUBLISH_GLOBAL_WALL",
      ].includes(action)
    ) {
      return NextResponse.json(
        { message: "Invalid magazine action" },
        { status: 400 }
      );
    }

    const before = {
      isPublished: article.isPublished,
      publishedAt: article.publishedAt,
      isMagazinePublished: article.isMagazinePublished,
      magazineIssue: article.magazineIssue,
      magazineIssueAssignedAt: article.magazineIssueAssignedAt,
      magazinePublishedAt: article.magazinePublishedAt,
      showOnSchoolWall: article.showOnSchoolWall,
      isGlobalWallPublished: article.isGlobalWallPublished,
      status: article.status,
    };

    const updates = {};
    let assignedMagazineIssue = null;

    if (action === "PUBLISH" || action === "PUBLISH_HOMEPAGE") {
      updates.isPublished = true;
      updates.publishedAt = article.publishedAt || new Date();
      updates.status = "APPROVED";
    }

    if (action === "UNPUBLISH" || action === "UNPUBLISH_HOMEPAGE") {
      updates.isPublished = false;
      updates.publishedAt = null;
    }

    if (action === "PUBLISH_MAGAZINE") {
      if (!isFreshForMagazine(article)) {
        return NextResponse.json(
          {
            message:
              "This writing is older than 2 months and cannot be added to a magazine.",
          },
          { status: 400 }
        );
      }

      const targetIssue = requestedIssueId
        ? await MagazineIssue.findOne({
            _id: requestedIssueId,
            school: session.user.id,
          })
        : await getCurrentMagazineIssue(session.user.id);

      if (!targetIssue) {
        return NextResponse.json(
          { message: "Create or open a magazine before adding writing." },
          { status: 400 }
        );
      }

      if (article.magazineIssue) {
        const issue = await MagazineIssue.findById(article.magazineIssue).lean();
        const canShowInCurrentIssue =
          issue &&
          String(issue._id) === String(targetIssue._id);

        if (!canShowInCurrentIssue) {
          const serializedIssue = serializeMagazineIssue(issue);
          return NextResponse.json(
            {
              message: serializedIssue?.title
                ? `This writing was already used in ${serializedIssue.title}.`
                : "This writing was already used in a magazine issue.",
            },
            { status: 400 }
          );
        }

        updates.isMagazinePublished = true;
        updates.magazinePublishedAt = article.magazinePublishedAt || new Date();
        updates.status = "APPROVED";
        assignedMagazineIssue = issue;
      } else {
        assignedMagazineIssue = targetIssue;
        updates.isMagazinePublished = true;
        updates.magazinePublishedAt = article.magazinePublishedAt || new Date();
        updates.magazineIssue = assignedMagazineIssue._id;
        updates.magazineIssueAssignedAt = new Date();
        updates.status = "APPROVED";
      }
    }

    if (action === "UNPUBLISH_MAGAZINE") {
      updates.isMagazinePublished = false;
      updates.magazinePublishedAt = null;
      updates.magazineIssue = null;
      updates.magazineIssueAssignedAt = null;
    }

    if (action === "SHOW_SCHOOL_WALL") {
      updates.showOnSchoolWall = true;
    }

    if (action === "HIDE_SCHOOL_WALL") {
      updates.showOnSchoolWall = false;
    }

    if (action === "PUBLISH_GLOBAL_WALL") {
      updates.isGlobalWallPublished = true;
    }

    if (action === "UNPUBLISH_GLOBAL_WALL") {
      updates.isGlobalWallPublished = false;
    }

    const updateResult = await SchoolMagazineArticle.updateOne(
      { _id: article._id, school: session.user.id },
      { $set: updates }
    );

    if (!updateResult.matchedCount) {
      return NextResponse.json(
        { message: "Article could not be updated for this school" },
        { status: 404 }
      );
    }

    if (assignedMagazineIssue) {
      await MagazineIssue.updateOne(
        { _id: assignedMagazineIssue._id },
        { $addToSet: { articles: article._id } }
      );
    }

    if (action === "UNPUBLISH_MAGAZINE" && article.magazineIssue) {
      await MagazineIssue.updateOne(
        { _id: article.magazineIssue, school: session.user.id },
        { $pull: { articles: article._id } }
      );
    }

    const after = {
      isPublished:
        Object.prototype.hasOwnProperty.call(updates, "isPublished")
          ? updates.isPublished
          : article.isPublished,
      publishedAt:
        Object.prototype.hasOwnProperty.call(updates, "publishedAt")
          ? updates.publishedAt
          : article.publishedAt,
      isMagazinePublished:
        Object.prototype.hasOwnProperty.call(updates, "isMagazinePublished")
          ? updates.isMagazinePublished
          : article.isMagazinePublished,
      magazineIssue:
        Object.prototype.hasOwnProperty.call(updates, "magazineIssue")
          ? updates.magazineIssue
          : article.magazineIssue,
      magazineIssueAssignedAt:
        Object.prototype.hasOwnProperty.call(updates, "magazineIssueAssignedAt")
          ? updates.magazineIssueAssignedAt
          : article.magazineIssueAssignedAt,
      magazinePublishedAt:
        Object.prototype.hasOwnProperty.call(updates, "magazinePublishedAt")
          ? updates.magazinePublishedAt
          : article.magazinePublishedAt,
      showOnSchoolWall:
        Object.prototype.hasOwnProperty.call(updates, "showOnSchoolWall")
          ? updates.showOnSchoolWall
          : article.showOnSchoolWall,
      isGlobalWallPublished:
        Object.prototype.hasOwnProperty.call(updates, "isGlobalWallPublished")
          ? updates.isGlobalWallPublished
          : article.isGlobalWallPublished,
      status: updates.status || article.status,
    };

    await recordLifecycleAudit({
      entityType: "SchoolMagazineArticle",
      entityId: article._id,
      action,
      session,
      before,
      after,
    });

    const messageByAction = {
      PUBLISH: "Writing shown on the homepage",
      PUBLISH_HOMEPAGE: "Writing shown on the homepage",
      UNPUBLISH: "Writing hidden from the homepage",
      UNPUBLISH_HOMEPAGE: "Writing hidden from the homepage",
      PUBLISH_MAGAZINE: "Writing shown in the school magazine",
      UNPUBLISH_MAGAZINE: "Writing hidden from the school magazine",
      SHOW_SCHOOL_WALL: "Writing shown on the school wall",
      HIDE_SCHOOL_WALL: "Writing hidden from the school wall",
      PUBLISH_GLOBAL_WALL: "Writing added to the global wall",
      UNPUBLISH_GLOBAL_WALL: "Writing removed from the global wall",
    };

    return NextResponse.json({
      message: messageByAction[action] || "Article updated",
      article: {
        id: String(article._id),
        ...after,
        magazineIssue: serializeMagazineIssue(assignedMagazineIssue) ||
          (after.magazineIssue ? { id: String(after.magazineIssue) } : null),
      },
    });
  } catch (error) {
    console.error("PATCH /api/school/magazine/[id] error:", error);
    const message =
      process.env.NODE_ENV === "development" && error?.message
        ? `Failed to update school magazine article: ${error.message}`
        : "Failed to update school magazine article";
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}
