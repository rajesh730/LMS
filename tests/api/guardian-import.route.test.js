jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/Parent", () => ({
  __esModule: true,
  default: { find: jest.fn(), findOne: jest.fn(), create: jest.fn() },
}));
jest.mock("@/models/ParentStudentLink", () => {
  const actual = jest.requireActual("@/models/ParentStudentLink");
  return {
    __esModule: true,
    default: { find: jest.fn(), create: jest.fn() },
    applyAccessLevelDefaults: actual.applyAccessLevelDefaults,
    PARENT_RELATIONSHIP_TYPES: actual.PARENT_RELATIONSHIP_TYPES,
  };
});
jest.mock("@/models/AuditLog", () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue({}) },
}));

import { getServerSession } from "next-auth";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import { GET, POST } from "@/app/api/school/guardians/import/route";

/**
 * The import is the bridge between student registration and the Parent App.
 * It runs in bulk over real family data, so the rules that stop it doing damage
 * — skip placeholders, skip already-linked students, reuse an existing parent
 * for siblings, and never grant consent — are all pinned here.
 */

const SCHOOL_A = "aaaaaaaaaaaaaaaaaaaaaaa1";

function signedInAs(schoolId = SCHOOL_A, role = "SCHOOL_ADMIN") {
  getServerSession.mockResolvedValue({
    user: { id: schoolId, role, schoolId },
  });
}

function studentsAre(rows) {
  Student.find.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(rows) }),
  });
}

function existingLinksAre(rows) {
  ParentStudentLink.find.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(rows) }),
  });
}

