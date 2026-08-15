import connectDB from "@/lib/db";
import UserNotification from "@/models/UserNotification";
import ParentStudentLink from "@/models/ParentStudentLink";
import Student from "@/models/Student";

/**
 * Parent notifications (§17).
 *
 * Two rules from the spec shape this module:
 *
 *  1. **Never send a meaningless "New Notification".** Every helper here
 *     requires a real title and message, and refuses to write a row without
 *     them. A notification that does not say what happened is noise a parent
 *     learns to ignore, which then costs them the one that mattered.
 *
 *  2. **Always deep-link.** `href` points at the exact screen — the notice, the
 *     event, the conversation — not at the app root.
 *
 * Fan-out respects each guardian's permissions: a guardian without
 * `canReceiveNotices` is not told about notices, and one without
 * `canViewPortfolio` is not told about achievements. This is how two guardians
 * of the same child can legitimately receive different things (§20).
 */

const PERMISSION_BY_CATEGORY = {
  NOTICE: "canReceiveNotices",
  CONSENT: "canGiveConsent",
  EVENT: "canRegisterEvents",
  MESSAGE: "canMessageSchool",
  ACHIEVEMENT: "canViewPortfolio",
  WRITING: "canViewPortfolio",
  TRANSFER: "canViewPortfolio",
  GENERAL: null,
};

/**
 * Notify every eligible guardian of a student.
 *
 * Deliberately fire-and-forget at the call site: like emails elsewhere in this
 * codebase, a notification failure must never fail the action that triggered it
 * (see the emailService contract in MEMORY.md). Callers should not await this
 * inside a request they care about completing.
 */
export async function notifyGuardians({
  studentId,
  category,
  priority = "INFO",
  title,
  message,
  href = "",
  metadata = {},
  excludeParentId = null,
}) {
  const cleanTitle = String(title || "").trim();
  const cleanMessage = String(message || "").trim();

  // Guard rail for rule 1 above.
  if (!cleanTitle || !cleanMessage) {
    console.warn(
      "[parentNotifications] refused to send a notification without title/message",
      { studentId, category }
    );
    return { sent: 0 };
  }

  await connectDB();

  const student = await Student.findById(studentId)
    .select("name school")
    .lean();
  if (!student) return { sent: 0 };

  const requiredPermission = PERMISSION_BY_CATEGORY[category] ?? null;

  const linkQuery = {
    student: studentId,
    status: "ACTIVE",
  };
  if (requiredPermission) linkQuery[requiredPermission] = true;
  if (excludeParentId) linkQuery.parent = { $ne: excludeParentId };

  const links = await ParentStudentLink.find(linkQuery)
    .select("parent")
    .lean();

  if (links.length === 0) return { sent: 0 };

  await UserNotification.insertMany(
    links.map((link) => ({
      targetRole: "PARENT",
      recipientParent: link.parent,
      // The child the notification is ABOUT — lets the app label every row
      // "Aayush • Green Village" and filter by selected child (§36).
      recipientStudent: studentId,
      school: student.school,
      category,
      priority,
      title: cleanTitle,
      message: cleanMessage,
      href,
      metadata,
    })),
    { ordered: false }
  );

  return { sent: links.length };
}

/**
 * The parent's notification inbox.
 *
 * `studentId` narrows to the selected child. Omitting it returns the combined
 * inbox, which is legitimate — §36 permits global parent notifications provided
 * each row identifies the child and school, which `recipientStudent` and
 * `school` do.
 */
export async function listParentNotifications({
  parentId,
  studentId = null,
  page = 1,
  limit = 20,
}) {
  await connectDB();

  const query = {
    recipientParent: parentId,
    isDeleted: { $ne: true },
  };
  if (studentId) query.recipientStudent = studentId;

  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    UserNotification.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("recipientStudent", "name")
      .populate("school", "schoolName name")
      .lean(),
    UserNotification.countDocuments(query),
  ]);

  return {
    notifications: rows.map((row) => ({
      id: String(row._id),
      category: row.category,
      priority: row.priority || "INFO",
      title: row.title,
      message: row.message,
      href: row.href || "",
      publishedAt: row.publishedAt,
      // Child + school on every row, so a combined inbox is never ambiguous.
      child: row.recipientStudent
        ? {
            id: String(row.recipientStudent._id),
            name: row.recipientStudent.name,
          }
        : null,
      school: row.school
        ? {
            id: String(row.school._id),
            name: row.school.schoolName || row.school.name || "School",
          }
        : null,
      read: (row.readBy || []).some(
        (entry) => String(entry.user) === String(parentId)
      ),
    })),
    total,
    page,
    limit,
  };
}

/** Mark one or all notifications read for this guardian. */
export async function markParentNotificationsRead({
  parentId,
  notificationId = null,
}) {
  await connectDB();

  const query = {
    recipientParent: parentId,
    isDeleted: { $ne: true },
    // $ne on the nested path avoids pushing a duplicate read entry.
    "readBy.user": { $ne: parentId },
  };
  if (notificationId) query._id = notificationId;

  const result = await UserNotification.updateMany(query, {
    $push: {
      readBy: { user: parentId, userType: "PARENT", readAt: new Date() },
    },
  });

  return { updated: result.modifiedCount || 0 };
}

export async function countUnreadParentNotifications({ parentId, studentId = null }) {
  await connectDB();

  const query = {
    recipientParent: parentId,
    isDeleted: { $ne: true },
    "readBy.user": { $ne: parentId },
  };
  if (studentId) query.recipientStudent = studentId;

  return UserNotification.countDocuments(query);
}
