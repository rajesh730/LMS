import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import User from "@/models/User";
import "@/models/Event";
import { successResponse, internalServerError } from "@/lib/apiResponse";
import { requireParentChild } from "@/lib/parentAccess";
import { isActiveCertificateRecord } from "@/lib/certificates";
import { normalizeWritingCategory } from "@/lib/writingCategories";

export const dynamic = "force-dynamic";

/**
 * "My Child" portfolio: achievements, writing & research, certificates, and the
 * schools attended (§6, §9, §10, §18).
 *
 * What is deliberately NOT here (§18): disciplinary notes, confidential teacher
 * notes, internal administrative records. Only the child's own work, awards and
 * enrolment history are returned. The `select()` lists below are allow-lists,
 * not conveniences — nothing reaches a parent that is not named in them.
 */

const PLACEMENT_ICONS = {
  WINNER: "🥇",
  RUNNER_UP: "🥈",
  THIRD_PLACE: "🥉",
  FINALIST: "🎖️",
  MERIT: "📚",
  SPECIAL_MENTION: "⭐",
  PARTICIPANT: "🎯",
};

const CATEGORY_META = {
  BLOG_ARTICLE: { emoji: "✍️", labelKey: "writing.articles" },
  RESEARCH: { emoji: "🔬", labelKey: "writing.research" },
  CREATIVE_WRITING: { emoji: "🎨", labelKey: "writing.creative" },
  POEM: { emoji: "📖", labelKey: "writing.poems" },
  OPINION: { emoji: "💭", labelKey: "writing.blogs" },
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    const { student, context, error } = await requireParentChild(
      studentId,
      "canViewPortfolio"
    );
    if (error) return error;

    await connectDB();

    const [achievementsRaw, writingsRaw] = await Promise.all([
      Achievement.find({ student: student._id })
        .sort({ awardedAt: -1 })
        .limit(100)
        .select(
          "title description placement level awardedAt school event certificateUrl certificateCode certificateIssuedAt certificateState"
        )
        .populate("event", "title date")
        .lean(),
      SchoolMagazineArticle.find({
        authorStudent: student._id,
        isDeleted: { $ne: true },
        $or: [{ isPublished: true }, { status: "APPROVED" }],
      })
        .sort({ publishedAt: -1, updatedAt: -1 })
        .limit(100)
        // Preview sliced server-side — the full body is fetched only when the
        // parent opens one (§22).
        .select({
          title: 1,
          category: 1,
          school: 1,
          publishedAt: 1,
          updatedAt: 1,
          status: 1,
          reviewedBy: 1,
          publicationScope: 1,
          isGlobalWallPublished: 1,
          preview: { $substrCP: [{ $ifNull: ["$content", ""] }, 0, 200] },
        })
        .lean(),
    ]);

    // Resolve school names for attribution across the child's whole history.
    const enrollments = Array.isArray(student.enrollments)
      ? student.enrollments
      : [];
    const schoolIds = Array.from(
      new Set(
        [
          ...achievementsRaw.map((a) => String(a.school)),
          ...writingsRaw.map((w) => String(w.school)),
          ...enrollments.map((e) => String(e.school)),
          String(student.school || ""),
        ].filter(Boolean)
      )
    );
    const schools = await User.find({ _id: { $in: schoolIds } })
      .select("schoolName name")
      .lean();
    const schoolNameById = new Map(
      schools.map((s) => [String(s._id), s.schoolName || s.name || "School"])
    );
    const schoolName = (id) => schoolNameById.get(String(id)) || "School";

    const achievements = achievementsRaw.map((a) => ({
      id: String(a._id),
      title: a.title,
      description: a.description || "",
      placement: String(a.placement || "PARTICIPANT").replaceAll("_", " "),
      emoji: PLACEMENT_ICONS[a.placement] || "🏆",
      level: a.level,
      eventTitle: a.event?.title || "",
      date: a.awardedAt || a.event?.date || null,
      schoolName: schoolName(a.school),
      verified: isActiveCertificateRecord(a),
    }));

    // Certificates are a projection of achievements that carry one, not their
    // own store — the certificate lives on the Achievement (§10).
    const certificates = achievementsRaw
      .filter(isActiveCertificateRecord)
      .map((a) => ({
        id: String(a._id),
        title: a.title,
        eventTitle: a.event?.title || "",
        issuedAt: a.certificateIssuedAt,
        schoolName: schoolName(a.school),
        certificateCode: a.certificateCode || "",
        certificateUrl: a.certificateUrl || "",
        // Public verification page — the same one printed certificates point at.
        verifyPath: a.certificateCode
          ? `/verify?code=${encodeURIComponent(a.certificateCode)}`
          : "",
        verified: true,
      }));

    const writings = writingsRaw.map((w) => {
      const category = normalizeWritingCategory(w.category);
      const meta = CATEGORY_META[category] || CATEGORY_META.BLOG_ARTICLE;
      return {
        id: String(w._id),
        title: w.title,
        category,
        categoryEmoji: meta.emoji,
        categoryLabelKey: meta.labelKey,
        preview: w.preview || "",
        date: w.publishedAt || w.updatedAt || null,
        schoolName: schoolName(w.school),
        teacherReviewed: Boolean(w.reviewedBy) || w.status === "APPROVED",
        // Sharing is offered only where the school already published the work
        // beyond its own walls (§6 — "share only if permissions allow it").
        shareable: Boolean(w.isGlobalWallPublished),
      };
    });

    const schoolsAttended = [...enrollments]
      .sort(
        (a, b) =>
          (b.academicYearStart ?? 0) - (a.academicYearStart ?? 0) ||
          new Date(b.startedAt || 0) - new Date(a.startedAt || 0)
      )
      .map((entry) => ({
        schoolId: String(entry.school),
        name: entry.schoolNameSnapshot || schoolName(entry.school),
        grade: entry.grade || "",
        academicYear: entry.academicYear || "",
        status: entry.status,
        startedAt: entry.startedAt || null,
        endedAt: entry.endedAt || null,
      }));

    return successResponse(200, "Portfolio loaded", {
      child: {
        id: context.studentId,
        name: student.name,
        grade: student.grade || "",
        rollNumber: student.rollNumber || "",
        photoUrl: student.photoUrl || "",
        status: student.status,
        platformStudentId: student.platformStudentId || "",
        school: { id: context.schoolId, name: context.schoolName },
      },
      achievements,
      certificates,
      writings,
      schoolsAttended,
    });
  } catch (err) {
    console.error("GET /api/parent/portfolio error:", err);
    return internalServerError("Failed to load portfolio");
  }
}
