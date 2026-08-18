jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Parent", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock("@/models/ParentStudentLink", () => ({
  __esModule: true,
  default: { find: jest.fn(), findOne: jest.fn() },
}));
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { find: jest.fn(), findOne: jest.fn() },
}));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { find: jest.fn(), findById: jest.fn() },
}));

import { getServerSession } from "next-auth";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import Student from "@/models/Student";
import User from "@/models/User";
import {
  requireParentSession,
  requireParentChild,
  getParentChildren,
} from "@/lib/parentAccess";

/**
 * lib/parentAccess is the ONE gate protecting every parent API (§28), so these
 * tests are deliberately adversarial: they assert what a guardian CANNOT reach
 * as much as what they can.
 */

const PARENT_A = "aaaaaaaaaaaaaaaaaaaaaaa1";
const PARENT_B = "bbbbbbbbbbbbbbbbbbbbbbb2";
const AAYUSH = "1111111111111111111111a1";
const AARYA = "2222222222222222222222a2";
const OTHER_CHILD = "9999999999999999999999z9";
const GREEN_VILLAGE = "5555555555555555555555s1";
const ORBIT = "6666666666666666666666s2";

// Chainable query-builder stubs matching Mongoose's fluent API.
function leanOnce(value) {
  return { select: () => ({ lean: () => Promise.resolve(value) }) };
}
function sortSelectLean(value) {
  return {
    sort: () => ({ select: () => ({ lean: () => Promise.resolve(value) }) }),
  };
}

function activeParent(id = PARENT_A) {
  return {
    _id: id,
    name: "Sita Sharma",
    email: "sita@example.com",
    status: "ACTIVE",
    preferences: { simpleMode: false, language: "en" },
  };
}

function link(overrides = {}) {
  return {
    _id: "link-1",
    parent: PARENT_A,
    student: AAYUSH,
    school: GREEN_VILLAGE,
    status: "ACTIVE",
    relationshipType: "MOTHER",
    accessLevel: "FULL",
    canViewPortfolio: true,
    canReceiveNotices: true,
    canRegisterEvents: true,
    canGiveConsent: true,
    canMessageSchool: true,
    isPrimaryGuardian: true,
    ...overrides,
  };
}

function signedInAs(parentId = PARENT_A) {
  getServerSession.mockResolvedValue({
    user: { id: parentId, role: "PARENT" },
  });
  Parent.findOne.mockReturnValue(leanOnce(activeParent(parentId)));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("requireParentSession", () => {
  it("rejects a caller with no session", async () => {
    getServerSession.mockResolvedValue(null);
    const { error } = await requireParentSession();
    expect(error.status).toBe(401);
  });

  it("rejects a signed-in NON-parent (a teacher must not reach parent APIs)", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "teacher-1", role: "TEACHER" },
    });
    const { error } = await requireParentSession();
    expect(error.status).toBe(401);
  });

  it("rejects a parent whose account the school has suspended", async () => {
    getServerSession.mockResolvedValue({
      user: { id: PARENT_A, role: "PARENT" },
    });
    // The query filters on status ACTIVE, so a suspended parent returns null.
    Parent.findOne.mockReturnValue(leanOnce(null));

    const { error } = await requireParentSession();
    expect(error.status).toBe(401);
  });
});

