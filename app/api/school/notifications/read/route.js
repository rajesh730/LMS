import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Notice from "@/models/Notice";
import EventNotice from "@/models/EventNotice";
import UserNotification from "@/models/UserNotification";
import { getSchoolNotificationPayload } from "@/lib/schoolNotifications";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";

function normalizeNotifications(body) {
  return Array.isArray(body?.notifications)
    ? body.notifications
        .map((item) => ({
          id: String(item?.id || "").trim(),
          noticeType: String(item?.noticeType || "").trim().toUpperCase(),
          storageType: String(item?.storageType || "").trim().toUpperCase(),
        }))
        .filter((item) => item.id && item.noticeType)
    : [];
}

function normalizeAction(body) {
  return String(body?.action || "read").trim().toLowerCase() === "unread"
    ? "unread"
    : "read";
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json().catch(() => ({}));
    const action = normalizeAction(body);
    const requestedNotifications = normalizeNotifications(body);

    const visible = await getSchoolNotificationPayload(session, 100);
    const baseNotifications =
      requestedNotifications.length > 0
        ? requestedNotifications
        : body?.allVisible
          ? visible.notifications.map((item) => ({
              id: String(item.id),
              noticeType: String(item.noticeType).toUpperCase(),
              storageType: String(item.storageType || "").toUpperCase(),
            }))
          : [];
    const visibleKeys = new Set(
      visible.notifications.map(
        (item) => `${String(item.noticeType).toUpperCase()}:${String(item.id)}`
      )
    );
    const allowedNotifications = baseNotifications.filter((item) =>
      visibleKeys.has(`${item.noticeType}:${item.id}`)
    ).map((item) => {
      const visibleNotification = visible.notifications.find(
        (notification) =>
          String(notification.noticeType).toUpperCase() === item.noticeType &&
          String(notification.id) === item.id
      );
      return {
        ...item,
        storageType:
          item.storageType ||
          String(visibleNotification?.storageType || "").toUpperCase(),
      };
    });

    if (allowedNotifications.length === 0) {
      return NextResponse.json({
        markedCount: 0,
        unreadCount: visible.unreadCount,
      });
    }

    const platformNoticeIds = allowedNotifications
      .filter((item) => item.noticeType === "GENERAL")
      .map((item) => item.id);
    const eventNoticeIds = allowedNotifications
      .filter((item) => item.noticeType === "EVENT")
      .map((item) => item.id);
    const userNotificationIds = allowedNotifications
      .filter((item) => item.storageType === "USER_NOTIFICATION")
      .map((item) => item.id);

    const [platformResult, eventResult, userNotificationResult] = await Promise.all([
      platformNoticeIds.length > 0
        ? action === "read"
          ? Notice.updateMany(
              {
                _id: { $in: platformNoticeIds },
                "readBy.user": { $ne: session.user.id },
              },
              {
                $push: {
                  readBy: {
                    user: session.user.id,
                    userType: "SCHOOL_ADMIN",
                    readAt: new Date(),
                  },
                },
              }
            )
          : Notice.updateMany(
              { _id: { $in: platformNoticeIds } },
              {
                $pull: {
                  readBy: {
                    user: session.user.id,
                    userType: "SCHOOL_ADMIN",
                  },
                },
              }
            )
        : { modifiedCount: 0 },
      eventNoticeIds.length > 0
        ? action === "read"
          ? EventNotice.updateMany(
              {
                _id: { $in: eventNoticeIds },
                "readBy.user": { $ne: session.user.id },
              },
              {
                $push: {
                  readBy: {
                    user: session.user.id,
                    userType: "SCHOOL_ADMIN",
                    readAt: new Date(),
                  },
                },
              }
            )
          : EventNotice.updateMany(
              { _id: { $in: eventNoticeIds } },
              {
                $pull: {
                  readBy: {
                    user: session.user.id,
                    userType: "SCHOOL_ADMIN",
                  },
                },
              }
            )
        : { modifiedCount: 0 },
      userNotificationIds.length > 0
        ? action === "read"
          ? UserNotification.updateMany(
              {
                _id: { $in: userNotificationIds },
                "readBy.user": { $ne: session.user.id },
              },
              {
                $push: {
                  readBy: {
                    user: session.user.id,
                    userType: "SCHOOL_ADMIN",
                    readAt: new Date(),
                  },
                },
              }
            )
          : UserNotification.updateMany(
              { _id: { $in: userNotificationIds } },
              {
                $pull: {
                  readBy: {
                    user: session.user.id,
                    userType: "SCHOOL_ADMIN",
                  },
                },
              }
            )
        : { modifiedCount: 0 },
    ]);

    const nextUnreadCount =
      action === "read"
        ? Math.max(0, visible.unreadCount - allowedNotifications.length)
        : Math.min(
            visible.notifications.length,
            visible.unreadCount + allowedNotifications.length
          );

    publishWorkIndicatorsUpdate("school-notifications-read-state-updated", {
      userId: String(session.user.id),
      action,
      markedCount:
        (platformResult.modifiedCount || 0) +
        (eventResult.modifiedCount || 0) +
        (userNotificationResult.modifiedCount || 0),
    });

    return NextResponse.json({
      markedCount:
        (platformResult.modifiedCount || 0) +
        (eventResult.modifiedCount || 0) +
        (userNotificationResult.modifiedCount || 0),
      unreadCount: nextUnreadCount,
    });
  } catch (error) {
    console.error("POST /api/school/notifications/read error:", error);
    return NextResponse.json(
      { message: "Failed to mark school notifications as read" },
      { status: 500 }
    );
  }
}
