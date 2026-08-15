import connectDB from "@/lib/db";
import Student from "@/models/Student";
import User from "@/models/User";
import Achievement from "@/models/Achievement";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import ParticipationRequest from "@/models/ParticipationRequest";
// Mongoose only knows a ref once its file has been imported, and a cold Vercel
// lambda loads only its own route's graph. Without this the .populate("event")
// below throws MissingSchemaError in production only. See MEMORY.md.
import "@/models/Event";
import { isActiveCertificateRecord } from "@/lib/certificates";
import { normalizeWritingCategory } from "@/lib/writingCategories";

/**
 * The child's Journey (§5) — a single continuous timeline across every school
 * they have ever attended.
 *
 * DERIVED, NOT STORED. There is no JourneyEntry collection. Entries are
 * projected from the source entities (Achievement, SchoolMagazineArticle,
 * ParticipationRequest, Student.enrollments) on read.
 *
 * That is a deliberate answer to §35's two requirements — "do not create
 * duplicate Journey entries" and "use references to source entities". A stored
 * timeline would need a write on every achievement/article/result path, and any
 * missed hook or replayed backfill would produce exactly the duplicates the
 * spec forbids. Deriving makes duplication structurally impossible and means a
 * corrected achievement is corrected on the timeline for free.
 *
 * The cost is read-time aggregation. It is bounded — a student's whole history
 * is tens of rows, not thousands — and every query below is covered by an
 * existing index.
 *
 * TRANSFER SAFETY (§24): every entry carries the school it happened at, taken
 * from the source record, never from the student's CURRENT school. A child who
 * moves from Orbit to Green Village keeps their Orbit entries attributed to
 * Orbit, and the new school cannot silently reattribute or edit them.
 */

export const JOURNEY_FILTERS = [
  "ALL",
  "ACHIEVEMENTS",
  "WRITING",
  "RESEARCH",
  "EVENTS",
  "CERTIFICATES",
];

export const JOURNEY_GROUP_BY = ["YEAR", "GRADE", "SCHOOL"];

/**
 * Tag an item with the academic year whose enrolment window contains it.
 * Ported from /api/student/history so the parent and student views of the same
 * child's history agree on which year an item belongs to.
 */
function findEnrollmentContext(enrollments, school, date) {
  const empty = { year: "", yearStart: null, grade: "" };
  if (!date) return empty;

  const time = new Date(date).getTime();
  const schoolStr = String(school || "");

  const within = (entry) => {
    const start = entry.startedAt
      ? new Date(entry.startedAt).getTime()
      : -Infinity;
    const end = entry.endedAt ? new Date(entry.endedAt).getTime() : Infinity;
    return time >= start && time <= end;
  };

  // Prefer an enrolment at the SAME school — a date can fall inside two
  // windows when a transfer overlaps, and the school is the tie-breaker that
  // keeps attribution correct.
  const sameSchool = enrollments.find(
    (entry) => String(entry.school) === schoolStr && within(entry)
  );
  const match = sameSchool || enrollments.find(within);

  if (!match) return empty;
  return {
    year: match.academicYear || "",
    yearStart: match.academicYearStart ?? null,
    grade: match.grade || "",
  };
}

const PLACEMENT_ICONS = {
  WINNER: "🥇",
  RUNNER_UP: "🥈",
  THIRD_PLACE: "🥉",
  FINALIST: "🎖️",
  MERIT: "📚",
  SPECIAL_MENTION: "⭐",
  PARTICIPANT: "🎯",
};

const WRITING_ICONS = {
  RESEARCH: "🔬",
  POEM: "📖",
  CREATIVE_WRITING: "🎨",
  OPINION: "💭",
  BLOG_ARTICLE: "✍️",
};

function placementLabel(value) {
  return String(value || "Participant").replaceAll("_", " ");
}

/**
 * Build the full journey for one student.
 *
 * `studentId` MUST already be authorised by lib/parentAccess.js — this function
 * performs no permission checks of its own, by design: keeping authorisation in
 * exactly one place is what makes it auditable.
 */
