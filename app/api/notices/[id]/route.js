import dbConnect from "@/lib/db";
import {
  successResponse,
  errorResponse,
  internalServerError,
  notFoundError,
  validationError,
} from "@/lib/apiResponse";
import Notice from "@/models/Notice";
import { requireApiSession } from "@/lib/authz";
import { publishNoticeRealtimeEvent } from "@/lib/noticeRealtime";
import { publishNoticeToParents } from "@/lib/notifications/service";

function canManageNotice(session, notice) {
  if (!session?.user?.id || !notice) return false;

  if (session.user.role === "SUPER_ADMIN") {
    return notice.scope === "PLATFORM" || String(notice.author) === String(session.user.id);
  }

  const schoolId = session.user.schoolId || session.user.id;
  return (
    notice.scope === "SCHOOL" &&
    notice.school &&
    String(notice.school) === String(schoolId)
  );
}

export async function PATCH(request, props) {
  try {
    await dbConnect();
    const { session, error: authError } = await requireApiSession();
    if (authError) return authError;

    if (!session?.user?.id) {
      return errorResponse(401, "Unauthorized", "UNAUTHORIZED");
    }

    const params = await props.params;
    const notice = await Notice.findById(params.id);

    if (!notice) {
      return notFoundError("Notice");
    }

    if (!canManageNotice(session, notice)) {
      return errorResponse(403, "Forbidden", "FORBIDDEN");
    }

    const body = await request.json();
    const nextTitle = String(body.title || "").trim();
    const nextContent = String(body.content || "").trim();
    if (!nextTitle || !nextContent) {
      return validationError("Title and content are required");
    }

    const nextStatus =
      String(body.status || "").toUpperCase() === "DRAFT"
        ? "DRAFT"
        : "PUBLISHED";

    notice.title = nextTitle;
    notice.content = nextContent;
    if (body.type !== undefined) {
      notice.type = String(body.type || "GENERAL").toUpperCase();
    }
    if (body.priority !== undefined) {
      notice.priority = String(body.priority || "NORMAL").toUpperCase();
    }
    if (body.visibility !== undefined) {
      notice.visibility =
        notice.scope === "PLATFORM"
          ? "PRIVATE"
          : String(body.visibility || "").toUpperCase() === "PUBLIC"
          ? "PUBLIC"
          : "PRIVATE";
    }
    if (body.targetAudience !== undefined && notice.scope === "SCHOOL") {
      notice.targetAudience = body.targetAudience;
    }
    if (body.grades !== undefined && notice.scope === "SCHOOL") {
      notice.grades = Array.isArray(body.grades) ? body.grades : [];
    }
    if (body.expiryDate !== undefined) {
      notice.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    }
    notice.status = nextStatus;
    if (notice.scope === "PLATFORM") {
      notice.visibility = "PRIVATE";
    }
    notice.publishedAt = nextStatus === "PUBLISHED" ? new Date() : null;

    await notice.save();
    await notice.populate("author", "name email");

    if (nextStatus === "PUBLISHED") {
      publishNoticeRealtimeEvent({
        scope: notice.scope,
        targetAudience: notice.targetAudience,
      });

      // Covers the two ways a notice reaches parents by edit rather than by
      // creation: a draft being published, and an existing notice having
      // parents added to it. `publishNoticeToParents` is a no-op if guardians
      // were already told, so editing a typo does not re-notify anyone.
      publishNoticeToParents(notice._id).catch((err) =>
        console.error("[notices] parent delivery failed:", err.message)
      );
    } else {
      publishNoticeRealtimeEvent({
        scope: notice.scope,
        targetAudience: notice.targetAudience,
        isDeleted: true,
      });
    }

    return successResponse(200, "Notice updated", { notice });
  } catch (error) {
    console.error("PATCH /api/notices/[id] error:", error);
    return internalServerError("Failed to update notice");
  }
}

export async function DELETE(request, props) {
  try {
    await dbConnect();
    const { session, error: authError } = await requireApiSession();
    if (authError) return authError;

    if (!session?.user?.id) {
      return errorResponse(401, "Unauthorized", "UNAUTHORIZED");
    }

    const params = await props.params;
    const notice = await Notice.findById(params.id);

    if (!notice) {
      return notFoundError("Notice");
    }

    if (!canManageNotice(session, notice)) {
      return errorResponse(403, "Forbidden", "FORBIDDEN");
    }

    notice.isActive = false;
    notice.isDeleted = true;
    notice.deletedAt = new Date();
    notice.deletedBy = session.user.id;
    await notice.save();

    publishNoticeRealtimeEvent({
      scope: notice.scope,
      targetAudience: notice.targetAudience,
      isDeleted: true,
    });

    return successResponse(200, "Notice archived");
  } catch (error) {
    console.error("DELETE /api/notices/[id] error:", error);
    return internalServerError("Failed to delete notice");
  }
}
