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

    if (!["PUBLISH", "UNPUBLISH"].includes(action)) {
      return NextResponse.json(
        { message: "Invalid magazine action" },
        { status: 400 }
      );
    }

    const before = {
      isPublished: article.isPublished,
      publishedAt: article.publishedAt,
      status: article.status,
    };

    if (action === "PUBLISH") {
      if (article.status !== "APPROVED") {
        return NextResponse.json(
          { message: "Only approved articles can be published" },
          { status: 400 }
        );
      }

      article.isPublished = true;
      article.publishedAt = article.publishedAt || new Date();
    }

    if (action === "UNPUBLISH") {
      article.isPublished = false;
      article.publishedAt = null;
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
        status: article.status,
      },
    });

    return NextResponse.json({
      message:
        action === "PUBLISH"
          ? "Article published to the school magazine"
          : "Article removed from the school magazine",
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