export async function buildStudentJourney(studentId, options = {}) {
  const { includeCertificatesOnly = false } = options;

  await connectDB();

  const student = await Student.findOne({
    _id: studentId,
    isDeleted: { $ne: true },
  })
    .select("name grade school status enrollments platformStudentId")
    .lean();

  if (!student) return null;

  const enrollments = Array.isArray(student.enrollments)
    ? student.enrollments
    : [];

  // Resolve every school named anywhere in the history in ONE query, so a
  // six-school journey does not become six round trips on a 69ms link.
  const schoolIds = Array.from(
    new Set(
      [
        ...enrollments.map((entry) => String(entry.school)),
        String(student.school || ""),
      ].filter(Boolean)
    )
  );
  const schools = await User.find({ _id: { $in: schoolIds } })
    .select("schoolName name")
    .lean();
  const schoolById = new Map(
    schools.map((s) => [String(s._id), s.schoolName || s.name || "School"])
  );

  const schoolRef = (id, snapshot = "") => ({
    id: String(id || ""),
    name: snapshot || schoolById.get(String(id)) || "School",
  });

  const [achievementsRaw, writingsRaw, participationsRaw] = await Promise.all([
    Achievement.find({ student: student._id })
      .sort({ awardedAt: -1 })
      .select(
        "title description placement level awardedAt certificateUrl certificateCode certificateIssuedAt certificateState school event isPublic"
      )
      .populate("event", "title date eventScope eventType")
      .lean(),
    SchoolMagazineArticle.find({
      authorStudent: student._id,
      isDeleted: { $ne: true },
      // Only work the school has actually published or approved reaches a
      // parent. Drafts and rejected submissions are the child's private work.
      $or: [{ isPublished: true }, { status: "APPROVED" }],
    })
      .sort({ publishedAt: -1, updatedAt: -1 })
      // The article body can be long and there is no stored excerpt field, so
      // the preview is sliced server-side. Pulling full `content` for every
      // article just to show two lines would blow up the payload on a metered
      // connection (§22).
      .select({
        title: 1,
        category: 1,
        school: 1,
        publishedAt: 1,
        updatedAt: 1,
        status: 1,
        reviewedBy: 1,
        preview: { $substrCP: [{ $ifNull: ["$content", ""] }, 0, 160] },
      })
      .lean(),
    ParticipationRequest.find({
      student: student._id,
      status: { $in: ["APPROVED", "ENROLLED"] },
    })
      .sort({ createdAt: -1 })
      .select("event school status enrollmentConfirmedAt approvedAt createdAt")
      .populate("event", "title date eventScope eventType")
      .lean(),
  ]);

  const entries = [];

  // --- School milestones (§35: "school transfer → Journey milestone") ------
  // Sorted oldest-first so "Joined" precedes "Moved to" for the same school.
  const orderedEnrollments = [...enrollments].sort(
    (a, b) => new Date(a.startedAt || 0) - new Date(b.startedAt || 0)
  );

  orderedEnrollments.forEach((entry, index) => {
    const school = schoolRef(entry.school, entry.schoolNameSnapshot);

    entries.push({
      id: `milestone:${school.id}:${entry.academicYearStart ?? index}:start`,
      type: "MILESTONE",
      sourceModel: "Student.enrollments",
      sourceId: String(student._id),
      emoji: index === 0 ? "🏫" : "🔄",
      title: index === 0 ? `Joined ${school.name}` : `Moved to ${school.name}`,
      description: entry.grade ? `Started ${entry.grade}` : "",
      date: entry.startedAt || null,
      school,
      grade: entry.grade || "",
      academicYear: entry.academicYear || "",
      academicYearStart: entry.academicYearStart ?? null,
      certificate: null,
    });

    if (entry.status === "GRADUATED" && entry.endedAt) {
      entries.push({
        id: `milestone:${school.id}:${entry.academicYearStart ?? index}:graduated`,
        type: "MILESTONE",
        sourceModel: "Student.enrollments",
        sourceId: String(student._id),
        emoji: "🎓",
        title: `Graduated from ${school.name}`,
        description: entry.grade || "",
        date: entry.endedAt,
        school,
        grade: entry.grade || "",
        academicYear: entry.academicYear || "",
        academicYearStart: entry.academicYearStart ?? null,
        certificate: null,
      });
    }
  });

  // --- Achievements (certificate attached, NOT a second entry) -------------
  // §35 forbids duplicate entries. An achievement and its certificate are one
  // milestone in the child's life, so the certificate rides along on the
  // achievement entry; the "Certificates" filter selects entries that carry
  // one. Emitting both separately would show "Best Speaker" twice.
  const eventIdsWithAchievement = new Set();

  achievementsRaw.forEach((a) => {
    const date = a.awardedAt || a.event?.date || null;
    const ctx = findEnrollmentContext(enrollments, a.school, date);
    const hasCertificate = isActiveCertificateRecord(a);

    if (a.event?._id) eventIdsWithAchievement.add(String(a.event._id));

    entries.push({
      id: `achievement:${a._id}`,
      type: "ACHIEVEMENT",
      sourceModel: "Achievement",
      sourceId: String(a._id),
      emoji: PLACEMENT_ICONS[a.placement] || "🏆",
      title: a.title,
      description: a.description || "",
      placement: placementLabel(a.placement),
      level: a.level,
      eventTitle: a.event?.title || "",
      date,
      school: schoolRef(a.school),
      grade: ctx.grade,
      academicYear: ctx.year,
      academicYearStart: ctx.yearStart,
      certificate: hasCertificate
        ? {
            code: a.certificateCode || "",
            url: a.certificateUrl || "",
            issuedAt: a.certificateIssuedAt || null,
            // Printed certificates carry this host; see MEMORY.md on
            // NEXT_PUBLIC_SITE_URL being baked into the bundle.
            verifyPath: a.certificateCode
              ? `/verify?code=${encodeURIComponent(a.certificateCode)}`
              : "",
          }
        : null,
    });
  });

  // --- Writing & research --------------------------------------------------
  writingsRaw.forEach((w) => {
    const date = w.publishedAt || w.updatedAt || null;
    const ctx = findEnrollmentContext(enrollments, w.school, date);
    const category = normalizeWritingCategory(w.category);

    entries.push({
      id: `writing:${w._id}`,
      // RESEARCH is filterable separately from general writing (§5).
      type: category === "RESEARCH" ? "RESEARCH" : "WRITING",
      sourceModel: "SchoolMagazineArticle",
      sourceId: String(w._id),
      emoji: WRITING_ICONS[category] || "✍️",
      title: w.title,
      description: w.preview || "",
      category,
      teacherReviewed: Boolean(w.reviewedBy) || w.status === "APPROVED",
      date,
      school: schoolRef(w.school),
      grade: ctx.grade,
      academicYear: ctx.year,
      academicYearStart: ctx.yearStart,
      certificate: null,
    });
  });

  // --- Event participation -------------------------------------------------
  // Suppressed when the same event already produced an achievement: "took part
  // in the debate" and "won Best Speaker at the debate" are one milestone, and
  // showing both reads as a duplicate to a parent skimming the timeline.
  participationsRaw.forEach((p) => {
    const eventId = String(p.event?._id || "");
    if (!eventId || eventIdsWithAchievement.has(eventId)) return;

    const date = p.event?.date || p.enrollmentConfirmedAt || p.approvedAt || null;
    const ctx = findEnrollmentContext(enrollments, p.school, date);

    entries.push({
      id: `participation:${p._id}`,
      type: "EVENT",
      sourceModel: "ParticipationRequest",
      sourceId: String(p._id),
      eventId,
      emoji: "🎪",
      title: p.event?.title || "Event participation",
      // Event has no venue field on the schema, so participation entries carry
      // no location. Left blank rather than faked.
      description: "",
      date,
      school: schoolRef(p.school),
      grade: ctx.grade,
      academicYear: ctx.year,
      academicYearStart: ctx.yearStart,
      certificate: null,
    });
  });

  // Newest first. Undated entries sink rather than jumping to the top, which is
  // what a null date would otherwise do under a plain numeric sort.
  const sorted = entries
    .filter((entry) => (includeCertificatesOnly ? entry.certificate : true))
    .sort((a, b) => {
      const at = a.date ? new Date(a.date).getTime() : -Infinity;
      const bt = b.date ? new Date(b.date).getTime() : -Infinity;
      return bt - at;
    });

  return {
    student: {
      id: String(student._id),
      name: student.name,
      grade: student.grade || "",
      status: student.status,
      platformStudentId: student.platformStudentId || "",
    },
    schools: schoolIds.map((id) => schoolRef(id)),
    entries: sorted,
    counts: countByFilter(sorted),
  };
}

