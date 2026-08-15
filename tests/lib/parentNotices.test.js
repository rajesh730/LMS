jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Notice", () => ({
  __esModule: true,
  default: { find: jest.fn(), countDocuments: jest.fn() },
}));
jest.mock("@/models/NoticeReceipt", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    bulkWrite: jest.fn(),
  },
}));
jest.mock("@/models/ParentStudentLink", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/Parent", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));

import Notice from "@/models/Notice";
import NoticeReceipt from "@/models/NoticeReceipt";
import ParentStudentLink from "@/models/ParentStudentLink";
import Parent from "@/models/Parent";
import {
  listNoticesForStudent,
  markNoticeOpened,
  recordAcknowledgement,
  recordConsent,
  getGuardianReadStates,
  sectionNotices,
  buildNoticeQuery,
} from "@/lib/parentNotices";

/**
 * §11's central rule — "do NOT mark a notice as read simply because it appears
 * in a list" — is a correctness requirement with legal weight for consent
 * notices, so it gets the most direct test in this file.
 */

const PARENT_A = "aaaaaaaaaaaaaaaaaaaaaaa1";
const PARENT_B = "bbbbbbbbbbbbbbbbbbbbbbb2";
const AAYUSH = "1111111111111111111111a1";
const SCHOOL = "5555555555555555555555s1";
const NOTICE = "8888888888888888888888n1";

const student = {
  _id: AAYUSH,
  name: "Aayush Sharma",
  grade: "Grade 8",
  school: SCHOOL,
};

function noticeQuery(rows) {
  return {
    sort: () => ({
      skip: () => ({
        limit: () => ({ select: () => ({ lean: () => Promise.resolve(rows) }) }),
      }),
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  NoticeReceipt.bulkWrite.mockResolvedValue({});
  NoticeReceipt.updateOne.mockResolvedValue({});
  // Supports both call shapes used in lib/parentNotices: `.lean()` directly
  // and `.select(...).lean()`.
  NoticeReceipt.find.mockReturnValue({
    lean: () => Promise.resolve([]),
    select: () => ({ lean: () => Promise.resolve([]) }),
  });
  NoticeReceipt.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
});

describe("buildNoticeQuery — targeting", () => {
  it("only selects notices addressed to parents", () => {
    const query = buildNoticeQuery(student);
    expect(query["targetAudience.parents"]).toBe(true);
    expect(query.status).toBe("PUBLISHED");
    expect(query.isActive).toBe(true);
  });

  it("matches messy grade values ('9', 'Grade 9', 'Class 9')", () => {
    const query = buildNoticeQuery({ ...student, grade: "Grade 9" });
    const gradeClause = query.$and.find((clause) =>
      clause.$or?.some((c) => c.grades?.$in)
    );
    const accepted = gradeClause.$or.find((c) => c.grades?.$in).grades.$in;

    expect(accepted).toEqual(expect.arrayContaining(["Grade 9", "9"]));
  });

  it("includes platform-wide notices alongside the child's school", () => {
    const query = buildNoticeQuery(student);
    const schoolClause = query.$and.find((c) =>
      c.$or?.some((o) => o.scope === "PLATFORM")
    );
    expect(schoolClause.$or).toEqual(
      expect.arrayContaining([{ school: SCHOOL }])
    );
  });
});

describe("listing a notice must NOT mark it read (§11)", () => {
  it("records delivery only — never openedAt", async () => {
    Notice.find.mockReturnValue(
      noticeQuery([
        {
          _id: NOTICE,
          title: "Parent meeting",
          content: "Please attend.",
          publishedAt: new Date(),
        },
      ])
    );
    Notice.countDocuments.mockResolvedValue(1);

    await listNoticesForStudent({ parentId: PARENT_A, student });

    expect(NoticeReceipt.bulkWrite).toHaveBeenCalledTimes(1);
    const [operations] = NoticeReceipt.bulkWrite.mock.calls[0];
    const update = operations[0].updateOne.update;

    // Only $setOnInsert, and openedAt is not among the fields.
    expect(update.$set).toBeUndefined();
    expect(update.$setOnInsert).toBeDefined();
    expect(update.$setOnInsert.openedAt).toBeUndefined();
    expect(update.$setOnInsert.deliveredAt).toBeInstanceOf(Date);
  });

  it("re-listing does not reset deliveredAt (upsert is idempotent)", async () => {
    Notice.find.mockReturnValue(
      noticeQuery([{ _id: NOTICE, title: "N", content: "c" }])
    );
    Notice.countDocuments.mockResolvedValue(1);

    await listNoticesForStudent({ parentId: PARENT_A, student });

    const [operations] = NoticeReceipt.bulkWrite.mock.calls[0];
    expect(operations[0].updateOne.upsert).toBe(true);
    expect(operations[0].updateOne.update.$setOnInsert).toBeDefined();
  });

  it("keys the receipt on parent AND student, so siblings stay separate", async () => {
    Notice.find.mockReturnValue(
      noticeQuery([{ _id: NOTICE, title: "N", content: "c" }])
    );
    Notice.countDocuments.mockResolvedValue(1);

    await listNoticesForStudent({ parentId: PARENT_A, student });

    const [operations] = NoticeReceipt.bulkWrite.mock.calls[0];
    expect(operations[0].updateOne.filter).toEqual({
      notice: NOTICE,
      parent: PARENT_A,
      student: AAYUSH,
    });
  });

  it("returns an empty list without touching receipts at all", async () => {
    Notice.find.mockReturnValue(noticeQuery([]));
    Notice.countDocuments.mockResolvedValue(0);

    const result = await listNoticesForStudent({ parentId: PARENT_A, student });

    expect(result.notices).toEqual([]);
    expect(NoticeReceipt.bulkWrite).not.toHaveBeenCalled();
  });
});

describe("markNoticeOpened — the only writer of openedAt", () => {
  it("stamps openedAt on a brand-new receipt", async () => {
    await markNoticeOpened({ noticeId: NOTICE, parentId: PARENT_A, student });

    const [, update, options] = NoticeReceipt.updateOne.mock.calls[0];
    expect(options).toEqual({ upsert: true });
    expect(update.$setOnInsert.openedAt).toBeInstanceOf(Date);
  });

  it("preserves the FIRST open — a re-read filters on openedAt: null", async () => {
    await markNoticeOpened({ noticeId: NOTICE, parentId: PARENT_A, student });

    const [filter, update] = NoticeReceipt.updateOne.mock.calls[1];
    expect(filter.openedAt).toBeNull();
    expect(update.$set.openedAt).toBeInstanceOf(Date);
  });
});

describe("acknowledgement and consent", () => {
  it("acknowledgement is idempotent — the first press wins", async () => {
    await recordAcknowledgement({
      noticeId: NOTICE,
      parentId: PARENT_A,
      student,
    });

    const [filter] = NoticeReceipt.updateOne.mock.calls[0];
    expect(filter.acknowledgedAt).toBeNull();
  });

  it("records a consent decision with a guardian snapshot", async () => {
    await recordConsent({
      noticeId: NOTICE,
      parentId: PARENT_A,
      student,
      decision: "yes",
      link: { relationshipType: "MOTHER" },
      parent: { name: "Sita Sharma" },
    });

    const [, update] = NoticeReceipt.updateOne.mock.calls[0];
    expect(update.$set).toMatchObject({
      consentDecision: "YES",
      consentGuardianName: "Sita Sharma",
      consentRelationship: "MOTHER",
    });
    // Snapshotted so the record stays interpretable after a link is revoked.
    expect(update.$set.consentDecidedAt).toBeInstanceOf(Date);
  });

  it("rejects anything that is not YES or NO", async () => {
    await expect(
      recordConsent({
        noticeId: NOTICE,
        parentId: PARENT_A,
        student,
        decision: "MAYBE",
        link: {},
        parent: {},
      })
    ).rejects.toThrow(/YES or NO/);
  });

  it("consenting does not overwrite an earlier open time", async () => {
    await recordConsent({
      noticeId: NOTICE,
      parentId: PARENT_A,
      student,
      decision: "NO",
      link: {},
      parent: {},
    });

    // openedAt only in $setOnInsert on the first call…
    const [, firstUpdate] = NoticeReceipt.updateOne.mock.calls[0];
    expect(firstUpdate.$set.openedAt).toBeUndefined();
    // …and the follow-up only touches rows never opened.
    const [secondFilter] = NoticeReceipt.updateOne.mock.calls[1];
    expect(secondFilter.openedAt).toBeNull();
  });
});

describe("per-guardian read state (§11, §19)", () => {
  it("reports each guardian independently", async () => {
    ParentStudentLink.find.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            { parent: PARENT_A, relationshipType: "MOTHER", isPrimaryGuardian: true },
            { parent: PARENT_B, relationshipType: "FATHER", isPrimaryGuardian: false },
          ]),
      }),
    });
    Parent.find.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            { _id: PARENT_A, name: "Sita Sharma" },
            { _id: PARENT_B, name: "Ram Sharma" },
          ]),
      }),
    });
    NoticeReceipt.find.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            { parent: PARENT_A, openedAt: new Date("2026-08-15T19:40:00Z") },
          ]),
      }),
    });

    const states = await getGuardianReadStates({
      noticeId: NOTICE,
      studentId: AAYUSH,
    });

    const mother = states.find((s) => s.relationshipType === "MOTHER");
    const father = states.find((s) => s.relationshipType === "FATHER");

    expect(mother.openedAt).toBeInstanceOf(Date);
    // The mother reading it must not mark the father's copy read.
    expect(father.openedAt).toBeNull();
  });

  it("exposes no contact details for other guardians (§19)", async () => {
    ParentStudentLink.find.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            { parent: PARENT_B, relationshipType: "FATHER", isPrimaryGuardian: false },
          ]),
      }),
    });
    Parent.find.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([{ _id: PARENT_B, name: "Ram Sharma" }]),
      }),
    });

    const [state] = await getGuardianReadStates({
      noticeId: NOTICE,
      studentId: AAYUSH,
    });

    expect(Object.keys(state).sort()).toEqual([
      "acknowledgedAt",
      "consentDecidedAt",
      "consentDecision",
      "isPrimaryGuardian",
      "name",
      "openedAt",
      "relationshipType",
    ]);
    expect(state).not.toHaveProperty("email");
    expect(state).not.toHaveProperty("phone");
  });

  it("excludes guardians the school did not give notice access", async () => {
    ParentStudentLink.find.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([]) }),
    });

    await getGuardianReadStates({ noticeId: NOTICE, studentId: AAYUSH });

    expect(ParentStudentLink.find).toHaveBeenCalledWith(
      expect.objectContaining({ canReceiveNotices: true, status: "ACTIVE" })
    );
  });
});

describe("sectionNotices", () => {
  it("splits into the three sections the Notice Centre renders", () => {
    const sections = sectionNotices([
      { id: "1", status: "ACTION_REQUIRED" },
      { id: "2", status: "NEEDS_ATTENTION" },
      { id: "3", status: "COMPLETE" },
      { id: "4", status: "ACTION_REQUIRED" },
    ]);

    expect(sections.actionRequired.map((n) => n.id)).toEqual(["1", "4"]);
    expect(sections.unread.map((n) => n.id)).toEqual(["2"]);
    expect(sections.read.map((n) => n.id)).toEqual(["3"]);
  });
});
