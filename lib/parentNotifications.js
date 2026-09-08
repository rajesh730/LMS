import mongoose from "mongoose";
import connectDB from "@/lib/db";
import UserNotification, {
  USER_NOTIFICATION_STATUSES,
  USER_NOTIFICATION_TYPES,
} from "@/models/UserNotification";
import ParentStudentLink from "@/models/ParentStudentLink";
import Parent from "@/models/Parent";
import Student from "@/models/Student";
import "@/models/User";
import { sendPushNotifications } from "@/lib/webPush";
import { publishRealtimeEvent } from "@/lib/realtimeBus";
import {
  NOTIFICATION_EVENTS,
  parentNotificationsChannel,
} from "@/lib/notificationChannels";

/**
 * Durable parent notifications.
 *
 * The database row is authoritative. Realtime and Web Push are delivery
 * signals sent only after that row exists, so a transport failure cannot
 * invent or lose notification state.
 */

const VALID_TYPES = new Set(USER_NOTIFICATION_TYPES);
const VALID_STATUSES = new Set(USER_NOTIFICATION_STATUSES);

const PERMISSION_BY_TYPE = {
  NOTICE: "canReceiveNotices",
  CONSENT: "canGiveConsent",
  EVENT: "canRegisterEvents",
  MESSAGE: "canMessageSchool",
  ACHIEVEMENT: "canViewPortfolio",
  RESULT: "canViewPortfolio",
  WRITING: "canViewPortfolio",
  TRANSFER: "canViewPortfolio",
  ATTENDANCE: "canViewPortfolio",
  HOMEWORK: "canViewPortfolio",
  PAYMENT: null,
  GENERAL: null,
  MAGAZINE: "canViewPortfolio",
};

function pairKey(parentId, studentId) {
  return `${String(parentId)}:${String(studentId)}`;
}

function normalizeType(value) {
  const type = String(value || "GENERAL").trim().toUpperCase();
  return VALID_TYPES.has(type) ? type : "GENERAL";
}

export function normalizeNotificationActionUrl(value) {
  const path = String(value || "").trim();
  // Only same-origin app paths may reach the browser or service worker.
  // `//evil.example` is an absolute URL despite starting with a slash.
  if (!path.startsWith("/") || path.startsWith("//")) {
    return "/parent/notifications";
  }
  return path.slice(0, 300);
}

function duplicateKeysOnly(error) {
  if (error?.code === 11000) return true;
  return (
    Array.isArray(error?.writeErrors) &&
    error.writeErrors.length > 0 &&
    error.writeErrors.every((item) => item?.code === 11000)
  );
}

function publishQuietly(parentId, payload) {
  try {
    publishRealtimeEvent(parentNotificationsChannel(parentId), payload);
  } catch (error) {
    console.error("[parentNotifications] realtime publish failed:", error.message);
  }
}

/**
 * Create notifications for an already-resolved audience.
 *
 * Callers pass ids obtained from trusted server records. This function still
 * revalidates each active parent/student link and derives school from Student,
 * keeping a caller mistake from crossing family or school boundaries.
 */