/** Does an entry belong to a given filter tab? */
export function matchesFilter(entry, filter) {
  if (!filter || filter === "ALL") return true;
  if (filter === "ACHIEVEMENTS") return entry.type === "ACHIEVEMENT";
  if (filter === "WRITING") return entry.type === "WRITING";
  if (filter === "RESEARCH") return entry.type === "RESEARCH";
  if (filter === "EVENTS") return entry.type === "EVENT";
  // A certificate is not its own entry type — it is an attachment on the
  // achievement that earned it. See the note above.
  if (filter === "CERTIFICATES") return Boolean(entry.certificate);
  return true;
}

export function countByFilter(entries) {
  return JOURNEY_FILTERS.reduce((acc, filter) => {
    acc[filter] = entries.filter((entry) => matchesFilter(entry, filter)).length;
    return acc;
  }, {});
}

/**
 * Group a timeline for display (§5: by year, grade, or school).
 *
 * Returns an ordered array of `{ key, label, subLabel, entries }` rather than an
 * object, because insertion order in a plain object is not a contract the UI
 * should rely on for numeric-looking keys.
 */
export function groupJourney(entries, groupBy = "YEAR") {
  const groups = new Map();

  entries.forEach((entry) => {
    let key;
    let label;
    let subLabel = "";

    if (groupBy === "SCHOOL") {
      key = entry.school?.id || "unknown";
      label = entry.school?.name || "School";
    } else if (groupBy === "GRADE") {
      key = entry.grade || "unknown";
      label = entry.grade || "Other";
      subLabel = entry.school?.name || "";
    } else {
      // YEAR. Fall back to the calendar year of the entry when it sits outside
      // any recorded enrolment window, so nothing lands in a nameless bucket.
      const fallbackYear = entry.date
        ? new Date(entry.date).getFullYear()
        : null;
      key = String(entry.academicYearStart ?? fallbackYear ?? "unknown");
      label = entry.academicYear || (fallbackYear ? String(fallbackYear) : "Earlier");
      // Showing the school under the year is what makes a transfer legible on
      // the timeline: "2025 Orbit" then "2026 Green Village" (§24).
      subLabel = entry.school?.name || "";
    }

    if (!groups.has(key)) {
      groups.set(key, { key, label, subLabel, entries: [] });
    }
    groups.get(key).entries.push(entry);
  });

  const ordered = Array.from(groups.values());

  if (groupBy === "YEAR") {
    return ordered.sort((a, b) => {
      const an = Number.parseInt(a.key, 10);
      const bn = Number.parseInt(b.key, 10);
      if (Number.isNaN(an)) return 1;
      if (Number.isNaN(bn)) return -1;
      return bn - an;
    });
  }

  // GRADE and SCHOOL keep timeline order — the groups come out newest-activity
  // first because `entries` arrived sorted.
  return ordered;
}
