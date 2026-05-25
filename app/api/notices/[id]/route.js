import dbConnect from "@/lib/db";
import Notice from "@/models/Notice";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { publishNoticeRealtimeEvent } from "@/lib/noticeRealtime";

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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const notice = await Notice.findById(params.id);

    if (!notice) {
      return Response.json({ error: "Notice not found" }, { status: 404 });
    }

    if (!canManageNotice(session, notice)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const nextTitle = String(body.title || "").trim();
    const nextContent = String(body.content || "").trim();
    if (!nextTitle || !nextContent) {
      return Response.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
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
    } else {
      publishNoticeRealtimeEvent({
        scope: notice.scope,
        targetAudience: notice.targetAudience,
        isDeleted: true,
      });
    }

    return Response.json({ message: "Notice updated", notice });
  } catch (error) {
    console.error("PATCH /api/notices/[id] error:", error);
    return Response.json({ error: "Failed to update notice" }, { status: 500 });
  }
}

export async function DELETE(request, props) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const notice = await Notice.findById(params.id);

    if (!notice) {
      return Response.json({ error: "Notice not found" }, { status: 404 });
    }

    if (!canManageNotice(session, notice)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
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

    return Response.json({ message: "Notice archived" });
  } catch (error) {
    console.error("DELETE /api/notices/[id] error:", error);
    return Response.json({ error: "Failed to delete notice" }, { status: 500 });
  }
}
