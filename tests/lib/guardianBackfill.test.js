jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/guardianLinking", () => {
  const actual = jest.requireActual("@/lib/guardianLinking");
  return {
    linkGuardiansForStudents: jest.fn(),
    guardianNamesMatch: actual.guardianNamesMatch,
    normalizeGuardianName: actual.normalizeGuardianName,
  };
});
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/ParentStudentLink", () => ({
  __esModule: true,
  default: { distinct: jest.fn(), find: jest.fn(), updateMany: jest.fn() },
}));
jest.mock("@/models/Parent", () => ({
  __esModule: true,
  default: { find: jest.fn(), create: jest.fn() },
}));
jest.mock("@/models/SchoolConfig", () => ({
  __esModule: true,
  default: { findOne: jest.fn(), updateOne: jest.fn() },
}));

import Student from "@/models/Student";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import SchoolConfig from "@/models/SchoolConfig";
import { linkGuardiansForStudents } from "@/lib/guardianLinking";
import { runGuardianBackfill } from "@/lib/guardianBackfill";

/**
 * The backfill runs off a page load, so the properties that matter are the ones
 * that stop it becoming a liability: it must be bounded, idempotent, and it must
 * stop running once there is nothing left to do.
 */

const SCHOOL = "aaaaaaaaaaaaaaaaaaaaaaa1";

function configIs(guardianBackfill) {
  SchoolConfig.findOne.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve({ guardianBackfill }) }),
  });
}

function candidatesAre(rows) {
  Student.find.mockReturnValue({
    limit: () => ({ select: () => ({ lean: () => Promise.resolve(rows) }) }),
  });
}

function student(name, id = "s1") {
  return { _id: id, name: "Aayush", parentName: name };
}

beforeEach(() => {
  jest.clearAllMocks();
  configIs(null);
  ParentStudentLink.distinct.mockResolvedValue([]);
  Parent.find.mockReturnValue({ limit: () => Promise.resolve([]) });
  // No merged guardians by default: the split pass finds nothing to do.
  ParentStudentLink.find.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve([]) }),
  });
  ParentStudentLink.updateMany.mockResolvedValue({});
  Parent.create.mockImplementation(async (doc) => ({ ...doc, _id: "new-parent" }));
  SchoolConfig.updateOne.mockResolvedValue({});
  linkGuardiansForStudents.mockResolvedValue({ linked: 0, skipped: 0 });
});

describe("linking unlinked students", () => {
  it("links students with real parent details", async () => {
    candidatesAre([student("Sita Sharma", "s1"), student("Ram Sharma", "s2")]);
    linkGuardiansForStudents.mockResolvedValue({ linked: 2, skipped: 0 });

    const result = await runGuardianBackfill(SCHOOL);

    expect(result.linked).toBe(2);
    expect(linkGuardiansForStudents).toHaveBeenCalledWith(
      expect.objectContaining({ schoolId: SCHOOL, actorId: null })
    );
  });

  it("excludes students who already have a link", async () => {
    ParentStudentLink.distinct.mockResolvedValue(["s1", "s2"]);
    candidatesAre([]);

    await runGuardianBackfill(SCHOOL);

    expect(Student.find).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $nin: ["s1", "s2"] } })
    );
  });

  it("ignores placeholder parent names", async () => {
    candidatesAre([student("To be added", "s1"), student("N/A", "s2")]);

    const result = await runGuardianBackfill(SCHOOL);

    expect(result.linked).toBe(0);
    expect(linkGuardiansForStudents).not.toHaveBeenCalled();
  });

  it("only passes the importable students through", async () => {
    candidatesAre([
      student("Sita Sharma", "s1"),
      student("To be added", "s2"),
      student("Ram Sharma", "s3"),
    ]);
    linkGuardiansForStudents.mockResolvedValue({ linked: 2, skipped: 0 });

    await runGuardianBackfill(SCHOOL);

    const passed = linkGuardiansForStudents.mock.calls[0][0].students;
    expect(passed.map((s) => s._id)).toEqual(["s1", "s3"]);
  });
});

