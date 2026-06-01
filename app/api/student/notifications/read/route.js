import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Notice from "@/models/Notice";
import EventNotice from "@/models/EventNotice";
import UserNotification from "@/models/UserNotification";
import { getStudentNotificationPayload } from "@/lib/studentNotifications";
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

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    const action = normalizeAction(body);
    const requestedNotifications = normalizeNotifications(body);

    const visible = await getStudentNotificationPayload(session, 100);
    if (visible.error) {
      return NextResponse.json(
        { message: visible.error.message },
        { status: visible.error.status }
      );
    }

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
        (item) =>
          `${String(item.noticeType).toUpperCase()}:${String(item.id)}`
      )
    );
    const visibleStorageTypes = new Map(
      visible.notifications.map((item) => [
        `${String(item.noticeType).toUpperCase()}:${String(item.id)}`,
        String(item.storageType || "").toUpperCase(),
      ])
    );
    const allowedNotifications = baseNotifications.filter((item) =>
      visibleKeys.has(`${item.noticeType}:${item.id}`)
    ).map((item) => {
      const key = `${item.noticeType}:${item.id}`;
      return {
        ...item,
        storageType: item.storageType || visibleStorageTypes.get(key) || "",
      };
    });

    if (allowedNotifications.length === 0) {
      return NextResponse.json({
        markedCount: 0,
        unreadCount: visible.unreadCount,
      });
    }

    const schoolNoticeIds = allowedNotifications
      .filter(
        (item) =>
          item.noticeType === "SCHOOL" ||
          (item.noticeType === "EVENT" && item.storageType === "NOTICE")
      )
      .map((item) => item.id);
    const eventNoticeIds = allowedNotifications
      .filter(
        (item) => item.noticeType === "EVENT" && item.storageType !== "NOTICE"
      )
      .map((item) => item.id);
    const userNotificationIds = allowedNotifications
      .filter((item) => item.storageType === "USER_NOTIFICATION")
      .map((item) => item.id);

    const [schoolResult, eventResult, userNotificationResult] = await Promise.all([
      schoolNoticeIds.length > 0
        ? action === "read"
          ? Notice.updateMany(
              {
                _id: { $in: schoolNoticeIds },
                "readBy.user": { $ne: session.user.id },
              },
              {
                $push: {
                  readBy: {
                    user: session.user.id,
                    userType: "STUDENT",
                    readAt: new Date(),
                  },
                },
              }
            )
          : Notice.updateMany(
              { _id: { $in: schoolNoticeIds } },
              {
                $pull: {
                  readBy: {
                    user: session.user.id,
                    userType: "STUDENT",
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
                    userType: "STUDENT",
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
                    userType: "STUDENT",
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
                    userType: "STUDENT",
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
                    userType: "STUDENT",
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

    publishWorkIndicatorsUpdate("student-notifications-read-state-updated", {
      userId: String(session.user.id),
      action,
      markedCount:
        (schoolResult.modifiedCount || 0) +
        (eventResult.modifiedCount || 0) +
        (userNotificationResult.modifiedCount || 0),
    });

    return NextResponse.json({
      markedCount:
        (schoolResult.modifiedCount || 0) +
        (eventResult.modifiedCount || 0) +
        (userNotificationResult.modifiedCount || 0),
      unreadCount: nextUnreadCount,
    });
  } catch (error) {
    console.error("POST /api/student/notifications/read error:", error);
    return NextResponse.json(
      { message: "Failed to mark student notifications as read" },
      { status: 500 }
    );
  }
}