export async function createParentNotificationsForTargets({
  targets = [],
  type,
  category,
  priority = "INFO",
  title,
  body,
  message,
  actionUrl,
  href,
  entityId = "",
  metadata = {},
  dedupeKey = "",
  enforceCategoryPermission = true,
}) {
  const notificationType = normalizeType(type || category);
  const cleanTitle = String(title || "").trim().slice(0, 180);
  const cleanBody = String(body || message || "").trim().slice(0, 1000);

  if (!cleanTitle || !cleanBody || !Array.isArray(targets) || targets.length === 0) {
    return { sent: 0, notificationIds: [] };
  }

  const normalizedTargets = targets
    .map((target) => ({
      ...target,
      parentId: String(target?.parentId || "").trim(),
      studentId: String(target?.studentId || "").trim(),
    }))
    .filter((target) => target.parentId && target.studentId);

  if (normalizedTargets.length === 0) {
    return { sent: 0, notificationIds: [] };
  }

  await connectDB();

  const parentIds = Array.from(
    new Set(normalizedTargets.map((target) => target.parentId))
  );
  const studentIds = Array.from(
    new Set(normalizedTargets.map((target) => target.studentId))
  );

  const [parents, students, links] = await Promise.all([
    Parent.find({
      _id: { $in: parentIds },
      status: "ACTIVE",
      accessState: "ACTIVATED",
      isDeleted: { $ne: true },
    })
      .select("_id authVersion")
      .lean(),
    Student.find({
      _id: { $in: studentIds },
      isDeleted: { $ne: true },
    })
      .select("_id school")
      .lean(),
    ParentStudentLink.find({
      parent: { $in: parentIds },
      student: { $in: studentIds },
      status: "ACTIVE",
    })
      .select(
        "parent student canReceiveNotices canGiveConsent canRegisterEvents canMessageSchool canViewPortfolio"
      )
      .lean(),
  ]);

  const parentById = new Map(parents.map((parent) => [String(parent._id), parent]));
  const studentById = new Map(
    students.map((student) => [String(student._id), student])
  );
  const linkByPair = new Map(
    links.map((link) => [pairKey(link.parent, link.student), link])
  );
  const requiredPermission = PERMISSION_BY_TYPE[notificationType] || null;
  const now = new Date();

  const documents = normalizedTargets.flatMap((target) => {
    const parent = parentById.get(target.parentId);
    const student = studentById.get(target.studentId);
    const link = linkByPair.get(pairKey(target.parentId, target.studentId));

    if (!parent || !student || !link) return [];
    if (
      requiredPermission &&
      enforceCategoryPermission &&
      link[requiredPermission] !== true
    ) {
      return [];
    }

    const targetEntityId = String(target.entityId || entityId || "")
      .trim()
      .slice(0, 100);
    const targetActionUrl = normalizeNotificationActionUrl(
      target.actionUrl || target.href || actionUrl || href
    );
    const sourceKey = String(target.dedupeKey || dedupeKey || "").trim();
    const stableSourceKey =
      sourceKey || (targetEntityId ? `${notificationType}:${targetEntityId}` : "");

    return [
      {
        _id: new mongoose.Types.ObjectId(),
        targetRole: "PARENT",
        recipientParent: parent._id,
        recipientStudent: student._id,
        school: student.school,
        category: notificationType,
        type: notificationType,
        priority,
        title: cleanTitle,
        message: cleanBody,
        body: cleanBody,
        href: targetActionUrl,
        actionUrl: targetActionUrl,
        entityId: targetEntityId,
        status: "UNREAD",
        seenAt: null,
        readAt: null,
        metadata: { ...metadata, ...(target.metadata || {}) },
        publishedAt: now,
        ...(stableSourceKey
          ? {
              dedupeKey: `${stableSourceKey}:PARENT:${target.parentId}:${target.studentId}`.slice(
                0,
                300
              ),
            }
          : {}),
      },
    ];
  });

  if (documents.length === 0) {
    return { sent: 0, notificationIds: [] };
  }

  const operations = documents.map((document) => ({
    updateOne: {
      filter: document.dedupeKey
        ? { dedupeKey: document.dedupeKey }
        : { _id: document._id },
      update: { $setOnInsert: document },
      upsert: true,
    },
  }));

  try {
    await UserNotification.bulkWrite(operations, { ordered: false });
  } catch (error) {
    // A concurrent retry may win a unique dedupe key. Other writes in this
    // unordered batch still succeed; only non-duplicate errors are fatal.
    if (!duplicateKeysOnly(error)) throw error;
  }

  // Generated ids exist only for rows this call inserted. A deduplicated row
  // keeps its earlier id, so it is not pushed or sounded a second time.
  const created = await UserNotification.find({
    _id: { $in: documents.map((document) => document._id) },
  })
    .select(
      "_id recipientParent recipientStudent type category title body message actionUrl href priority createdAt publishedAt"
    )
    .lean();

  created.forEach((notification) => {
    publishQuietly(notification.recipientParent, {
      type: NOTIFICATION_EVENTS.NEW,
      notificationId: String(notification._id),
      notificationType: notification.type || notification.category,
      createdAt: notification.createdAt || notification.publishedAt || now,
    });
  });

  await sendPushNotifications(
    created.map((notification) => ({
      parentId: notification.recipientParent,
      notificationId: notification._id,
      title: notification.title,
      body: notification.body || notification.message,
      href: notification.actionUrl || notification.href,
      createdAt: notification.createdAt || notification.publishedAt || now,
      urgent:
        notification.priority === "URGENT" || notification.priority === "ACTION",
    }))
  );

  return {
    sent: created.length,
    notificationIds: created.map((notification) => String(notification._id)),
  };
}

