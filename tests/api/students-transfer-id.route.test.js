jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/StudentTransfer", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { findById: jest.fn(), findOne: jest.fn() },
}));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("@/models/AcademicYear", () => ({
  __esModule: true,
  default: { updateOne: jest.fn().mockResolvedValue({}) },
}));
jest.mock("@/models/SchoolMagazineArticle", () => ({
  __esModule: true,
  default: { updateMany: jest.fn().mockResolvedValue({}) },
}));
jest.mock("@/lib/transferNotifications", () => ({
  notifyTransferRejected: jest.fn(),
  notifyReleaseApproved: jest.fn(),
  notifyAdmissionApproved: jest.fn(),
}));
jest.mock("@/lib/studentIdentity", () => ({
  generateUniqueStudentUsername: jest.fn().mockResolvedValue("newuser1"),
}));
// Keep the real enrollment helpers (makeEnrollmentEntry / closeCurrentEnrollments)
// so the actual enrollment mutation runs; only stub the academic-year lookup.
jest.mock("@/lib/studentEnrollment", () => {
  const actual = jest.requireActual("@/lib/studentEnrollment");
  return {
    ...actual,
    ensureActiveAcademicYear: jest
      .fn()
      .mockResolvedValue({ year: "2026-27", yearStart: 2026, _id: "ay1" }),
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
import StudentTransfer from "@/models/StudentTransfer";
import Student from "@/models/Student";
import User from "@/models/User";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import {
  notifyReleaseApproved,
  notifyAdmissionApproved,
} from "@/lib/transferNotifications";
import { PUT } from "@/app/api/students/transfer/[id]/route";

function putReq(body) {
  return new Request("http://localhost/api/students/transfer/t1", {
    method: "PUT",
    body: JSON.stringify(body || {}),
  });
}

function run(body) {
  return PUT(putReq(body), { params: { id: "t1" } });
}

function asSchool(schoolId) {
  getServerSession.mockResolvedValue({
    user: { id: schoolId, role: "SCHOOL_ADMIN" },
  });
}

// Builds a fresh, mutable student doc (real enrollment helpers mutate it).
function makeStudent() {
  return {
    _id: "stu1",
    firstName: "Manju",
    school: "nepal",
    grade: "Grade 9",
    rollNumber: "1",
    isDeleted: false,
    status: "ACTIVE",
    enrollments: [{ status: "CURRENT", school: "nepal", grade: "Grade 9" }],
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function makeTransfer(overrides = {}) {
  return {
    _id: "t1",
    student: "stu1",
    fromSchool: "nepal",
    toSchool: "orbit",
    status: "PENDING_ADMISSION",
    toGrade: "Grade 10",
    toRollNumber: "5",
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function mockNoRollClash() {
  Student.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
}

function mockToSchool() {
  User.findById.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve({ schoolName: "Orbit English" }) }),
  });
}

describe("school transfer [id] route — guards + state machine", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects a non school-admin", async () => {
    getServerSession.mockResolvedValue({ user: { id: "s1", role: "STUDENT" } });
    const res = await run({ action: "approve_release" });
    expect(res.status).toBe(403);
    expect(StudentTransfer.findById).not.toHaveBeenCalled();
  });

  it("404s when the transfer does not exist", async () => {
    asSchool("school1");
    StudentTransfer.findById.mockResolvedValue(null);
    const res = await run({ action: "approve_release" });
    expect(res.status).toBe(404);
  });

  it("400s on an unknown action for the current status", async () => {
    asSchool("school1");
    StudentTransfer.findById.mockResolvedValue(
      makeTransfer({ fromSchool: "school1", toSchool: "school2", status: "PENDING_RELEASE" })
    );
    const res = await run({ action: "bogus" });
    expect(res.status).toBe(400);
  });

  it("blocks a school that does not own the release", async () => {
    asSchool("otherSchool");
    StudentTransfer.findById.mockResolvedValue(
      makeTransfer({ fromSchool: "school1", toSchool: "school2", status: "PENDING_RELEASE" })
    );
    const res = await run({ action: "approve_release" });
    expect(res.status).toBe(403);
  });
});