describe("it stops running once it is done", () => {
  it("marks complete when nothing is left", async () => {
    candidatesAre([]);

    await runGuardianBackfill(SCHOOL);

    const [, update] = SchoolConfig.updateOne.mock.calls[0];
    expect(update.$set["guardianBackfill.completedAt"]).toBeInstanceOf(Date);
  });

  it("skips the student scan for a school already completed and checked recently", async () => {
    configIs({
      completedAt: new Date(),
      lastRunAt: new Date(),
    });

    const result = await runGuardianBackfill(SCHOOL);

    expect(result.ran).toBe(false);
    expect(result.linked).toBe(0);
    // A fully-linked school must not pay to re-scan its students on every page
    // load. The cheap Parent ID pass still runs — see the "Parent ID backfill"
    // block below — so `distinct` is expected to be called for parents.
    expect(Student.find).not.toHaveBeenCalled();
    expect(linkGuardiansForStudents).not.toHaveBeenCalled();
    expect(ParentStudentLink.distinct).not.toHaveBeenCalledWith(
      "student",
      expect.anything()
    );
  });

  it("re-checks a completed school after the recheck window", async () => {
    configIs({
      completedAt: new Date("2020-01-01"),
      lastRunAt: new Date("2020-01-01"),
    });
    candidatesAre([]);

    await runGuardianBackfill(SCHOOL);

    // New students could have arrived through a path that skipped linking.
    expect(Student.find).toHaveBeenCalled();
  });
});

describe("batching", () => {
  it("stays INCOMPLETE when a full batch comes back, so it resumes", async () => {
    // A full batch means there are probably more waiting.
    candidatesAre(
      Array.from({ length: 100 }, (_, i) => student("Sita Sharma", `s${i}`))
    );
    linkGuardiansForStudents.mockResolvedValue({ linked: 100, skipped: 0 });

    const result = await runGuardianBackfill(SCHOOL);

    expect(result.remaining).toBe(-1);
    const [, update] = SchoolConfig.updateOne.mock.calls[0];
    expect(update.$set["guardianBackfill.completedAt"]).toBeUndefined();
  });

  it("marks complete on a partial batch", async () => {
    candidatesAre([student("Sita Sharma", "s1")]);
    linkGuardiansForStudents.mockResolvedValue({ linked: 1, skipped: 0 });

    const result = await runGuardianBackfill(SCHOOL);

    expect(result.remaining).toBe(0);
    const [, update] = SchoolConfig.updateOne.mock.calls[0];
    expect(update.$set["guardianBackfill.completedAt"]).toBeInstanceOf(Date);
  });
});

describe("it never breaks the page", () => {
  it("swallows a database failure and reports it", async () => {
    ParentStudentLink.distinct.mockRejectedValue(new Error("connection lost"));

    const result = await runGuardianBackfill(SCHOOL);

    // The roster must still render.
    expect(result.error).toBe(true);
    expect(result.linked).toBe(0);
  });
});

describe("Parent ID backfill", () => {
  function guardiansWithoutIds(count) {
    const docs = Array.from({ length: count }, (_, i) => ({
      _id: `p${i}`,
      save: jest.fn().mockResolvedValue(true),
    }));
    ParentStudentLink.distinct.mockResolvedValue(["p0"]);
    Parent.find.mockReturnValue({ limit: () => Promise.resolve(docs) });
    return docs;
  }

  it("saves guardians missing an ID so the model hook assigns one", async () => {
    const docs = guardiansWithoutIds(3);
    candidatesAre([]);

    const result = await runGuardianBackfill(SCHOOL);

    expect(result.idsAssigned).toBe(3);
    // .save() rather than a bulk update, so the model's pre-save hook does the
    // allocation — one implementation, no chance of drift.
    docs.forEach((doc) => expect(doc.save).toHaveBeenCalled());
  });

  it("only looks at guardians with a blank or missing ID", async () => {
    guardiansWithoutIds(1);
    candidatesAre([]);

    await runGuardianBackfill(SCHOOL);

    expect(Parent.find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [
          { parentId: { $exists: false } },
          { parentId: null },
          { parentId: "" },
        ],
      })
    );
  });

  it("still assigns IDs for a school whose linking is already complete", async () => {
    configIs({ completedAt: new Date(), lastRunAt: new Date() });
    const docs = guardiansWithoutIds(2);

    const result = await runGuardianBackfill(SCHOOL);

    // The linking scan is skipped, but a blank ID column must still get fixed.
    expect(result.idsAssigned).toBe(2);
    expect(Student.find).not.toHaveBeenCalled();
    expect(docs[0].save).toHaveBeenCalled();
  });

  it("keeps going when one guardian cannot be saved", async () => {
    const docs = guardiansWithoutIds(2);
    docs[0].save.mockRejectedValue(new Error("duplicate"));
    candidatesAre([]);

    const result = await runGuardianBackfill(SCHOOL);

    expect(result.idsAssigned).toBe(1);
    expect(docs[1].save).toHaveBeenCalled();
  });

  it("does nothing when the school has no guardians yet", async () => {
    ParentStudentLink.distinct.mockResolvedValue([]);
    candidatesAre([]);

    const result = await runGuardianBackfill(SCHOOL);

    expect(result.idsAssigned).toBe(0);
    expect(Parent.find).not.toHaveBeenCalled();
  });
});