/** Notify every eligible guardian of one student. */
export async function notifyGuardians({
  studentId,
  category,
  type,
  priority = "INFO",
  title,
  message,
  body,
  href = "",
  actionUrl = "",
  entityId = "",
  metadata = {},
  dedupeKey = "",
  excludeParentId = null,
  includeParentIds = null,
  enforceCategoryPermission = true,
}) {
  await connectDB();

  const notificationType = normalizeType(type || category);
  const requiredPermission = PERMISSION_BY_TYPE[notificationType] || null;
  const linkQuery = { student: studentId, status: "ACTIVE" };

  if (requiredPermission && enforceCategoryPermission) {
    linkQuery[requiredPermission] = true;
  }

  const includedParents = Array.from(
    new Set((includeParentIds || []).filter(Boolean).map(String))
  );
  if (includedParents.length > 0) linkQuery.parent = { $in: includedParents };
  if (excludeParentId) {
    linkQuery.parent = { ...(linkQuery.parent || {}), $ne: excludeParentId };
  }

  const links = await ParentStudentLink.find(linkQuery).select("parent").lean();

  return createParentNotificationsForTargets({
    targets: links.map((link) => ({ parentId: link.parent, studentId })),
    type: notificationType,
    priority,
    title,
    body: body || message,
    actionUrl: actionUrl || href,
    entityId,
    metadata,
    dedupeKey,
    enforceCategoryPermission,
  });
}

async function authorizedStudentIds(parentId) {
  const links = await ParentStudentLink.find({
    parent: parentId,
    status: "ACTIVE",
  })
    .select("student")
    .lean();
  return links.map((link) => link.student).filter(Boolean);
}

function authorizedNotificationQuery(parentId, studentIds) {
  return {
    recipientParent: parentId,
    isDeleted: { $ne: true },
    $or: [
      { recipientStudent: { $in: studentIds } },
      // Reserved for account-wide alerts that are not about one child.
      { recipientStudent: null },
    ],
  };
}

function unreadCondition(parentId) {
  return {
    $or: [
      { status: "UNREAD" },
      {
        status: { $exists: false },
        "readBy.user": { $ne: parentId },
      },
    ],
  };
}

function statusForRow(row, parentId) {
  if (
    row.readAt ||
    (row.readBy || []).some((entry) => String(entry.user) === String(parentId))
  ) {
    return "READ";
  }
  return VALID_STATUSES.has(row.status) ? row.status : "UNREAD";
}

function serializeParentNotification(row, parentId) {
  const status = statusForRow(row, parentId);
  const type = normalizeType(row.type || row.category);
  const body = row.body || row.message || "";
  const actionUrl = normalizeNotificationActionUrl(row.actionUrl || row.href);
  const createdAt = row.createdAt || row.publishedAt;

  return {
    id: String(row._id),
    schoolId: row.school?._id ? String(row.school._id) : String(row.school || ""),
    type,
    title: row.title,
    body,
    entityId: row.entityId || "",
    actionUrl,
    status,
    seenAt: row.seenAt || null,
    readAt: row.readAt || null,
    createdAt,
    priority: row.priority || "INFO",
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
    // Compatibility for callers using the previous parent inbox shape.
    category: type,
    message: body,
    href: actionUrl,
    publishedAt: createdAt,
    read: status === "READ",
    isRead: status === "READ",
  };
}