describe("transfer release / admission transitions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("origin school approves release: issues a code and notifies", async () => {
    asSchool("nepal");
    const transfer = makeTransfer({ status: "PENDING_RELEASE" });
    StudentTransfer.findById.mockResolvedValue(transfer);

    const res = await run({ action: "approve_release" });

    expect(res.status).toBe(200);
    expect(transfer.status).toBe("RELEASED");
    expect(transfer.transferCode).toMatch(/^TR-\d{6}$/);
    expect(transfer.save).toHaveBeenCalled();
    expect(notifyReleaseApproved).toHaveBeenCalled();
  });

  it("destination rejects admission: returns the student to RELEASED + clears target", async () => {
    asSchool("orbit");
    const transfer = makeTransfer({ status: "PENDING_ADMISSION" });
    StudentTransfer.findById.mockResolvedValue(transfer);

    const res = await run({ action: "reject_admission", reason: "No seats" });

    expect(res.status).toBe(200);
    expect(transfer.status).toBe("RELEASED");
    expect(transfer.toSchool).toBeNull();
    expect(transfer.toGrade).toBe("");
  });
});

describe("moveStudent (admission approval) — the actual record move", () => {
  beforeEach(() => jest.clearAllMocks());

  it("moves the student, re-enrolls, and detaches their writing from the old school", async () => {
    asSchool("orbit"); // destination school approves
    StudentTransfer.findById.mockResolvedValue(makeTransfer());
    const student = makeStudent();
    Student.findById.mockResolvedValue(student);
    mockNoRollClash();
    mockToSchool();

    const res = await run({ action: "approve_admission" });

    expect(res.status).toBe(200);
    // Current enrollment flipped to the new school.
    expect(student.school).toBe("orbit");
    expect(student.grade).toBe("Grade 10");
    expect(student.rollNumber).toBe("5");
    expect(student.username).toBe("newuser1");
    expect(student.status).toBe("ACTIVE");
    // Old enrollment closed, new CURRENT enrollment opened.
    const closed = student.enrollments.find((e) => e.school === "nepal");
    const current = student.enrollments.find((e) => e.status === "CURRENT");
    expect(closed.status).toBe("TRANSFERRED");
    expect(current.school).toBe("orbit");
    // Transfer completed + persisted.
    expect(student.save).toHaveBeenCalled();
    expect(res).toBeDefined();
    // Writing detached from the ORIGIN school's live surfaces.
    expect(SchoolMagazineArticle.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ authorStudent: "stu1", school: "nepal" }),
      { $set: { showOnSchoolWall: false, isGlobalWallPublished: false } },
      expect.anything()
    );
    expect(notifyAdmissionApproved).toHaveBeenCalled();
  });

  it("409s on a roll-number clash and does not move the student", async () => {
    asSchool("orbit");
    StudentTransfer.findById.mockResolvedValue(makeTransfer());
    const student = makeStudent();
    Student.findById.mockResolvedValue(student);
    Student.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: "clash" }),
    });
    mockToSchool();

    const res = await run({ action: "approve_admission" });

    expect(res.status).toBe(409);
    expect(student.school).toBe("nepal"); // unchanged
    expect(student.save).not.toHaveBeenCalled();
    expect(SchoolMagazineArticle.updateMany).not.toHaveBeenCalled();
  });

  it("409s when the student is no longer at the releasing school (stale)", async () => {
    asSchool("orbit");
    StudentTransfer.findById.mockResolvedValue(makeTransfer());
    Student.findById.mockResolvedValue({
      ...makeStudent(),
      school: "someOtherSchool", // moved already
    });

    const res = await run({ action: "approve_admission" });

    expect(res.status).toBe(409);
  });
});
