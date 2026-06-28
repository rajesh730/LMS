jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { find: jest.fn(), distinct: jest.fn() },
}));
jest.mock("@/models/SchoolConfig", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock("@/models/AcademicYear", () => ({
  __esModule: true,
  default: { updateOne: jest.fn().mockResolvedValue({}) },
}));
// Real makeEnrollmentEntry / closeCurrentEnrollments; only stub the year lookup.
jest.mock("@/lib/studentEnrollment", () => {
  const actual = jest.requireActual("@/lib/studentEnrollment");
  return {
    ...actual,
    ensureActiveAcademicYear: jest.fn().mockResolvedValue({
      _id: "ay1",
      year: "2025-26",
      yearStart: 2025,
      calendar: "AD",
    }),
  };
});
jest.mock("mongoose", () => ({
  __esModule: true,
  default: {
    startSession: jest.fn().mockResolvedValue({
      withTransaction: async (fn) => {
        await fn();
      },
      endSession: jest.fn(),
    }),
  },
}));

import { getServerSession } from "next-auth";
import Student from "@/models/Student";
import SchoolConfig from "@/models/SchoolConfig";
import AcademicYear from "@/models/AcademicYear";
import { POST } from "@/app/api/school/academic-year/promote/route";

const GRADES = ["Grade 8", "Grade 9", "Grade 10"];

function asSchool(schoolId = "sch1") {
  getServerSession.mockResolvedValue({
    user: { id: schoolId, role: "SCHOOL_ADMIN", schoolName: "Test School" },
  });
}

function makeStu(id, grade, roll = "1") {
  return {
    _id: id,
    name: id,
    grade,
    rollNumber: roll,
    status: "ACTIVE",
    enrollments: [{ status: "CURRENT", school: "sch1", grade }],
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function mockGrades() {
  SchoolConfig.findOne.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve({ grades: GRADES }) }),
  });
  Student.distinct.mockResolvedValue(GRADES);
}

function postReq(body) {
  return new Request("http://localhost/api/school/academic-year/promote", {
    method: "POST",
    body: JSON.stringify(body || {}),
  });
}

describe("academic-year promote — guards", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects a non school-admin", async () => {
    getServerSession.mockResolvedValue({ user: { id: "s1", role: "STUDENT" } });
    const res = await POST(postReq({ confirm: true }));
    expect(res.status).toBe(403);
  });

  it("requires explicit confirmation", async () => {
    asSchool();
    const res = await POST(postReq({ confirm: false }));
    expect(res.status).toBe(400);
  });
});

describe("academic-year promote — rollover", () => {
  beforeEach(() => jest.clearAllMocks());

  it("promotes, graduates the top grade, retains, and rolls the year over", async () => {
    asSchool("sch1");
    mockGrades();
    const promoting = makeStu("gr9", "Grade 9");
    const graduating = makeStu("gr10", "Grade 10");
    const retained = makeStu("gr8", "Grade 8");
    Student.find.mockResolvedValue([promoting, graduating, retained]);

    const res = await POST(
      postReq({ confirm: true, retainStudentIds: ["gr8"] })
    );
    const json = await res.json();

    expect(res.status).toBe(200);

    // Promoted: grade advances, old enrollment closed PROMOTED, new CURRENT opened.
    expect(promoting.grade).toBe("Grade 10");
    expect(promoting.enrollments.find((e) => e.status === "PROMOTED")).toBeTruthy();
    const promotedCurrent = promoting.enrollments.find((e) => e.status === "CURRENT");
    expect(promotedCurrent.grade).toBe("Grade 10");
    expect(promotedCurrent.academicYear).toBe("2026-27");

    // Graduated: top grade leaves the active roster as ALUMNI.
    expect(graduating.status).toBe("ALUMNI");
    expect(graduating.enrollments.find((e) => e.status === "GRADUATED")).toBeTruthy();

    // Retained: stays in the same grade for the new session.
    expect(retained.grade).toBe("Grade 8");
    expect(retained.enrollments.find((e) => e.status === "RETAINED")).toBeTruthy();

    // Everyone persisted.
    expect(promoting.save).toHaveBeenCalled();
    expect(graduating.save).toHaveBeenCalled();
    expect(retained.save).toHaveBeenCalled();

    // Summary reported.
    expect(json.data.summary).toEqual({ promoted: 1, retained: 1, graduated: 1 });

    // Year rolled over: current CLOSED with summary, next ACTIVE upserted.
    expect(AcademicYear.updateOne).toHaveBeenCalledWith(
      { _id: "ay1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "CLOSED",
          "summary.promoted": 1,
          "summary.graduated": 1,
          "summary.retained": 1,
        }),
      }),
      expect.anything()
    );
    expect(AcademicYear.updateOne).toHaveBeenCalledWith(
      { school: "sch1", yearStart: 2026 },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({ status: "ACTIVE", yearStart: 2026 }),
      }),
      expect.objectContaining({ upsert: true })
    );
  });

  it("records a roll-number conflict as a failure instead of throwing", async () => {
    asSchool("sch1");
    mockGrades();
    const clashing = makeStu("gr9", "Grade 9");
    clashing.save = jest.fn().mockRejectedValue({ code: 11000 });
    Student.find.mockResolvedValue([clashing]);

    const res = await POST(postReq({ confirm: true }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.failures).toHaveLength(1);
    expect(json.data.failures[0]).toMatchObject({ id: "gr9" });
    expect(json.data.failures[0].reason).toMatch(/roll number/i);
  });
});