describe("splitting wrongly-merged guardians", () => {
  /**
   * The exact production bug: two unrelated students both named "Aayush
   * Basnet" produced the same generated parentEmail, so Anita Rai and Mina BK
   * were merged onto one account and each could see the other's child.
   */
  function mergedGuardian() {
    ParentStudentLink.find.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            { _id: "l1", parent: "shared", student: "s-g10" },
            { _id: "l2", parent: "shared", student: "s-g5" },
          ]),
      }),
    });

    Parent.find.mockImplementation((query) => {
      // The split pass loads the merged parents; the ID pass loads parents
      // missing an ID. Distinguish by the presence of the $or clause.
      if (query.$or) return { limit: () => Promise.resolve([]) };
      return Promise.resolve([{ _id: "shared", name: "Anita Rai" }]);
    });

    Student.find.mockImplementation((query) => {
      if (query._id?.$in) {
        return {
          select: () => ({
            lean: () =>
              Promise.resolve([
                { _id: "s-g10", parentName: "Anita Rai" },
                { _id: "s-g5", parentName: "Mina BK" },
              ]),
          }),
        };
      }
      return { limit: () => ({ select: () => ({ lean: () => Promise.resolve([]) }) }) };
    });
  }

  it("moves the mismatched child onto a NEW guardian account", async () => {
    mergedGuardian();

    const result = await runGuardianBackfill(SCHOOL);

    expect(result.guardiansSplit).toBe(1);
    // The guardian who does not match the account name gets her own.
    expect(Parent.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Mina BK" })
    );
    expect(ParentStudentLink.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ["l2"] } },
      { $set: { parent: "new-parent" } }
    );
  });

  it("leaves the matching child on the original account", async () => {
    mergedGuardian();

    await runGuardianBackfill(SCHOOL);

    // Only l2 moved; l1 (Anita's own child) stayed put.
    const moved = ParentStudentLink.updateMany.mock.calls.flatMap(
      ([filter]) => filter._id.$in
    );
    expect(moved).toEqual(["l2"]);
  });

  it("creates the new guardian WITHOUT the colliding contact details", async () => {
    mergedGuardian();

    await runGuardianBackfill(SCHOOL);

    const created = Parent.create.mock.calls[0][0];
    // The shared email was the placeholder that caused the merge — it was
    // never Mina's, and the unique index would reject it.
    expect(created.email).toBeUndefined();
    expect(created.phone).toBeUndefined();
  });

  it("does NOT split genuine siblings", async () => {
    ParentStudentLink.find.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            { _id: "l1", parent: "sita", student: "s1" },
            { _id: "l2", parent: "sita", student: "s2" },
          ]),
      }),
    });
    Parent.find.mockImplementation((query) => {
      if (query.$or) return { limit: () => Promise.resolve([]) };
      return Promise.resolve([{ _id: "sita", name: "Sita Sharma" }]);
    });
    Student.find.mockImplementation((query) => {
      if (query._id?.$in) {
        return {
          select: () => ({
            lean: () =>
              Promise.resolve([
                { _id: "s1", parentName: "Sita Sharma" },
                { _id: "s2", parentName: "Sita Sharma" },
              ]),
          }),
        };
      }
      return { limit: () => ({ select: () => ({ lean: () => Promise.resolve([]) }) }) };
    });

    const result = await runGuardianBackfill(SCHOOL);

    // Both children carry the same parent name — one family, one account.
    expect(result.guardiansSplit).toBe(0);
    expect(ParentStudentLink.updateMany).not.toHaveBeenCalled();
  });

  it("leaves a child with no usable parent name where it is", async () => {
    ParentStudentLink.find.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            { _id: "l1", parent: "shared", student: "s1" },
            { _id: "l2", parent: "shared", student: "s2" },
          ]),
      }),
    });
    Parent.find.mockImplementation((query) => {
      if (query.$or) return { limit: () => Promise.resolve([]) };
      return Promise.resolve([{ _id: "shared", name: "Anita Rai" }]);
    });
    Student.find.mockImplementation((query) => {
      if (query._id?.$in) {
        return {
          select: () => ({
            lean: () =>
              Promise.resolve([
                { _id: "s1", parentName: "Anita Rai" },
                { _id: "s2", parentName: "To be added" },
              ]),
          }),
        };
      }
      return { limit: () => ({ select: () => ({ lean: () => Promise.resolve([]) }) }) };
    });

    const result = await runGuardianBackfill(SCHOOL);

    // Moving it would be a guess, and a wrong guess is a privacy problem.
    expect(result.guardiansSplit).toBe(0);
  });

  it("ignores guardians with only one child", async () => {
    ParentStudentLink.find.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([{ _id: "l1", parent: "p1", student: "s1" }]),
      }),
    });

    const result = await runGuardianBackfill(SCHOOL);

    expect(result.guardiansSplit).toBe(0);
    expect(Parent.create).not.toHaveBeenCalled();
  });
});
