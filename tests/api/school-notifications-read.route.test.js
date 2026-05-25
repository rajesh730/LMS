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

jest.mock("@/lib/schoolNotifications", () => ({
  getSchoolNotificationPayload: jest.fn(),
}));

import { getServerSession } from "next-auth";
import Notice from "@/models/Notice";
import EventNotice from "@/models/EventNotice";
import { getSchoolNotificationPayload } from "@/lib/schoolNotifications";
import { POST } from "@/app/api/school/notifications/read/route";

describe("POST /api/school/notifications/read", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks visible general and event notices as unread for school admins", async () => {
    const session = { user: { id: "school-admin-1", role: "SCHOOL_ADMIN" } };

    getServerSession.mockResolvedValue(session);
    getSchoolNotificationPayload.mockResolvedValue({
      notifications: [
        { id: "general-1", noticeType: "GENERAL" },
        { id: "event-1", noticeType: "EVENT" },
      ],
      unreadCount: 0,
    });
    Notice.updateMany.mockResolvedValue({ modifiedCount: 1 });
    EventNotice.updateMany.mockResolvedValue({ modifiedCount: 1 });

    const response = await POST(
      new Request("http://localhost/api/school/notifications/read", {
        method: "POST",
        body: JSON.stringify({ action: "unread", allVisible: true }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      markedCount: 2,
      unreadCount: 2,
    });
    expect(Notice.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ["general-1"] } },
      {
        $pull: {
          readBy: {
            user: "school-admin-1",
            userType: "SCHOOL_ADMIN",
          },
        },
      }
    );
    expect(EventNotice.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ["event-1"] } },
      {
        $pull: {
          readBy: {
            user: "school-admin-1",
            userType: "SCHOOL_ADMIN",
          },
        },
      }
    );
  });
});
