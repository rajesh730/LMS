jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

jest.mock("@/lib/db", () => jest.fn());

jest.mock("@/lib/workIndicators", () => ({
  getWorkIndicatorsCached: jest.fn(),
}));

import { getServerSession } from "next-auth";
import connectDB from "@/lib/db";
import { getWorkIndicatorsCached } from "@/lib/workIndicators";
import { GET } from "@/app/api/me/work-indicators/route";

describe("GET /api/me/work-indicators", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when no user session exists", async () => {
    getServerSession.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Unauthorized",
    });
    expect(connectDB).not.toHaveBeenCalled();
  });

  it("returns role-scoped work indicators for the current user", async () => {
    const session = {
      user: {
        id: "school-1",
        role: "SCHOOL_ADMIN",
      },
    };
    const indicators = {
      "school.receivedNotices": { count: 2, tone: "new", label: "2" },
      "school.magazine": { count: 5, tone: "action", label: "5" },
    };

    getServerSession.mockResolvedValue(session);
    getWorkIndicatorsCached.mockResolvedValue(indicators);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.role).toBe("SCHOOL_ADMIN");
    expect(body.indicators).toEqual(indicators);
    expect(body.generatedAt).toBeTruthy();
    expect(connectDB).toHaveBeenCalledTimes(1);
    expect(getWorkIndicatorsCached).toHaveBeenCalledWith(session);
  });
});
