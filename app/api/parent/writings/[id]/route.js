import connectDB from "@/lib/db";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireParentChild } from "@/lib/parentAccess";
import { normalizeWritingCategory } from "@/lib/writingCategories";

export const dynamic = "force-dynamic";

/**
 * Full text of one piece of the child's writing (§6, §7).
 *
 * The body is returned as plain text as well as its stored form, because the
 * Listen button feeds it straight to the device's speech synthesiser — a parent
 * who does not read comfortably should still be able to hear what their child
 * wrote.
 *
 * The `authorStudent` filter is the security boundary: a parent can only ever
 * fetch an article written by the child they are authorised for, so knowing an
 * article id from elsewhere on the platform gains them nothing here.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const { student, context, error } = await requireParentChild(
      searchParams.get("studentId"),
      "canViewPortfolio"
    );
    if (error) return error;

    await connectDB();

    const article = await SchoolMagazineArticle.findOne({
      _id: id,
      authorStudent: student._id,
      isDeleted: { $ne: true },
    })
      .select(
        "title content images coverImage tags category school createdAt publishedAt updatedAt status reviewNote reviewedBy isMagazinePublished magazineIssue magazineIssueAssignedAt magazinePublishedAt isGlobalWallPublished"
      )
      .populate("magazineIssue", "title status publishedAt")
      .lean();

    if (!article) {
      return errorResponse(404, "Writing not found", "NOT_FOUND");
    }

    return successResponse(200, "Writing loaded", {
      child: {
        id: context.studentId,
        name: student.name,
        school: { id: context.schoolId, name: context.schoolName },
      },
      writing: {
        id: String(article._id),
        title: article.title,
        category: normalizeWritingCategory(article.category),
        content: article.content || "",
        images: article.images || [],
        coverImage: article.coverImage || null,
        tags: article.tags || [],
        // Markup stripped and entities decoded so speech synthesis does not
        // read tags aloud.
        speechText: toSpeechText(article.title, article.content),
        date: article.publishedAt || article.updatedAt || article.createdAt || null,
        status: article.status || "DRAFT",
        reviewNote: article.reviewNote || "",
        teacherReviewed:
          Boolean(article.reviewedBy) || article.status === "APPROVED",
        magazineSelected: Boolean(article.magazineIssue),
        magazinePublished: Boolean(article.isMagazinePublished),
        magazineIssue: article.magazineIssue
          ? {
              id: String(article.magazineIssue._id),
              title: article.magazineIssue.title || "School magazine",
              status: article.magazineIssue.status || "DRAFT",
              publishedAt: article.magazineIssue.publishedAt || null,
            }
          : null,
        shareable: Boolean(article.isGlobalWallPublished),
      },
    });
  } catch (err) {
    console.error("GET /api/parent/writings/[id] error:", err);
    return internalServerError("Failed to load writing");
  }
}

/**
 * Flatten stored content into something a speech synthesiser reads cleanly.
 * Block-level tags become sentence breaks so the reader pauses between
 * paragraphs instead of running them together.
 */
function toSpeechText(title, content) {
  const body = String(content || "")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, ". ")
    .replace(/<br\s*\/?>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse the runs of ". . ." the substitutions above can create.
    .replace(/\s*\.\s*(\.\s*)+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();

  return [String(title || "").trim(), body].filter(Boolean).join(". ");
}
