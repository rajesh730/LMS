import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { recordLifecycleAudit } from "@/lib/lifecycle";

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

    if (
      ![
        "PUBLISH",
        "UNPUBLISH",
        "PUBLISH_HOMEPAGE",
        "UNPUBLISH_HOMEPAGE",
        "PUBLISH_MAGAZINE",
        "UNPUBLISH_MAGAZINE",
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
      magazinePublishedAt: article.magazinePublishedAt,
      status: article.status,
    };

    if (["PUBLISH", "PUBLISH_HOMEPAGE", "PUBLISH_MAGAZINE"].includes(action)) {
      if (article.status !== "APPROVED") {
        return NextResponse.json(
          { message: "Only approved articles can be published" },
          { status: 400 }
        );
      }
    }

    if (action === "PUBLISH" || action === "PUBLISH_HOMEPAGE") {
      article.isPublished = true;
      article.publishedAt = article.publishedAt || new Date();
    }

    if (action === "UNPUBLISH" || action === "UNPUBLISH_HOMEPAGE") {
      article.isPublished = false;
      article.publishedAt = null;
    }

    if (action === "PUBLISH_MAGAZINE") {
      article.isMagazinePublished = true;
      article.magazinePublishedAt = article.magazinePublishedAt || new Date();
    }

    if (action === "UNPUBLISH_MAGAZINE") {
      article.isMagazinePublished = false;
      article.magazinePublishedAt = null;
    }

    await article.save();
    await recordLifecycleAudit({
      entityType: "SchoolMagazineArticle",
      entityId: article._id,
      action,
      session,
      before,
      after: {
        isPublished: article.isPublished,
        publishedAt: article.publishedAt,
        isMagazinePublished: article.isMagazinePublished,
        magazinePublishedAt: article.magazinePublishedAt,
        status: article.status,
      },
    });

    const messageByAction = {
      PUBLISH: "Article published to the homepage",
      PUBLISH_HOMEPAGE: "Article published to the homepage",
      UNPUBLISH: "Article removed from the homepage",
      UNPUBLISH_HOMEPAGE: "Article removed from the homepage",
      PUBLISH_MAGAZINE: "Article published to the school magazine",
      UNPUBLISH_MAGAZINE: "Article removed from the school magazine",
    };

    return NextResponse.json({
      message: messageByAction[action] || "Article updated",
      article,
    });
  } catch (error) {
    console.error("PATCH /api/school/magazine/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to update school magazine article" },
      { status: 500 }
    );
  }
}
