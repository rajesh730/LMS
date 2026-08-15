jest.mock("@/models/Parent", () => ({
  __esModule: true,
  default: { findOne: jest.fn(), find: jest.fn(), create: jest.fn() },
}));
jest.mock("@/models/ParentStudentLink", () => {
  const actual = jest.requireActual("@/models/ParentStudentLink");
  return {
    __esModule: true,
    default: { findOne: jest.fn(), create: jest.fn() },
    applyAccessLevelDefaults: actual.applyAccessLevelDefaults,
    PARENT_RELATIONSHIP_TYPES: actual.PARENT_RELATIONSHIP_TYPES,
  };
});

import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import {
  linkGuardianFromStudentRecord,
  linkGuardiansForStudents,
} from "@/lib/guardianLinking";

/**
 * Auto-linking runs inside student registration, so its failure modes matter
 * more than its happy path: it must never block a student being created, never
 * invent a guardian out of placeholder text, and never hand out the power to
 * consent on a child's behalf.
 */

const SCHOOL = "aaaaaaaaaaaaaaaaaaaaaaa1";

function student(overrides = {}) {
  return {
    _id: "student-1",
    name: "Aayush Sharma",
    parentName: "Sita Sharma",
    parentContactNumber: "9800000000",
    parentEmail: "",
    guardianRelationship: "MOTHER",
    ...overrides,
  };
}

function noExistingLink() {
  ParentStudentLink.findOne.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(null) }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  noExistingLink();
  Parent.findOne.mockResolvedValue(null);
  Parent.find.mockReturnValue({ limit: () => Promise.resolve([]) });
  Parent.create.mockImplementation(async (doc) => ({ ...doc, _id: "parent-1" }));
  ParentStudentLink.create.mockResolvedValue({ _id: "link-1" });
});

describe("registration data is treated as authentic", () => {
  it("creates a guardian and an ACTIVE link", async () => {
    const result = await linkGuardianFromStudentRecord({
      student: student(),
      schoolId: SCHOOL,
      actorId: "admin-1",
    });

    expect(result.linked).toBe(true);
    expect(Parent.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Sita Sharma", phone: "9800000000" })
    );
    // The school established this in person at the front desk — there is no
    // code for anyone to redeem.
    expect(ParentStudentLink.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ACTIVE", relationshipType: "MOTHER" })
    );
  });

  it("works with a name only — no phone, no email", async () => {
    await linkGuardianFromStudentRecord({
      student: student({ parentContactNumber: "To be added", parentEmail: "" }),
      schoolId: SCHOOL,
    });

    const created = Parent.create.mock.calls[0][0];
    expect(created.email).toBeUndefined();
    expect(created.phone).toBeUndefined();
  });
});

describe("what it refuses to do", () => {
  it("does not invent a guardian from placeholder text", async () => {
    for (const filler of ["To be added", "N/A", "-", "", "  "]) {
      jest.clearAllMocks();
      noExistingLink();

      const result = await linkGuardianFromStudentRecord({
        student: student({ parentName: filler }),
        schoolId: SCHOOL,
      });

      expect(result.linked).toBe(false);
      expect(result.reason).toBe("NO_PARENT_DATA");
      expect(Parent.create).not.toHaveBeenCalled();
    }
  });

  it("does not double-link a student who already has a guardian", async () => {
    ParentStudentLink.findOne.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ _id: "existing" }) }),
    });

    const result = await linkGuardianFromStudentRecord({
      student: student(),
      schoolId: SCHOOL,
    });

    expect(result.reason).toBe("ALREADY_LINKED");
    expect(Parent.create).not.toHaveBeenCalled();
  });

  it("NEVER grants consent or event registration automatically", async () => {
    await linkGuardianFromStudentRecord({ student: student(), schoolId: SCHOOL });

    const link = ParentStudentLink.create.mock.calls[0][0];
    expect(link.canViewPortfolio).toBe(true);
    expect(link.canReceiveNotices).toBe(true);
    // An automatic process must not decide who may act for a child.
    expect(link.canGiveConsent).toBe(false);
    expect(link.canRegisterEvents).toBe(false);
  });

  it("does not issue a Parent Access Card", async () => {
    await linkGuardianFromStudentRecord({ student: student(), schoolId: SCHOOL });
    expect(Parent.create.mock.calls[0][0].accessState).toBe("NOT_CREATED");
  });
});

