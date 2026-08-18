jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/parentCredentials", () => ({ issueParentAccess: jest.fn() }));
jest.mock("@/lib/parentIdentity", () => ({ normalizeParentId: (v) => v }));
jest.mock("@/models/GuardianInvitation", () => ({
  __esModule: true,
  default: { find: jest.fn(), create: jest.fn() },
  generateInvitationCode: () => "ABCD2345",
  hashInvitationCode: (c) => `hash:${c}`,
}));
jest.mock("@/models/ParentStudentLink", () => {
  const actual = jest.requireActual("@/models/ParentStudentLink");
  return {
    __esModule: true,
    default: {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    applyAccessLevelDefaults: actual.applyAccessLevelDefaults,
    PARENT_RELATIONSHIP_TYPES: actual.PARENT_RELATIONSHIP_TYPES,
    PARENT_ACCESS_LEVELS: actual.PARENT_ACCESS_LEVELS,
  };
});
jest.mock("@/models/Parent", () => ({
  __esModule: true,
  default: { findOne: jest.fn(), create: jest.fn() },
}));
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

import { getServerSession } from "next-auth";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import Student from "@/models/Student";
import { issueParentAccess } from "@/lib/parentCredentials";
import { POST, PATCH } from "@/app/api/school/guardians/route";

/**
 * A student may have several guardians — mother, father, grandparent, legal
 * guardian — but only ONE primary. Without demotion the roster shows two
 * "Primary" badges and nothing says who the school should ring first.
 */

const SCHOOL = "aaaaaaaaaaaaaaaaaaaaaaa1";
const STUDENT = "1111111111111111111111a1";

function signedIn(role = "SCHOOL_ADMIN") {
  getServerSession.mockResolvedValue({
    user: { id: SCHOOL, role, schoolId: SCHOOL },
  });
}

function post(body) {
  return POST(
    new Request("http://localhost/api/school/guardians", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  signedIn();
  Student.findOne.mockReturnValue({
    select: () => ({
      lean: () =>
        Promise.resolve({ _id: STUDENT, name: "Aayush", school: SCHOOL }),
    }),
  });
  Parent.findOne.mockResolvedValue(null);
  Parent.create.mockImplementation(async (doc) => ({
    ...doc,
    _id: "parent-new",
    accessState: "NOT_CREATED",
  }));
  ParentStudentLink.findOne.mockResolvedValue(null);
  ParentStudentLink.create.mockImplementation(async (doc) => ({
    ...doc,
    _id: "link-new",
  }));
  ParentStudentLink.updateMany.mockResolvedValue({});
  issueParentAccess.mockResolvedValue({
    parentIdentifier: "PRV-P-AAAAAA",
    activationPin: "111222",
    activationToken: "tok",
    activationId: "act",
    expiresAt: new Date(),
  });
});

describe("adding several guardians to one student", () => {
  it("creates a second guardian without touching the first", async () => {
    const res = await post({
      studentId: STUDENT,
      guardianName: "Ram Sharma",
      relationshipType: "FATHER",
    });

    expect(res.status).toBe(201);
    expect(ParentStudentLink.create).toHaveBeenCalledWith(
      expect.objectContaining({ student: STUDENT, relationshipType: "FATHER" })
    );
  });

  it("does NOT demote anyone when the new guardian is not primary", async () => {
    await post({
      studentId: STUDENT,
      guardianName: "Ram Sharma",
      isPrimaryGuardian: false,
    });

    // Adding a father must never silently strip the mother's primary status.
    expect(ParentStudentLink.updateMany).not.toHaveBeenCalled();
  });

  it("demotes the previous primary when a new one is named", async () => {
    await post({
      studentId: STUDENT,
      guardianName: "Ram Sharma",
      isPrimaryGuardian: true,
    });

    expect(ParentStudentLink.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        student: STUDENT,
        isPrimaryGuardian: true,
        _id: { $ne: "link-new" },
      }),
      { $set: { isPrimaryGuardian: false } }
    );
  });
});

describe("promoting an existing guardian", () => {
  it("demotes the other primary", async () => {
    const link = {
      _id: "link-2",
      student: STUDENT,
      school: SCHOOL,
      save: jest.fn().mockResolvedValue(true),
    };
    ParentStudentLink.findById.mockResolvedValue(link);

    const res = await PATCH(
      new Request("http://localhost/api/school/guardians", {
        method: "PATCH",
        body: JSON.stringify({ linkId: "link-2", isPrimaryGuardian: true }),
      })
    );

    expect(res.status).toBe(200);
    expect(link.isPrimaryGuardian).toBe(true);
    expect(ParentStudentLink.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $ne: "link-2" } }),
      { $set: { isPrimaryGuardian: false } }
    );
  });

  it("leaves primaries alone for an unrelated permission change", async () => {
    const link = {
      _id: "link-2",
      student: STUDENT,
      school: SCHOOL,
      save: jest.fn().mockResolvedValue(true),
    };
    ParentStudentLink.findById.mockResolvedValue(link);

    await PATCH(
      new Request("http://localhost/api/school/guardians", {
        method: "PATCH",
        body: JSON.stringify({ linkId: "link-2", canGiveConsent: true }),
      })
    );

    expect(link.canGiveConsent).toBe(true);
    expect(ParentStudentLink.updateMany).not.toHaveBeenCalled();
  });
});
