import connectDB from "@/lib/db";
import Notice from "@/models/Notice";
import NoticeReceipt from "@/models/NoticeReceipt";
import ParentStudentLink from "@/models/ParentStudentLink";
import Parent from "@/models/Parent";
import { getEquivalentGradeValues } from "@/lib/schoolGrades";
import { noticeStatus } from "@/lib/parentStatus";

/**
 * Parent Notice Centre logic (§11).
 *
 * The rule this module exists to protect:
 *
 *     LISTING A NOTICE MUST NEVER MARK IT READ.
 *
 * `buildNoticeQuery` + `listNoticesForStudent` only ever WRITE a receipt with
 * `deliveredAt`. `openedAt` is written by exactly one function,
 * `markNoticeOpened`, which is called from exactly one place: the notice DETAIL
 * route, after the detail has been successfully returned. Nothing else in the
 * codebase should ever set that field.
 *
 * Read state is per (guardian × child × notice), not per notice — so a mother
 * opening Aayush's meeting notice leaves the father's row untouched, and
 * leaves Aarya's copy of the same notice untouched too.
 */

/**
 * Which notices reach this child?
 *
 * Grade matching goes through getEquivalentGradeValues because grade data is
 * messy — "9", "Grade 9" and "Class 9" all occur in production (see MEMORY.md),
 * so an exact string match would silently hide notices from whole cohorts.
 */
export function buildNoticeQuery(student) {
  const gradeValues = getEquivalentGradeValues(student.grade);

  return {
    isDeleted: { $ne: true },
    isActive: true,
    status: "PUBLISHED",
    "targetAudience.parents": true,
    // Platform-wide notices carry school: null and reach everyone.
    $and: [
      {
        $or: [
          { school: student.school },
          { scope: "PLATFORM", school: null },
        ],
      },
      {
        // Empty grades means "all grades".
        $or: [
          { grades: { $size: 0 } },
          { grades: { $exists: false } },
          { grades: { $in: gradeValues } },
        ],
      },
      {
        // Empty targetStudents means "everyone matching school + grade".
        $or: [
          { targetStudents: { $size: 0 } },
          { targetStudents: { $exists: false } },
          { targetStudents: student._id },
        ],
      },
      {
        // Expired notices drop off the parent's list.
        $or: [
          { expiryDate: null },
          { expiryDate: { $exists: false } },
          { expiryDate: { $gt: new Date() } },
        ],
      },
    ],
  };
}

/**
 * List notices for one child with this guardian's receipt state attached.
 *
 * Delivery receipts are upserted here (that is what makes "delivered" true and
 * gives the school a denominator for read rates), but `openedAt` is left alone.
 */