describe("siblings", () => {
  it("reuses a guardian matched by phone AND name", async () => {
    Parent.find.mockReturnValue({
      limit: () =>
        Promise.resolve([{ _id: "existing-parent", name: "Sita Sharma" }]),
    });

    await linkGuardianFromStudentRecord({ student: student(), schoolId: SCHOOL });

    expect(Parent.create).not.toHaveBeenCalled();
    expect(ParentStudentLink.create.mock.calls[0][0].parent).toBe(
      "existing-parent"
    );
  });

  it("does not match on name when there is no contact detail", async () => {
    await linkGuardianFromStudentRecord({
      student: student({ parentContactNumber: "", parentEmail: "" }),
      schoolId: SCHOOL,
    });

    // Two contactless "Sita Sharma" records are different families.
    expect(Parent.find).not.toHaveBeenCalled();
    expect(Parent.create).toHaveBeenCalled();
  });
});

describe("never breaks student registration", () => {
  it("returns a reason instead of throwing when the write fails", async () => {
    Parent.create.mockRejectedValue(new Error("database on fire"));

    const result = await linkGuardianFromStudentRecord({
      student: student(),
      schoolId: SCHOOL,
    });

    expect(result.linked).toBe(false);
    expect(result.reason).toBe("ERROR");
  });

  it("treats a duplicate-key race as already-linked, not a failure", async () => {
    ParentStudentLink.create.mockRejectedValue({ code: 11000 });

    const result = await linkGuardianFromStudentRecord({
      student: student(),
      schoolId: SCHOOL,
    });

    expect(result.reason).toBe("ALREADY_LINKED");
  });

  it("survives a malformed student object", async () => {
    const result = await linkGuardianFromStudentRecord({
      student: null,
      schoolId: SCHOOL,
    });
    expect(result.linked).toBe(false);
  });
});

describe("relationship mapping", () => {
  it.each([
    ["MOTHER", "MOTHER"],
    ["father", "FATHER"],
    ["GUARDIAN", "OTHER"],
    ["COUSIN", "OTHER"],
    [undefined, "OTHER"],
  ])("%s -> %s", async (input, expected) => {
    await linkGuardianFromStudentRecord({
      student: student({ guardianRelationship: input }),
      schoolId: SCHOOL,
    });

    expect(ParentStudentLink.create.mock.calls[0][0].relationshipType).toBe(
      expected
    );
  });
});

describe("bulk linking", () => {
  it("counts linked and skipped without stopping on a skip", async () => {
    const result = await linkGuardiansForStudents({
      students: [
        student({ _id: "s1" }),
        student({ _id: "s2", parentName: "To be added" }),
        student({ _id: "s3", parentName: "Ram Sharma" }),
      ],
      schoolId: SCHOOL,
    });

    expect(result.linked).toBe(2);
    expect(result.skipped).toBe(1);
  });
});

describe("syncGuardianFromStudentRecord — editing a student keeps the guardian in step", () => {
  const { syncGuardianFromStudentRecord } = require("@/lib/guardianLinking");

  function linkedTo(parentId) {
    ParentStudentLink.findOne.mockReturnValue({
      sort: () => ({
        select: () => ({ lean: () => Promise.resolve({ parent: parentId }) }),
      }),
    });
  }

  beforeEach(() => {
    Parent.updateOne = jest.fn().mockResolvedValue({});
  });

  it("creates a guardian when the student has none yet", async () => {
    // A parent name added AFTER registration is just a late registration.
    ParentStudentLink.findOne
      .mockReturnValueOnce({
        sort: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
      })
      .mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve(null) }),
      });

    const result = await syncGuardianFromStudentRecord({
      student: student(),
      schoolId: SCHOOL,
    });

    expect(result.created).toBe(true);
    expect(Parent.create).toHaveBeenCalled();
  });

  it("updates the existing guardian's name instead of creating a second", async () => {
    linkedTo("parent-1");

    const result = await syncGuardianFromStudentRecord({
      student: student({ parentName: "Sita Sharma Basnet" }),
      schoolId: SCHOOL,
    });

    expect(result.synced).toBe(true);
    expect(Parent.create).not.toHaveBeenCalled();
    expect(Parent.updateOne).toHaveBeenCalledWith(
      { _id: "parent-1" },
      { $set: expect.objectContaining({ name: "Sita Sharma Basnet" }) }
    );
  });

  it("adds a phone that was missing before", async () => {
    linkedTo("parent-1");

    await syncGuardianFromStudentRecord({
      student: student({ parentContactNumber: "9811111111" }),
      schoolId: SCHOOL,
    });

    const [, update] = Parent.updateOne.mock.calls[0];
    expect(update.$set.phone).toBe("9811111111");
  });

  it("does NOT clear a contact detail when the student field is blanked", async () => {
    linkedTo("parent-1");

    await syncGuardianFromStudentRecord({
      student: student({ parentContactNumber: "", parentEmail: "" }),
      schoolId: SCHOOL,
    });

    // Otherwise an empty field on a student form would silently strip the
    // email a guardian relies on for notices.
    const [, update] = Parent.updateOne.mock.calls[0];
    expect(update.$set).not.toHaveProperty("phone");
    expect(update.$set).not.toHaveProperty("email");
  });

  it("never touches permissions or access state", async () => {
    linkedTo("parent-1");

    await syncGuardianFromStudentRecord({
      student: student(),
      schoolId: SCHOOL,
    });

    const [, update] = Parent.updateOne.mock.calls[0];
    // Correcting a student record is not a decision about who may act.
    expect(Object.keys(update.$set).sort()).toEqual(["name", "phone"]);
    expect(ParentStudentLink.create).not.toHaveBeenCalled();
  });

  it("leaves things alone when a new email clashes with another guardian", async () => {
    linkedTo("parent-1");
    Parent.updateOne.mockRejectedValue({ code: 11000 });

    const result = await syncGuardianFromStudentRecord({
      student: student({ parentEmail: "taken@example.com" }),
      schoolId: SCHOOL,
    });

    // Merging two families on the strength of a typo would be worse.
    expect(result.synced).toBe(false);
    expect(result.reason).toBe("DUPLICATE_CONTACT");
  });

  it("does nothing for placeholder parent data", async () => {
    const result = await syncGuardianFromStudentRecord({
      student: student({ parentName: "To be added" }),
      schoolId: SCHOOL,
    });

    expect(result.synced).toBe(false);
    expect(Parent.updateOne).not.toHaveBeenCalled();
  });
});


