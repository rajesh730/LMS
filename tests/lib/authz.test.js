jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
import {
  canManageEventRecord,
  getSessionSchoolId,
  requireApiSession,
} from "@/lib/authz";

describe("shared API authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("distinguishes missing authentication from a forbidden role", async () => {
    getServerSession.mockResolvedValueOnce(null);
    const unauthenticated = await requireApiSession(["SCHOOL_ADMIN"]);
    expect(unauthenticated.error.status).toBe(401);

    getServerSession.mockResolvedValueOnce({
      user: { id: "student-1", role: "STUDENT" },
    });
    const forbidden = await requireApiSession(["SCHOOL_ADMIN"]);
    expect(forbidden.error.status).toBe(403);
  });

  it("uses the admin account id as its school boundary", () => {
    expect(
      getSessionSchoolId({
        user: {
          id: "school-account",
          schoolId: "untrusted-other-value",
          role: "SCHOOL_ADMIN",
        },
      })
    ).toBe("school-account");
  });

  it("blocks school admins from another school's event", () => {
    expect(
      canManageEventRecord(
        { user: { id: "school-a", role: "SCHOOL_ADMIN" } },
        { eventScope: "SCHOOL", school: "school-b" }
      )
    ).toBe(false);
  });

  it("allows only a same-school creator or assigned mentor teacher", () => {
    const teacher = {
      user: { id: "teacher-1", schoolId: "school-a", role: "TEACHER" },
    };

    expect(
      canManageEventRecord(teacher, {
        eventScope: "SCHOOL",
        school: "school-a",
        createdBy: "teacher-2",
        assignedMentors: [],
      })
    ).toBe(false);

    expect(
      canManageEventRecord(teacher, {
        eventScope: "SCHOOL",
        school: "school-a",
        createdBy: "teacher-2",
        assignedMentors: ["teacher-1"],
      })
    ).toBe(true);
  });
});