describe("getParentChildren — the child switcher's allow-list", () => {
  it("Scenario A: one parent, one child", async () => {
    ParentStudentLink.find.mockReturnValue({
      sort: () => ({ lean: () => Promise.resolve([link()]) }),
    });
    Student.find.mockReturnValue(
      leanOnce([
        {
          _id: AAYUSH,
          name: "Aayush Sharma",
          grade: "Grade 8",
          school: GREEN_VILLAGE,
          status: "ACTIVE",
        },
      ])
    );
    User.find.mockReturnValue(
      leanOnce([{ _id: GREEN_VILLAGE, schoolName: "Green Village Secondary" }])
    );

    const children = await getParentChildren(PARENT_A);

    expect(children).toHaveLength(1);
    expect(children[0]).toMatchObject({
      studentId: AAYUSH,
      name: "Aayush Sharma",
      grade: "Grade 8",
      school: { id: GREEN_VILLAGE, name: "Green Village Secondary" },
    });
  });

  it("Scenario B: two children at the SAME school", async () => {
    ParentStudentLink.find.mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.resolve([
            link(),
            link({ _id: "link-2", student: AARYA, isPrimaryGuardian: false }),
          ]),
      }),
    });
    Student.find.mockReturnValue(
      leanOnce([
        { _id: AAYUSH, name: "Aayush", grade: "Grade 8", school: GREEN_VILLAGE, status: "ACTIVE" },
        { _id: AARYA, name: "Aarya", grade: "Grade 4", school: GREEN_VILLAGE, status: "ACTIVE" },
      ])
    );
    User.find.mockReturnValue(
      leanOnce([{ _id: GREEN_VILLAGE, schoolName: "Green Village Secondary" }])
    );

    const children = await getParentChildren(PARENT_A);

    expect(children.map((c) => c.name)).toEqual(["Aayush", "Aarya"]);
    expect(new Set(children.map((c) => c.school.name))).toEqual(
      new Set(["Green Village Secondary"])
    );
  });

  it("Scenario C: children at DIFFERENT schools each keep their own school", async () => {
    ParentStudentLink.find.mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.resolve([
            link(),
            link({ _id: "link-2", student: AARYA, school: ORBIT }),
          ]),
      }),
    });
    Student.find.mockReturnValue(
      leanOnce([
        { _id: AAYUSH, name: "Aayush", grade: "Grade 8", school: GREEN_VILLAGE, status: "ACTIVE" },
        { _id: AARYA, name: "Aarya", grade: "Grade 4", school: ORBIT, status: "ACTIVE" },
      ])
    );
    User.find.mockReturnValue(
      leanOnce([
        { _id: GREEN_VILLAGE, schoolName: "Green Village Secondary" },
        { _id: ORBIT, schoolName: "Orbit English Secondary" },
      ])
    );

    const children = await getParentChildren(PARENT_A);

    expect(children.find((c) => c.name === "Aayush").school.name).toBe(
      "Green Village Secondary"
    );
    expect(children.find((c) => c.name === "Aarya").school.name).toBe(
      "Orbit English Secondary"
    );
  });

  it("queries ACTIVE links only, so a revoked link disappears immediately", async () => {
    ParentStudentLink.find.mockReturnValue({
      sort: () => ({ lean: () => Promise.resolve([]) }),
    });

    const children = await getParentChildren(PARENT_A);

    expect(children).toEqual([]);
    expect(ParentStudentLink.find).toHaveBeenCalledWith({
      parent: PARENT_A,
      status: "ACTIVE",
    });
  });

  it("keeps GRADUATED children visible — history is not deleted (§25)", async () => {
    ParentStudentLink.find.mockReturnValue({
      sort: () => ({ lean: () => Promise.resolve([link()]) }),
    });
    Student.find.mockReturnValue(
      leanOnce([
        {
          _id: AAYUSH,
          name: "Aayush",
          grade: "Grade 10",
          school: GREEN_VILLAGE,
          status: "GRADUATED",
        },
      ])
    );
    User.find.mockReturnValue(leanOnce([{ _id: GREEN_VILLAGE, schoolName: "GV" }]));

    const children = await getParentChildren(PARENT_A);

    expect(children).toHaveLength(1);
    expect(children[0].status).toBe("GRADUATED");
    // The Student query must not filter on status.
    expect(Student.find).toHaveBeenCalledWith(
      expect.not.objectContaining({ status: expect.anything() })
    );
  });
});

