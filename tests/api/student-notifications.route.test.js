jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

jest.mock("@/lib/db", () => jest.fn());

jest.mock("@/lib/studentNotifications", () => ({
  getStudentNotificationPayload: jest.fn(),
}));

import { getServerSession } from "next-auth";
import connectDB from "@/lib/db";
import { getStudentNotificationPayload } from "@/lib/studentNotifications";
import { GET } from "@/app/api/student/notifications/route";

describe("GET /api/student/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when the user is not an authenticated student", async () => {
    getServerSession.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/student/notifications")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Unauthorized",
    });
    expect(connectDB).not.toHaveBeenCalled();
  });

  it("clamps the requested limit and returns the notification payload", async () => {
    const session = { user: { id: "student-1", role: "STUDENT" } };
    const payload = {
      notifications: [{ id: "notice-1", noticeType: "SCHOOL", isRead: false }],
      unreadCount: 1,
    };

    getServerSession.mockResolvedValue(session);
    getStudentNotificationPayload.mockResolvedValue(payload);

    const response = await GET(
      new Request("http://localhost/api/student/notifications?limit=999")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(payload);
    expect(connectDB).toHaveBeenCalledTimes(1);
    expect(getStudentNotificationPayload).toHaveBeenCalledWith(session, 100);
  });

  it("returns the shared loader error when no student profile is found", async () => {
    const session = { user: { id: "student-1", role: "STUDENT" } };

    getServerSession.mockResolvedValue(session);
    getStudentNotificationPayload.mockResolvedValue({
      error: { message: "Student profile not found", status: 404 },
    });

    const response = await GET(
      new Request("http://localhost/api/student/notifications")
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Student profile not found",
    });
  });
});