describe("two families must never be merged by a shared contact", () => {
  const { guardianNamesMatch, normalizeGuardianName } = require("@/lib/guardianLinking");

  it("normalises names for comparison", () => {
    expect(normalizeGuardianName("  Anita   RAI ")).toBe("anita rai");
    expect(guardianNamesMatch("Anita Rai", "anita  rai")).toBe(true);
    expect(guardianNamesMatch("Anita Rai", "Mina BK")).toBe(false);
    // An empty name matches nothing — it would otherwise match everything.
    expect(guardianNamesMatch("", "")).toBe(false);
  });

  it("does NOT reuse a guardian when the contact matches but the name differs", async () => {
    // The real regression: two unrelated students both named "Aayush Basnet"
    // produce the same generated parentEmail, and their two different mothers
    // were merged into one account.
    Parent.find.mockReturnValue({
      limit: () =>
        Promise.resolve([
          {
            _id: "anita",
            name: "Anita Rai",
            email: "aayush.basnet@example.com",
          },
        ]),
    });

    await linkGuardianFromStudentRecord({
      student: student({
        _id: "other-aayush",
        parentName: "Mina BK",
        parentEmail: "aayush.basnet@example.com",
        parentContactNumber: "9863091684",
      }),
      schoolId: SCHOOL,
    });

    // A separate account, not Anita's.
    expect(Parent.create).toHaveBeenCalled();
    expect(ParentStudentLink.create.mock.calls[0][0].parent).not.toBe("anita");
  });

  it("drops the colliding email so the unique index is not violated", async () => {
    Parent.find.mockReturnValue({
      limit: () =>
        Promise.resolve([
          {
            _id: "anita",
            name: "Anita Rai",
            email: "aayush.basnet@example.com",
          },
        ]),
    });

    await linkGuardianFromStudentRecord({
      student: student({
        parentName: "Mina BK",
        parentEmail: "aayush.basnet@example.com",
        parentContactNumber: "9863091684",
      }),
      schoolId: SCHOOL,
    });

    const created = Parent.create.mock.calls[0][0];
    // The email belonged to Anita; it was never Mina's.
    expect(created.email).toBeUndefined();
    // Her own phone did not collide, so it is kept.
    expect(created.phone).toBe("9863091684");
  });

  it("keeps a non-colliding contact when only the other one clashes", async () => {
    Parent.find.mockReturnValue({
      limit: () =>
        Promise.resolve([
          { _id: "anita", name: "Anita Rai", phone: "9800000000" },
        ]),
    });

    await linkGuardianFromStudentRecord({
      student: student({
        parentName: "Mina BK",
        parentEmail: "mina@example.com",
        parentContactNumber: "9800000000",
      }),
      schoolId: SCHOOL,
    });

    const created = Parent.create.mock.calls[0][0];
    expect(created.email).toBe("mina@example.com");
    expect(created.phone).toBeUndefined();
  });

  it("still merges REAL siblings — same guardian name, same contact", async () => {
    Parent.find.mockReturnValue({
      limit: () =>
        Promise.resolve([
          { _id: "sita", name: "Sita Sharma", phone: "9800000000" },
        ]),
    });

    await linkGuardianFromStudentRecord({
      student: student({
        _id: "sibling",
        parentName: "Sita Sharma",
        parentContactNumber: "9800000000",
      }),
      schoolId: SCHOOL,
    });

    expect(Parent.create).not.toHaveBeenCalled();
    expect(ParentStudentLink.create.mock.calls[0][0].parent).toBe("sita");
  });
});