describe("requireParentChild — the studentId claim is never trusted", () => {
  it("authorises a child this guardian is linked to", async () => {
    signedInAs();
    ParentStudentLink.findOne.mockReturnValue({
      lean: () => Promise.resolve(link()),
    });
    Student.findOne.mockReturnValue(
      leanOnce({
        _id: AAYUSH,
        name: "Aayush",
        grade: "Grade 8",
        school: GREEN_VILLAGE,
        status: "ACTIVE",
      })
    );
    User.findById.mockReturnValue(
      leanOnce({ _id: GREEN_VILLAGE, schoolName: "Green Village Secondary" })
    );

    const result = await requireParentChild(AAYUSH);

    expect(result.error).toBeUndefined();
    expect(result.context.studentId).toBe(AAYUSH);
    // School comes from the STUDENT record, never the request.
    expect(result.context.schoolId).toBe(GREEN_VILLAGE);
    expect(result.context.schoolName).toBe("Green Village Secondary");
  });

  it("REFUSES a student the guardian has no link to", async () => {
    signedInAs();
    ParentStudentLink.findOne.mockReturnValue({
      lean: () => Promise.resolve(null),
    });

    const { error } = await requireParentChild(OTHER_CHILD);

    expect(error.status).toBe(403);
    // Must not even look the student up.
    expect(Student.findOne).not.toHaveBeenCalled();
  });

  it("returns the SAME 403 for an unauthorised and a nonexistent student", async () => {
    signedInAs();

    ParentStudentLink.findOne.mockReturnValue({
      lean: () => Promise.resolve(null),
    });
    const unauthorised = await requireParentChild(OTHER_CHILD);

    ParentStudentLink.findOne.mockReturnValue({
      lean: () => Promise.resolve(link({ student: "does-not-exist" })),
    });
    Student.findOne.mockReturnValue(leanOnce(null));
    const missing = await requireParentChild("does-not-exist");

    // Indistinguishable, so the endpoint cannot be used to probe which student
    // ids exist.
    expect(unauthorised.error.status).toBe(missing.error.status);
  });

  it("refuses a REVOKED link even though the row still exists", async () => {
    signedInAs();
    // The query filters status: "ACTIVE", so a revoked row simply does not match.
    ParentStudentLink.findOne.mockReturnValue({
      lean: () => Promise.resolve(null),
    });

    const { error } = await requireParentChild(AAYUSH);

    expect(error.status).toBe(403);
    expect(ParentStudentLink.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ACTIVE" })
    );
  });

  it("requires a studentId at all", async () => {
    signedInAs();
    const { error } = await requireParentChild("");
    expect(error.status).toBe(400);
  });
});

describe("guardian permissions (§20) — two guardians, different rights", () => {
  function guardianWith(permissions) {
    signedInAs();
    ParentStudentLink.findOne.mockReturnValue({
      lean: () => Promise.resolve(link(permissions)),
    });
    Student.findOne.mockReturnValue(
      leanOnce({
        _id: AAYUSH,
        name: "Aayush",
        grade: "Grade 8",
        school: GREEN_VILLAGE,
        status: "ACTIVE",
      })
    );
    User.findById.mockReturnValue(leanOnce({ _id: GREEN_VILLAGE, schoolName: "GV" }));
  }

  it("blocks consent for a guardian without canGiveConsent", async () => {
    guardianWith({ canGiveConsent: false });
    const { error } = await requireParentChild(AAYUSH, "canGiveConsent");
    expect(error.status).toBe(403);
  });

  it("blocks event registration for a view-and-notices guardian", async () => {
    guardianWith({ canRegisterEvents: false });
    const { error } = await requireParentChild(AAYUSH, "canRegisterEvents");
    expect(error.status).toBe(403);
  });

  it("blocks the portfolio for a notices-only guardian", async () => {
    guardianWith({ canViewPortfolio: false });
    const { error } = await requireParentChild(AAYUSH, "canViewPortfolio");
    expect(error.status).toBe(403);
  });

  it("still allows plain READ access when no permission is demanded", async () => {
    guardianWith({ canGiveConsent: false, canRegisterEvents: false });
    const result = await requireParentChild(AAYUSH);
    expect(result.error).toBeUndefined();
    expect(result.permissions.canGiveConsent).toBe(false);
  });

  it("allows a guardian who HAS the permission", async () => {
    guardianWith({ canGiveConsent: true });
    const result = await requireParentChild(AAYUSH, "canGiveConsent");
    expect(result.error).toBeUndefined();
  });

  it("scopes the link lookup to the SIGNED-IN parent, not a supplied one", async () => {
    signedInAs(PARENT_B);
    ParentStudentLink.findOne.mockReturnValue({
      lean: () => Promise.resolve(null),
    });

    await requireParentChild(AAYUSH);

    expect(ParentStudentLink.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ parent: PARENT_B, student: AAYUSH })
    );
  });
});