function post(body = {}) {
  return POST(
    new Request("http://localhost/api/school/guardians/import", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  signedInAs();
  existingLinksAre([]);
  Parent.findOne.mockResolvedValue(null);
  Parent.create.mockImplementation(async (doc) => ({ ...doc, _id: "new-parent" }));
  ParentStudentLink.create.mockResolvedValue({ _id: "new-link" });
});

describe("dry run", () => {
  it("reports what would be created without writing anything", async () => {
    studentsAre([
      { _id: "s1", name: "Aayush", grade: "Grade 8", parentName: "Sita Sharma" },
      { _id: "s2", name: "Aarya", grade: "Grade 4", parentName: "To be added" },
    ]);

    const res = await GET(
      new Request("http://localhost/api/school/guardians/import")
    );
    const json = await res.json();

    expect(json.data.willCreate).toBe(1);
    expect(json.data.preview[0].guardianName).toBe("Sita Sharma");
    expect(Parent.create).not.toHaveBeenCalled();
    expect(ParentStudentLink.create).not.toHaveBeenCalled();
  });
});

describe("what gets imported", () => {
  it("skips students whose parent name is registration filler", async () => {
    studentsAre([
      { _id: "s1", name: "A", parentName: "To be added" },
      { _id: "s2", name: "B", parentName: "N/A" },
      { _id: "s3", name: "C", parentName: "" },
    ]);

    const res = await post({ scope: "ALL" });
    const json = await res.json();

    expect(json.data.created).toBe(0);
    expect(Parent.create).not.toHaveBeenCalled();
  });

  it("skips students who already have a guardian", async () => {
    studentsAre([{ _id: "s1", name: "Aayush", parentName: "Sita Sharma" }]);
    existingLinksAre([{ student: "s1" }]);

    const res = await post({ scope: "ALL" });
    const json = await res.json();

    // Importing again would create a duplicate account for the same person.
    expect(json.data.created).toBe(0);
    expect(json.data.skipped).toBe(1);
    expect(ParentStudentLink.create).not.toHaveBeenCalled();
  });

  it("creates a guardian with NO email and NO phone when none are on file", async () => {
    studentsAre([
      {
        _id: "s1",
        name: "Aayush",
        parentName: "Sita Sharma",
        parentContactNumber: "To be added",
        parentEmail: "",
        guardianRelationship: "MOTHER",
      },
    ]);

    const res = await post({ scope: "ALL" });
    const json = await res.json();

    expect(json.data.created).toBe(1);
    const created = Parent.create.mock.calls[0][0];
    expect(created.name).toBe("Sita Sharma");
    // A guardian with neither contact detail is entirely valid.
    expect(created.email).toBeUndefined();
    expect(created.phone).toBeUndefined();
  });

  it("carries real contact details across", async () => {
    studentsAre([
      {
        _id: "s1",
        name: "Aayush",
        parentName: "Sita Sharma",
        parentContactNumber: "9800000000",
        parentEmail: "Sita@Example.COM",
      },
    ]);

    await post({ scope: "ALL" });

    const created = Parent.create.mock.calls[0][0];
    expect(created.phone).toBe("9800000000");
    expect(created.email).toBe("sita@example.com");
  });

  it("does NOT issue a Parent Access Card", async () => {
    studentsAre([{ _id: "s1", name: "A", parentName: "Sita Sharma" }]);

    await post({ scope: "ALL" });

    // Bulk-minting credentials is a separate, deliberate act per guardian.
    expect(Parent.create.mock.calls[0][0].accessState).toBe("NOT_CREATED");
  });
});

describe("permissions granted on import (§20)", () => {
  it("grants view + notices but NEVER consent or registration", async () => {
    studentsAre([{ _id: "s1", name: "A", parentName: "Sita Sharma" }]);

    await post({ scope: "ALL" });

    const link = ParentStudentLink.create.mock.calls[0][0];
    expect(link.canViewPortfolio).toBe(true);
    expect(link.canReceiveNotices).toBe(true);
    // Importing is a data migration, not a decision about who may act for a child.
    expect(link.canGiveConsent).toBe(false);
    expect(link.canRegisterEvents).toBe(false);
  });

  it("maps the registration relationship, defaulting unknown values", async () => {
    studentsAre([
      { _id: "s1", name: "A", parentName: "Sita", guardianRelationship: "MOTHER" },
      { _id: "s2", name: "B", parentName: "Ram", guardianRelationship: "COUSIN" },
    ]);

    await post({ scope: "ALL" });

    expect(ParentStudentLink.create.mock.calls[0][0].relationshipType).toBe(
      "MOTHER"
    );
    expect(ParentStudentLink.create.mock.calls[1][0].relationshipType).toBe(
      "OTHER"
    );
  });
});

describe("siblings share one guardian account", () => {
  it("reuses an existing parent matched by email instead of duplicating", async () => {
    studentsAre([
      {
        _id: "s1",
        name: "Aayush",
        parentName: "Sita Sharma",
        parentEmail: "sita@example.com",
      },
    ]);
    Parent.findOne.mockResolvedValue({ _id: "existing-parent" });

    const res = await post({ scope: "ALL" });
    const json = await res.json();

    expect(json.data.created).toBe(1);
    // A second account would split the siblings across two logins.
    expect(Parent.create).not.toHaveBeenCalled();
    expect(ParentStudentLink.create.mock.calls[0][0].parent).toBe(
      "existing-parent"
    );
  });

  it("does not try to match when there is no email or phone to match on", async () => {
    studentsAre([{ _id: "s1", name: "A", parentName: "Sita Sharma" }]);

    await post({ scope: "ALL" });

    // Matching two contactless "Sita Sharma" records by name would merge
    // unrelated families.
    expect(Parent.findOne).not.toHaveBeenCalled();
    expect(Parent.create).toHaveBeenCalled();
  });
});

describe("safety", () => {
  it("requires an explicit scope so a school-wide import cannot happen by accident", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    expect(Student.find).not.toHaveBeenCalled();
  });

  it("tolerates a duplicate-key race without reporting a failure", async () => {
    studentsAre([{ _id: "s1", name: "A", parentName: "Sita Sharma" }]);
    ParentStudentLink.create.mockRejectedValue({ code: 11000 });

    const res = await post({ scope: "ALL" });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.failures).toHaveLength(0);
  });

  it("reports a genuine failure without aborting the rest of the batch", async () => {
    studentsAre([
      { _id: "s1", name: "A", parentName: "Sita" },
      { _id: "s2", name: "B", parentName: "Ram" },
    ]);
    ParentStudentLink.create
      .mockRejectedValueOnce(new Error("disk on fire"))
      .mockResolvedValueOnce({ _id: "l2" });

    const res = await post({ scope: "ALL" });
    const json = await res.json();

    expect(json.data.created).toBe(1);
    expect(json.data.failures).toHaveLength(1);
  });

  it("refuses a teacher", async () => {
    signedInAs(SCHOOL_A, "TEACHER");
    const res = await post({ scope: "ALL" });
    expect(res.status).toBe(403);
  });

  it("scopes the student query to the caller's own school", async () => {
    studentsAre([]);
    await post({ scope: "ALL" });

    expect(Student.find).toHaveBeenCalledWith(
      expect.objectContaining({ school: SCHOOL_A })
    );
  });
});
