/**
 * Student writing — portfolio visibility rules.
 *
 * Extracted from `app/api/student/writings/[id]/route.js`. These decide whether
 * a piece is visible anywhere, and what happens to a piece written at a school
 * the student has since left.
 *
 * `applyTransferredOutAction` returns plain data (`{ message, article }` or
 * `{ error, status }`) rather than a Response — the route turns that into HTTP.
 */
import MagazineIssue from "@/models/MagazineIssue";
import { normalizeWritingCategory } from "@/lib/writingCategories";

/**
 * Is this piece visible on ANY surface — school wall, portfolio, magazine, or
 * the global wall? Used to decide whether a withdrawal has left it fully
 * hidden, in which case its review state should reset.
 */
export function hasVisibleSurface(article) {
  return Boolean(
    (article.status !== "DRAFT" && article.showOnSchoolWall !== false) ||
      article.isPublished ||
      article.isMagazinePublished ||
      article.isGlobalWallPublished
  );
}

/**
 * A piece pulled from every surface goes back to being an unreviewed draft.
 * Leaving a stale APPROVED status on an invisible piece would let it reappear
 * as already-approved if the student republished it later.
 */
export function resetReviewStateIfFullyWithdrawn(article) {
  if (hasVisibleSurface(article)) return;
  article.status = "DRAFT";
  article.reviewedAt = null;
  article.reviewedBy = null;
  article.reviewNote = "";
}

/**
 * Student actions on a piece written at a school she has since left.
 *
 * The piece is portfolio-owned now: she edits, hides and shows it directly, it
 * never re-enters a school review queue, and the origin school's magazine
 * archive is only touched when she explicitly hides or deletes the piece.
 */
export async function applyTransferredOutAction({ article, action, body }) {
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

    return { message: "Writing hidden from your portfolio", article };
  }

  // Restore a previously hidden portfolio piece to public visibility.
  if (action === "RELEASE_SCHOOL_WALL" || action === "SHOW_PORTFOLIO") {
    article.status = "APPROVED";
    article.isPublished = true;
    article.publishedAt = article.publishedAt || new Date();
    article.showOnSchoolWall = false;
    await article.save();
    return { message: "Writing shown on your portfolio", article };
  }

  // Default: edit the content of her own portfolio piece.
  const nextTitle = String(body.title || "").trim();
  const nextContent = String(body.content || "").trim();
  const nextCategory = normalizeWritingCategory(body.category || article.category);

  if (!nextTitle || !nextContent) {
    return { error: "Title and content are required", status: 400 };
  }

  article.title = nextTitle;
  article.content = nextContent;
  article.category = nextCategory;
  // Stays in her portfolio; never re-attaches to a school wall or review queue.
  article.showOnSchoolWall = false;
  article.isGlobalWallPublished = false;
  await article.save();

  return { message: "Writing updated", article };
}
