jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

jest.mock("@/lib/db", () => jest.fn());

jest.mock("@/models/UserSurfaceSeenState", () => ({
  __esModule: true,
  default: {
    updateOne: jest.fn(),
  },
}));

import { getServerSession } from "next-auth";
import connectDB from "@/lib/db";
import UserSurfaceSeenState from "@/models/UserSurfaceSeenState";
import { POST } from "@/app/api/me/work-indicators/seen/route";

describe("POST /api/me/work-indicators/seen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores seen state for an allowed surface", async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: "student-1",
        role: "STUDENT",
      },
    });
    UserSurfaceSeenState.updateOne.mockResolvedValue({ acknowledged: true });

    const response = await POST(
      new Request("http://localhost/api/me/work-indicators/seen", {
        method: "POST",
        body: JSON.stringify({ surface: "student.schoolMagazine" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.surface).toBe("student.schoolMagazine");
    expect(body.seenAt).toBeTruthy();
    expect(connectDB).toHaveBeenCalledTimes(1);
    expect(UserSurfaceSeenState.updateOne).toHaveBeenCalledWith(
      { user: "student-1", surface: "student.schoolMagazine" },
      expect.objectContaining({
        $set: expect.objectContaining({
          user: "student-1",
          role: "STUDENT",
          surface: "student.schoolMagazine",
        }),
      }),
      { upsert: true }
    );
  });

  it("rejects unsupported surfaces", async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: "student-1",
        role: "STUDENT",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/me/work-indicators/seen", {
        method: "POST",
        body: JSON.stringify({ surface: "admin.secret" }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Unsupported indicator surface",
    });
    expect(connectDB).not.toHaveBeenCalled();
    expect(UserSurfaceSeenState.updateOne).not.toHaveBeenCalled();
  });
});
