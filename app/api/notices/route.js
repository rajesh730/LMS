import {
  successResponse,
  errorResponse,
  validationError,
} from "@/lib/apiResponse";
import Notice from "@/models/Notice";
import { defineRoute } from "@/lib/routeHandler";
import { buildPagination, escapeRegex, parsePagination } from "@/lib/pagination";
import { publishNoticeRealtimeEvent } from "@/lib/noticeRealtime";
import { publishNoticeToParents } from "@/lib/notifications/service";

export const GET = defineRoute(
  { roles: [], errorMessage: "Failed to fetch notices" },
  async ({ request, session }) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const priority = searchParams.get("priority");
    const status = searchParams.get("status");
    const grade = searchParams.get("grade");
    const active = searchParams.get("active") !== "false";
    const audience = searchParams.get("audience"); // 'students', 'teachers', 'parents'
    const scope = String(searchParams.get("scope") || "SCHOOL").toUpperCase();
    const search = String(searchParams.get("search") || "").trim();
    const { page, limit, skip } = parsePagination(searchParams, {
      limit: 20,
      maxLimit: 100,
    });

    const query = { isActive: active, isDeleted: { $ne: true } };

    if (scope === "PLATFORM") {
      if (session.user.role !== "SUPER_ADMIN") {
        return errorResponse(403, "Forbidden", "FORBIDDEN");
      }
      query.scope = "PLATFORM";
    } else {
      query.scope = "SCHOOL";
      query.school = session.user.schoolId || session.user.id;
    }

    // Add filters
    if (type) query.type = type.toUpperCase();
    if (priority) query.priority = priority.toUpperCase();
    if (status) query.status = status.toUpperCase();
    // Filter by audience
    if (audience) {
      query[`targetAudience.${audience}`] = true;
    }

    // Build $and array for conditions that need combining
    const andConditions = [];

    if (search) {
      const safeSearch = escapeRegex(search);
      andConditions.push({
        $or: [
          { title: { $regex: safeSearch, $options: "i" } },
          { content: { $regex: safeSearch, $options: "i" } },
        ],
      });
    }

    if (grade) {
      andConditions.push({
        $or: [{ grades: { $size: 0 } }, { grades: grade }],
      });
    }

    // Only show non-expired notices by default
    if (active) {
      andConditions.push({
        $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }],
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const [notices, total] = await Promise.all([
      Notice.find(query)
        .select(
          "title content type scope priority status school author event visibility targetAudience grades expiryDate isActive publishedAt createdAt updatedAt"
        )
        .populate("author", "name email")
        .sort({ priority: -1, publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notice.countDocuments(query),
    ]);
    const pagination = buildPagination({ page, limit, total });

    return successResponse(200, "Notices loaded", {
      notices,
      total,
      page,
      totalPages: pagination.totalPages,
      pagination,
    });
  }
);

export const POST = defineRoute(
  { roles: [], errorMessage: "Failed to create notice" },
  async ({ request, session }) => {
    const body = await request.json();
    const {
      title,
      content,
      type,
      priority,
      scope,
      status,
      visibility,
      targetAudience,
      grades,
      expiryDate,
      eventId,
    } = body;

    if (!title || !content) {
      return validationError("Title and content are required");
    }

    const normalizedScope =
      String(scope || "").toUpperCase() === "PLATFORM" ? "PLATFORM" : "SCHOOL";
    const normalizedVisibility =
      normalizedScope === "PLATFORM"
        ? "PRIVATE"
        : String(visibility || "").toUpperCase() === "PUBLIC"
          ? "PUBLIC"
          : "PRIVATE";
    const normalizedStatus =
      String(status || "").toUpperCase() === "DRAFT" ? "DRAFT" : "PUBLISHED";

    if (normalizedScope === "PLATFORM" && session.user.role !== "SUPER_ADMIN") {
      return errorResponse(403, "Forbidden", "FORBIDDEN");
    }

    if (
      normalizedScope === "SCHOOL" &&
      normalizedVisibility !== "PUBLIC" &&
      !targetAudience?.students &&
      !targetAudience?.teachers &&
      !targetAudience?.parents
    ) {
      return validationError("At least one target audience must be selected");
    }

    const newNotice = new Notice({
      title: title.trim(),
      content: content.trim(),
      type: type?.toUpperCase() || "GENERAL",
      scope: normalizedScope,
      priority: priority?.toUpperCase() || "NORMAL",
      status: normalizedStatus,
      school:
        normalizedScope === "PLATFORM"
          ? null
          : session.user.schoolId || session.user.id,
      author: session.user.id,
      event: eventId || null,
      visibility: normalizedVisibility,
      targetAudience:
        normalizedScope === "PLATFORM"
          ? { students: false, teachers: false, parents: false }
          : targetAudience,
      grades: grades || [],
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      attachments: [],
      isActive: true,
      publishedAt: normalizedStatus === "PUBLISHED" ? new Date() : null,
    });

    const savedNotice = await newNotice.save();

    // Populate author for response
    await savedNotice.populate("author", "name email");

    if (normalizedStatus === "PUBLISHED") {
      publishNoticeRealtimeEvent({
        scope: savedNotice.scope,
        targetAudience: savedNotice.targetAudience,
      });

      // "Students and parents" has to actually reach parents. Fire-and-forget:
      // the notice is already saved, and a notification-channel failure must
      // not turn a successful publish into an error the school has to retry.
      publishNoticeToParents(savedNotice._id).catch((err) =>
        console.error("[notices] parent delivery failed:", err.message)
      );
    }

    return successResponse(201, "Notice published successfully", {
      notice: savedNotice,
    });
  }
);
