jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/parentJourney", () => ({ buildStudentJourney: jest.fn() }));
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock("@/models/Parent", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("@/models/ParentStudentLink", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock("@/models/AuditLog", () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue({}) },
}));

import { getServerSession } from "next-auth";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import AuditLog from "@/models/AuditLog";
import { buildStudentJourney } from "@/lib/parentJourney";
import { POST } from "@/app/api/school/assisted-access/route";

/**
 * §22, §55 — School-Assisted Parent Access.
 *
 * The dangerous shape here would be a "view any parent" button. These tests
 * assert that every one of §55's seven safeguards actually fires.
 */

const SCHOOL_A = "aaaaaaaaaaaaaaaaaaaaaaa1";
const SCHOOL_B = "bbbbbbbbbbbbbbbbbbbbbbb2";
const STUDENT = "1111111111111111111111a1";
const LINK = "2222222222222222222222L1";

function signedInAs(schoolId, role = "SCHOOL_ADMIN") {
  getServerSession.mockResolvedValue({
    user: { id: schoolId, role, schoolId, name: "Office Staff" },
  });
}

function selectLean(value) {
  return { select: () => ({ lean: () => Promise.resolve(value) }) };
}

function request(body) {
  return new Request("http://localhost/api/school/assisted-access", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const VALID = { studentId: STUDENT, linkId: LINK, reason: "Guardian visited" };

function mockHappyPath({ canViewPortfolio = true, school = SCHOOL_A } = {}) {
  Student.findOne.mockReturnValue(
    selectLean({
      _id: STUDENT,
      name: "Aayush Sharma",
      grade: "Grade 8",
      school,
      status: "ACTIVE",
      enrollments: [],
    })
  );
  ParentStudentLink.findOne.mockReturnValue({
    lean: () =>
      Promise.resolve({
        _id: LINK,
        parent: "parent-1",
        student: STUDENT,
        school,
        status: "ACTIVE",
        relationshipType: "MOTHER",
        canViewPortfolio,
        canReceiveNotices: true,
      }),
  });
  Parent.findById.mockReturnValue(
    selectLean({
      _id: "parent-1",
      name: "Sita Sharma",
      parentId: "PRV-P-X7K4Q9",
      isHousehold: false,
    })
  );
  buildStudentJourney.mockResolvedValue({
    entries: [{ id: "a1", type: "ACHIEVEMENT", title: "Best Speaker" }],
    counts: { ALL: 1 },
    schools: [],
  });
}

beforeEach(() => jest.clearAllMocks());

describe("§55 safeguards", () => {
  it("1. requires staff authentication", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(request(VALID));
    expect(res.status).toBe(401);
  });

  it("2. enforces same-school validation", async () => {
    signedInAs(SCHOOL_A);
    mockHappyPath({ school: SCHOOL_B });

    const res = await POST(request(VALID));

    expect(res.status).toBe(404);
    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it("3. requires an explicit student selection", async () => {
    signedInAs(SCHOOL_A);
    const res = await POST(request({ linkId: LINK, reason: "x" }));
    expect(res.status).toBe(400);
  });

  it("4. validates the guardian relationship", async () => {
    signedInAs(SCHOOL_A);
    Student.findOne.mockReturnValue(
      selectLean({ _id: STUDENT, name: "Aayush", school: SCHOOL_A })
    );
    // No ACTIVE link for that guardian.
    ParentStudentLink.findOne.mockReturnValue({
      lean: () => Promise.resolve(null),
    });

    const res = await POST(request(VALID));

    expect(res.status).toBe(404);
    expect(buildStudentJourney).not.toHaveBeenCalled();
  });

  it("5. requires a recorded reason — no casual browsing", async () => {
    signedInAs(SCHOOL_A);
    const res = await POST(request({ studentId: STUDENT, linkId: LINK }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/why/i);
  });

  it("6. audits BEFORE returning any data", async () => {
    signedInAs(SCHOOL_A);
    mockHappyPath();

    const res = await POST(request(VALID));

    expect(res.status).toBe(200);
    const entry = AuditLog.create.mock.calls[0][0];
    expect(entry.action).toBe("ASSISTED_PARENT_VIEW_OPENED");
    expect(entry.reason).toBe("Guardian visited");
    expect(entry.performedBy).toBe(SCHOOL_A);
    expect(entry.after.guardianName).toBe("Sita Sharma");
  });

  it("7. returns a RESTRICTED view — portfolio only", async () => {
    signedInAs(SCHOOL_A);
    mockHappyPath();

    const res = await POST(request(VALID));
    const json = await res.json();

    expect(json.data.journey.entries).toHaveLength(1);

    // The payload carries ONLY these sections. Anything new appearing here
    // should be a deliberate decision, so the key set is asserted exactly.
    expect(Object.keys(json.data).sort()).toEqual([
      "child",
      "guardian",
      "journey",
      "permissions",
      "viewedAt",
      "viewedBy",
    ]);

    // Never another guardian's messages, teacher notes or admin records (§22).
    // Checked against the payload, not the response envelope — the envelope
    // has its own `message` field.
    const payload = JSON.stringify(json.data);
    expect(payload).not.toMatch(
      /conversation|disciplin|teacherNote|adminNote|privateNote/i
    );
  });
});

describe("guardian permissions still apply", () => {
  it("withholds the portfolio from a notices-only guardian", async () => {
    signedInAs(SCHOOL_A);
    mockHappyPath({ canViewPortfolio: false });

    const res = await POST(request(VALID));
    const json = await res.json();

    // An assisted session must not show more than the guardian could see at home.
    expect(json.data.journey).toBeNull();
    expect(buildStudentJourney).not.toHaveBeenCalled();
  });
});

describe("household attribution (§20)", () => {
  it("shows the family name, not an individual", async () => {
    signedInAs(SCHOOL_A);
    mockHappyPath();
    Parent.findById.mockReturnValue(
      selectLean({
        _id: "parent-1",
        name: "Sita Sharma",
        parentId: "PRV-P-X7K4Q9",
        isHousehold: true,
        householdName: "Sharma Family",
      })
    );

    const res = await POST(request(VALID));
    const json = await res.json();

    expect(json.data.guardian.name).toBe("Sharma Family");
  });
});

describe("teachers may assist, but still only their own school", () => {
  it("allows a teacher at the same school", async () => {
    signedInAs(SCHOOL_A, "TEACHER");
    mockHappyPath();

    const res = await POST(request(VALID));
    expect(res.status).toBe(200);
  });

  it("blocks a teacher from another school", async () => {
    signedInAs(SCHOOL_A, "TEACHER");
    mockHappyPath({ school: SCHOOL_B });

    const res = await POST(request(VALID));
    expect(res.status).toBe(404);
  });
});