export async function listNoticesForStudent({
  parentId,
  student,
  page = 1,
  limit = 20,
}) {
  await connectDB();

  const query = buildNoticeQuery(student);
  const skip = (page - 1) * limit;

  const [notices, total] = await Promise.all([
    Notice.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "title content type priority school scope publishedAt expiryDate requiresAcknowledgement requiresConsent actionDeadline attachments event"
      )
      .lean(),
    Notice.countDocuments(query),
  ]);

  if (notices.length === 0) {
    return { notices: [], total, page, limit };
  }

  const noticeIds = notices.map((notice) => notice._id);

  // Record delivery for anything this guardian has not seen a row for yet.
  // `$setOnInsert` is what keeps this idempotent: re-listing does not reset
  // deliveredAt, and — critically — cannot touch openedAt.
  await NoticeReceipt.bulkWrite(
    notices.map((notice) => ({
      updateOne: {
        filter: {
          notice: notice._id,
          parent: parentId,
          student: student._id,
        },
        update: {
          $setOnInsert: {
            notice: notice._id,
            parent: parentId,
            student: student._id,
            school: student.school,
            deliveredAt: new Date(),
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const receipts = await NoticeReceipt.find({
    notice: { $in: noticeIds },
    parent: parentId,
    student: student._id,
  }).lean();

  const receiptByNotice = new Map(
    receipts.map((receipt) => [String(receipt.notice), receipt])
  );

  return {
    notices: notices.map((notice) =>
      decorateNotice(notice, receiptByNotice.get(String(notice._id)))
    ),
    total,
    page,
    limit,
  };
}

/**
 * Shape a notice for the parent UI, with its status triple resolved server-side
 * so the client never has to re-derive urgency (and cannot get it wrong).
 */
export function decorateNotice(notice, receipt) {
  const status = noticeStatus(notice, receipt);

  return {
    id: String(notice._id),
    title: notice.title,
    // The list gets a preview only; the full body comes from the detail route.
    // Keeps the list payload small on a metered connection (§22).
    preview: String(notice.content || "").slice(0, 160),
    type: notice.type,
    priority: notice.priority,
    publishedAt: notice.publishedAt,
    expiryDate: notice.expiryDate || null,
    actionDeadline: notice.actionDeadline || null,
    requiresAcknowledgement: Boolean(notice.requiresAcknowledgement),
    requiresConsent: Boolean(notice.requiresConsent),
    attachmentCount: Array.isArray(notice.attachments)
      ? notice.attachments.length
      : 0,
    eventId: notice.event ? String(notice.event) : null,
    status: status.key,
    receipt: receipt
      ? {
          deliveredAt: receipt.deliveredAt,
          openedAt: receipt.openedAt,
          acknowledgedAt: receipt.acknowledgedAt,
          consentDecision: receipt.consentDecision,
          consentDecidedAt: receipt.consentDecidedAt,
        }
      : null,
  };
}

/**
 * Split a decorated list into the three sections the Notice Centre renders:
 * 🔴 Action Required, 🟡 Unread, 🟢 Read (§11).
 */
export function sectionNotices(notices) {
  return {
    actionRequired: notices.filter((n) => n.status === "ACTION_REQUIRED"),
    unread: notices.filter((n) => n.status === "NEEDS_ATTENTION"),
    read: notices.filter((n) => n.status === "COMPLETE"),
  };
}

/**
 * THE ONLY function permitted to set `openedAt` (§11).
 *
 * Call it from the notice detail route, after the detail has been assembled
 * successfully — never optimistically, and never from a list endpoint. The
 * `openedAt: null` filter makes the first open authoritative, so a re-read does
 * not overwrite the original timestamp.
 */
export async function markNoticeOpened({ noticeId, parentId, student }) {
  await connectDB();

  const now = new Date();

  // Two steps, because openedAt cannot appear in both $setOnInsert and $set of
  // a single update (Mongo rejects the conflicting path).
  //
  // 1. Create the row if this is the parent's first contact with the notice,
  //    stamping deliveredAt and openedAt together.
  await NoticeReceipt.updateOne(
    { notice: noticeId, parent: parentId, student: student._id },
    {
      $setOnInsert: {
        notice: noticeId,
        parent: parentId,
        student: student._id,
        school: student.school,
        deliveredAt: now,
        openedAt: now,
      },
    },
    { upsert: true }
  );

  // 2. If the row already existed from delivery but has never been opened,
  //    stamp it now. The `openedAt: null` filter is what preserves the FIRST
  //    open: revisiting the notice later matches nothing and changes nothing,
  //    so the school's "how quickly did guardians see this?" signal survives.
  await NoticeReceipt.updateOne(
    {
      notice: noticeId,
      parent: parentId,
      student: student._id,
      openedAt: null,
    },
    { $set: { openedAt: now } }
  );

  return NoticeReceipt.findOne({
    notice: noticeId,
    parent: parentId,
    student: student._id,
  }).lean();
}

/** Record an "I Understand" acknowledgement. Idempotent — first press wins. */
export async function recordAcknowledgement({ noticeId, parentId, student }) {
  await connectDB();

  await NoticeReceipt.updateOne(
    {
      notice: noticeId,
      parent: parentId,
      student: student._id,
      acknowledgedAt: null,
    },
    { $set: { acknowledgedAt: new Date() } }
  );

  return NoticeReceipt.findOne({
    notice: noticeId,
    parent: parentId,
    student: student._id,
  }).lean();
}

/**
 * Record a YES/NO consent decision (§11).
 *
 * The guardian's name and relationship are snapshotted onto the receipt. A
 * consent record has to stay interpretable years later, after the link may have
 * been revoked or the relationship corrected — "the mother consented on
 * 15 Aug" must not decay into "someone consented".
 *
 * Permission to reach this function (`canGiveConsent`) is checked by the route
 * via lib/parentAccess.js, not here.
 */
export async function recordConsent({
  noticeId,
  parentId,
  student,
  decision,
  link,
  parent,
}) {
  await connectDB();

  const normalized = String(decision || "").toUpperCase();
  if (!["YES", "NO"].includes(normalized)) {
    throw new Error("Consent decision must be YES or NO");
  }

  const now = new Date();

  await NoticeReceipt.updateOne(
    { notice: noticeId, parent: parentId, student: student._id },
    {
      $setOnInsert: {
        notice: noticeId,
        parent: parentId,
        student: student._id,
        school: student.school,
        deliveredAt: now,
        // Answering a consent question necessarily means the parent read it.
        openedAt: now,
      },
      $set: {
        consentDecision: normalized,
        consentDecidedAt: now,
        consentGuardianName: parent?.name || "",
        consentRelationship: link?.relationshipType || "",
      },
    },
    { upsert: true }
  );

  // Same first-open-wins rule as markNoticeOpened: only stamp a row that was
  // delivered but never opened. Consenting must not rewrite an earlier read.
  await NoticeReceipt.updateOne(
    {
      notice: noticeId,
      parent: parentId,
      student: student._id,
      openedAt: null,
    },
    { $set: { openedAt: now } }
  );

  return NoticeReceipt.findOne({
    notice: noticeId,
    parent: parentId,
    student: student._id,
  }).lean();
}

/**
 * Per-guardian read state for one notice + child (§11's "Mother: ✓ Read /
 * Father: ○ Not read").
 *
 * Deliberately returns only name, relationship, and read/consent state. It must
 * NOT leak another guardian's contact details, message history, or anything
 * else about them (§19) — a separated parent can see THAT the other guardian
 * has read a notice, not who they are beyond their role.
 */
export async function getGuardianReadStates({ noticeId, studentId }) {
  await connectDB();

  const links = await ParentStudentLink.find({
    student: studentId,
    status: "ACTIVE",
    canReceiveNotices: true,
  })
    .select("parent relationshipType isPrimaryGuardian")
    .lean();

  if (links.length === 0) return [];

  const parentIds = links.map((link) => link.parent);

  const [parents, receipts] = await Promise.all([
    Parent.find({ _id: { $in: parentIds } })
      .select("name")
      .lean(),
    NoticeReceipt.find({
      notice: noticeId,
      student: studentId,
      parent: { $in: parentIds },
    })
      .select("parent openedAt acknowledgedAt consentDecision consentDecidedAt")
      .lean(),
  ]);

  const nameById = new Map(parents.map((p) => [String(p._id), p.name]));
  const receiptByParent = new Map(
    receipts.map((r) => [String(r.parent), r])
  );

  return links.map((link) => {
    const receipt = receiptByParent.get(String(link.parent));
    return {
      name: nameById.get(String(link.parent)) || "Guardian",
      relationshipType: link.relationshipType,
      isPrimaryGuardian: Boolean(link.isPrimaryGuardian),
      openedAt: receipt?.openedAt || null,
      acknowledgedAt: receipt?.acknowledgedAt || null,
      consentDecision: receipt?.consentDecision || "PENDING",
      consentDecidedAt: receipt?.consentDecidedAt || null,
    };
  });
}

/**
 * Count what needs the parent's attention for one child. Feeds the Home screen
 * and the bottom-nav badge without pulling the notices themselves.
 */
export async function countOutstandingNotices({ parentId, student }) {
  await connectDB();

  const notices = await Notice.find(buildNoticeQuery(student))
    .select("requiresAcknowledgement requiresConsent priority type")
    .lean();

  if (notices.length === 0) {
    return { actionRequired: 0, unread: 0 };
  }

  const receipts = await NoticeReceipt.find({
    notice: { $in: notices.map((n) => n._id) },
    parent: parentId,
    student: student._id,
  })
    .select("notice openedAt acknowledgedAt consentDecision")
    .lean();

  const receiptByNotice = new Map(
    receipts.map((r) => [String(r.notice), r])
  );

  let actionRequired = 0;
  let unread = 0;

  notices.forEach((notice) => {
    const status = noticeStatus(notice, receiptByNotice.get(String(notice._id)));
    if (status.key === "ACTION_REQUIRED") actionRequired += 1;
    else if (status.key === "NEEDS_ATTENTION") unread += 1;
  });

  return { actionRequired, unread };
}
