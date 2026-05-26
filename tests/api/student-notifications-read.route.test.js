jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

jest.mock("@/lib/db", () => jest.fn());

jest.mock("@/models/Notice", () => ({
  __esModule: true,
  default: {
    updateMany: jest.fn(),
  },
}));

jest.mock("@/models/EventNotice", () => ({
  __esModule: true,
  default: {
    updateMany: jest.fn(),
  },
}));

jest.mock("@/lib/studentNotifications", () => ({
  getStudentNotificationPayload: jest.fn(),
}));

import { getServerSession } from "next-auth";
import connectDB from "@/lib/db";
import Notice from "@/models/Notice";
import EventNotice from "@/models/EventNotice";
import { getStudentNotificationPayload } from "@/lib/studentNotifications";
import { POST } from "@/app/api/student/notifications/read/route";

describe("POST /api/student/notifications/read", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when the user is not an authenticated student", async () => {
    getServerSession.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/student/notifications/read", {
        method: "POST",
        body: JSON.stringify({ allVisible: true }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Unauthorized",
    });
    expect(connectDB).not.toHaveBeenCalled();
  });

  it("marks all visible school and event notifications as read", async () => {
    const session = { user: { id: "student-1", role: "STUDENT" } };
    const visiblePayload = {
      notifications: [
        { id: "school-1", noticeType: "SCHOOL" },
        { id: "event-1", noticeType: "EVENT" },
      ],
      unreadCount: 2,
    };

    getServerSession.mockResolvedValue(session);
    getStudentNotificationPayload.mockResolvedValue(visiblePayload);
    Notice.updateMany.mockResolvedValue({ modifiedCount: 1 });
    EventNotice.updateMany.mockResolvedValue({ modifiedCount: 1 });

    const response = await POST(
      new Request("http://localhost/api/student/notifications/read", {
        method: "POST",
        body: JSON.stringify({ allVisible: true }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      markedCount: 2,
      unreadCount: 0,
    });
    expect(connectDB).toHaveBeenCalledTimes(1);
    expect(getStudentNotificationPayload).toHaveBeenCalledWith(session, 100);
    expect(Notice.updateMany).toHaveBeenCalledWith(
      {
        _id: { $in: ["school-1"] },
        "readBy.user": { $ne: "student-1" },
      },
      expect.objectContaining({
        $push: expect.objectContaining({
          readBy: expect.objectContaining({
            user: "student-1",
            userType: "STUDENT",
          }),
        }),
      })
    );
    expect(EventNotice.updateMany).toHaveBeenCalledWith(
      {
        _id: { $in: ["event-1"] },
        "readBy.user": { $ne: "student-1" },
      },
      expect.objectContaining({
        $push: expect.objectContaining({
          readBy: expect.objectContaining({
            user: "student-1",
            userType: "STUDENT",
          }),
        }),
      })
    );
  });

  it("filters requested notifications to the currently visible set before marking unread", async () => {
    const session = { user: { id: "student-1", role: "STUDENT" } };

    getServerSession.mockResolvedValue(session);
    getStudentNotificationPayload.mockResolvedValue({
      notifications: [{ id: "school-1", noticeType: "SCHOOL" }],
      unreadCount: 0,
    });
    Notice.updateMany.mockResolvedValue({ modifiedCount: 1 });

    const response = await POST(
      new Request("http://localhost/api/student/notifications/read", {
        method: "POST",
        body: JSON.stringify({
          action: "unread",
          notifications: [
            { id: "school-1", noticeType: "school" },
            { id: "school-x", noticeType: "school" },
          ],
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      markedCount: 1,
      unreadCount: 1,
    });
    expect(Notice.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ["school-1"] } },
      {
        $pull: {
          readBy: {
            user: "student-1",
            userType: "STUDENT",
          },
        },
      }
    );
    expect(EventNotice.updateMany).not.toHaveBeenCalled();
  });

  it("marks event notifications stored as school notices in the Notice collection", async () => {
    const session = { user: { id: "student-1", role: "STUDENT" } };

    getServerSession.mockResolvedValue(session);
    getStudentNotificationPayload.mockResolvedValue({
      notifications: [
        {
          id: "notice-event-1",
          noticeType: "EVENT",
          storageType: "NOTICE",
        },
      ],
      unreadCount: 1,
    });
    Notice.updateMany.mockResolvedValue({ modifiedCount: 1 });
    EventNotice.updateMany.mockResolvedValue({ modifiedCount: 0 });

    const response = await POST(
      new Request("http://localhost/api/student/notifications/read", {
        method: "POST",
        body: JSON.stringify({
          notifications: [
            {
              id: "notice-event-1",
              noticeType: "EVENT",
              storageType: "NOTICE",
            },
          ],
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      markedCount: 1,
      unreadCount: 0,
    });
    expect(Notice.updateMany).toHaveBeenCalledWith(
      {
        _id: { $in: ["notice-event-1"] },
        "readBy.user": { $ne: "student-1" },
      },
      expect.objectContaining({
        $push: expect.objectContaining({
          readBy: expect.objectContaining({
            user: "student-1",
            userType: "STUDENT",
          }),
        }),
      })
    );
    expect(EventNotice.updateMany).not.toHaveBeenCalled();
  });
});
