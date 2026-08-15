jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/notifications/service", () => ({
  publishNotice: jest.fn(),
  resolveNoticeRecipients: jest.fn(),
  describeReachability: jest.requireActual("@/lib/notifications/service")
    .describeReachability,
}));
jest.mock("@/models/Notice", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("@/models/NoticeReceipt", () => ({
  __esModule: true,
  default: { find: jest.fn(), updateOne: jest.fn() },
}));
jest.mock("@/models/Parent", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/Student", () => ({ __esModule: true, default: {} }));

import { getServerSession } from "next-auth";
import Notice from "@/models/Notice";
import NoticeReceipt from "@/models/NoticeReceipt";
import { resolveNoticeRecipients } from "@/lib/notifications/service";
import { GET, PATCH } from "@/app/api/school/notices/[id]/delivery/route";

/**
 * §37, §38, §39 — honest delivery reporting.
 *
 * The rule with teeth: recording that a paper copy was handed over must NOT
 * mark the notice as read. Quietly setting `openedAt` there would corrupt the
 * school's own picture of who actually knows about a closure or a consent
 * deadline.
 */

const SCHOOL_A = "aaaaaaaaaaaaaaaaaaaaaaa1";
const SCHOOL_B = "bbbbbbbbbbbbbbbbbbbbbbb2";
const NOTICE = "8888888888888888888888n1";

function signedInAs(schoolId, role = "SCHOOL_ADMIN") {
  getServerSession.mockResolvedValue({
    user: { id: schoolId, role, schoolId },
  });
}

function context() {
  return { params: Promise.resolve({ id: NOTICE }) };
}

function recipient(overrides = {}) {
  return {
    parent: {
      _id: "parent-1",
      name: "Sita Sharma",
      accessState: "NOT_CREATED",
      email: null,
      phone: "9800000000",
      isHousehold: false,
      ...overrides.parent,
    },
    student: { _id: "student-1", name: "Aayush", grade: "Grade 8" },
    link: { canReceiveNotices: true, relationshipType: "MOTHER" },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  Notice.findById.mockReturnValue({
    lean: () =>
      Promise.resolve({
        _id: NOTICE,
        title: "Parent meeting",
        school: SCHOOL_A,
        priority: "HIGH",
      }),
  });
  NoticeReceipt.find.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve([]) }),
  });
  NoticeReceipt.updateOne.mockResolvedValue({});
  resolveNoticeRecipients.mockResolvedValue([]);
});

describe("tenant isolation (§56)", () => {
  it("School A cannot see School B's notice delivery", async () => {
    signedInAs(SCHOOL_A);
    Notice.findById.mockReturnValue({
      lean: () => Promise.resolve({ _id: NOTICE, school: SCHOOL_B }),
    });

    const res = await GET(new Request("http://localhost"), context());
    expect(res.status).toBe(404);
  });
});

describe("metrics are counted, never invented (§37)", () => {
  it("counts opened, unread and offline from real receipts", async () => {
    signedInAs(SCHOOL_A);
    resolveNoticeRecipients.mockResolvedValue([
      // Activated + opened.
      recipient({ parent: { _id: "p1", accessState: "ACTIVATED" } }),
      // Activated, not opened -> digital unread.
      recipient({ parent: { _id: "p2", accessState: "ACTIVATED" } }),
      // No app, no email -> offline follow-up.
      recipient({ parent: { _id: "p3", accessState: "NOT_CREATED" } }),
    ]);
    NoticeReceipt.find.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            { parent: "p1", student: "student-1", openedAt: new Date() },
          ]),
      }),
    });

    const res = await GET(new Request("http://localhost"), context());
    const json = await res.json();

    expect(json.data.metrics.guardians).toBe(3);
    expect(json.data.metrics.opened).toBe(1);
    expect(json.data.metrics.digitalUnread).toBe(1);
    expect(json.data.metrics.offlineFollowUp).toBe(1);
  });

  it("the follow-up list carries only what staff need to hand a sheet over", async () => {
    signedInAs(SCHOOL_A);
    resolveNoticeRecipients.mockResolvedValue([recipient()]);

    const res = await GET(new Request("http://localhost"), context());
    const json = await res.json();
    const [row] = json.data.followUp;

    expect(row.studentName).toBe("Aayush");
    expect(row.guardianName).toBe("Sita Sharma");
    // No email, no Parent ID, no portfolio data on a printed list (§38).
    expect(row).not.toHaveProperty("email");
    expect(row).not.toHaveProperty("parentIdentifier");
  });

  it("drops a guardian from follow-up once paper has been recorded", async () => {
    signedInAs(SCHOOL_A);
    resolveNoticeRecipients.mockResolvedValue([recipient()]);
    NoticeReceipt.find.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            {
              parent: "parent-1",
              student: "student-1",
              openedAt: null,
              deliveries: [{ channel: "PAPER", status: "HANDED_OVER" }],
            },
          ]),
      }),
    });

    const res = await GET(new Request("http://localhost"), context());
    const json = await res.json();

    expect(json.data.followUp).toHaveLength(0);
  });
});

describe("paper delivery is honest (§39)", () => {
  function patch(body) {
    return PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
      context()
    );
  }

  it("records the hand-over WITHOUT marking the notice read", async () => {
    signedInAs(SCHOOL_A);

    const res = await patch({
      action: "PAPER_DELIVERED",
      parentId: "parent-1",
      studentId: "student-1",
    });

    expect(res.status).toBe(200);

    const [, update] = NoticeReceipt.updateOne.mock.calls[0];
    expect(update.$push.deliveries.channel).toBe("PAPER");
    expect(update.$push.deliveries.status).toBe("HANDED_OVER");
    // THE rule: handing someone a sheet is not evidence they read it.
    expect(update.$set?.openedAt).toBeUndefined();
    expect(JSON.stringify(update)).not.toContain("openedAt");
  });

  it("records who handed it over", async () => {
    signedInAs(SCHOOL_A);
    await patch({
      action: "PAPER_DELIVERED",
      parentId: "parent-1",
      studentId: "student-1",
    });

    const [, update] = NoticeReceipt.updateOne.mock.calls[0];
    expect(update.$push.deliveries.recordedBy).toBe(SCHOOL_A);
  });

  it("marks an in-person acknowledgement as staff-recorded, not self-served", async () => {
    signedInAs(SCHOOL_A);

    await patch({
      action: "ACKNOWLEDGED_IN_PERSON",
      parentId: "parent-1",
      studentId: "student-1",
    });

    const [filter, update] = NoticeReceipt.updateOne.mock.calls[0];
    // Only stamps a receipt that was never acknowledged — first wins.
    expect(filter.acknowledgedAt).toBeNull();
    expect(update.$set.acknowledgementMethod).toBe("IN_PERSON");
    expect(update.$set.acknowledgementRecordedBy).toBe(SCHOOL_A);
  });

  it("requires both a parent and a student", async () => {
    signedInAs(SCHOOL_A);
    const res = await patch({ action: "PAPER_DELIVERED" });
    expect(res.status).toBe(400);
    expect(NoticeReceipt.updateOne).not.toHaveBeenCalled();
  });
});