export async function listParentNotifications({ parentId, page = 1, limit = 20 }) {
  await connectDB();

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const studentIds = await authorizedStudentIds(parentId);
  const baseQuery = authorizedNotificationQuery(parentId, studentIds);
  const skip = (safePage - 1) * safeLimit;

  const [rows, total, unreadCount] = await Promise.all([
    UserNotification.find(baseQuery)
      .sort({ createdAt: -1, publishedAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("recipientStudent", "name")
      .populate("school", "schoolName name")
      .lean(),
    UserNotification.countDocuments(baseQuery),
    UserNotification.countDocuments({
      $and: [baseQuery, unreadCondition(parentId)],
    }),
  ]);

  return {
    notifications: rows.map((row) => serializeParentNotification(row, parentId)),
    unreadCount,
    total,
    page: safePage,
    limit: safeLimit,
    hasMore: skip + rows.length < total,
  };
}

export async function countUnreadParentNotifications({ parentId }) {
  await connectDB();
  const studentIds = await authorizedStudentIds(parentId);
  const baseQuery = authorizedNotificationQuery(parentId, studentIds);
  return UserNotification.countDocuments({
    $and: [baseQuery, unreadCondition(parentId)],
  });
}

export async function markParentNotificationsSeen({ parentId }) {
  await connectDB();
  const studentIds = await authorizedStudentIds(parentId);
  const baseQuery = authorizedNotificationQuery(parentId, studentIds);
  const seenAt = new Date();
  const result = await UserNotification.updateMany(
    { $and: [baseQuery, unreadCondition(parentId)] },
    { $set: { status: "SEEN", seenAt } }
  );

  if (result.modifiedCount) {
    publishQuietly(parentId, {
      type: NOTIFICATION_EVENTS.STATE_CHANGED,
      status: "SEEN",
      changedCount: result.modifiedCount,
    });
  }

  return { updated: result.modifiedCount || 0, seenAt };
}

export async function markParentNotificationRead({ parentId, notificationId }) {
  await connectDB();
  if (!mongoose.isValidObjectId(notificationId)) {
    return { found: false, updated: 0 };
  }

  const studentIds = await authorizedStudentIds(parentId);
  const baseQuery = authorizedNotificationQuery(parentId, studentIds);
  const existing = await UserNotification.findOne({
    ...baseQuery,
    _id: notificationId,
  })
    .select("seenAt readAt")
    .lean();

  if (!existing) return { found: false, updated: 0 };

  const now = new Date();
  const result = await UserNotification.updateOne(
    { _id: existing._id, recipientParent: parentId },
    {
      $set: {
        status: "READ",
        seenAt: existing.seenAt || now,
        readAt: existing.readAt || now,
      },
    }
  );

  if (result.modifiedCount) {
    publishQuietly(parentId, {
      type: NOTIFICATION_EVENTS.STATE_CHANGED,
      status: "READ",
      notificationId: String(existing._id),
    });
  }

  return {
    found: true,
    updated: result.modifiedCount || 0,
    readAt: existing.readAt || now,
  };
}

export async function markAllParentNotificationsRead({ parentId }) {
  await connectDB();
  const studentIds = await authorizedStudentIds(parentId);
  const baseQuery = authorizedNotificationQuery(parentId, studentIds);
  const now = new Date();
  const notRead = {
    $or: [
      { status: { $in: ["UNREAD", "SEEN"] } },
      {
        status: { $exists: false },
        "readBy.user": { $ne: parentId },
      },
    ],
  };
  const result = await UserNotification.updateMany(
    { $and: [baseQuery, notRead] },
    [
      {
        $set: {
          status: "READ",
          seenAt: { $ifNull: ["$seenAt", now] },
          readAt: { $ifNull: ["$readAt", now] },
        },
      },
    ]
  );

  if (result.modifiedCount) {
    publishQuietly(parentId, {
      type: NOTIFICATION_EVENTS.STATE_CHANGED,
      status: "READ",
      changedCount: result.modifiedCount,
    });
  }

  return { updated: result.modifiedCount || 0, readAt: now };
}

/** Backward-compatible entry point for the previous parent API route. */
export async function markParentNotificationsRead({
  parentId,
  notificationId = null,
}) {
  return notificationId
    ? markParentNotificationRead({ parentId, notificationId })
    : markAllParentNotificationsRead({ parentId });
}
