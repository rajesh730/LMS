jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/transferNotifications", () => ({
  notifyReleaseRequested: jest.fn(),
  notifyAdmissionRequested: jest.fn(),
}));

import { getServerSession } from "next-auth";
import { GET, POST, PATCH } from "@/app/api/student/transfer/route";

function req(body) {
  return new Request("http://localhost/api/student/transfer", {
    method: "POST",
    body: JSON.stringify(body || {}),
  });
}

describe("student transfer route — auth guards", () => {
  beforeEach(() => jest.clearAllMocks());

  it("GET requires authentication", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST rejects a non-student role", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "u1", role: "SCHOOL_ADMIN" },
    });
    const res = await POST(req({ reason: "x" }));
    expect(res.status).toBe(403);
  });

  it("PATCH requires authentication", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await PATCH(req({ action: "cancel" }));
    expect(res.status).toBe(401);
  });
});
