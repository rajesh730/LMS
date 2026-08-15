jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/parentAccess", () => ({ requireParentChild: jest.fn() }));
jest.mock("@/lib/parentNotifications", () => ({
  notifyGuardians: jest.fn().mockResolvedValue({ sent: 0 }),
}));
jest.mock("@/lib/parentNotices", () => ({
  buildNoticeQuery: jest.fn(() => ({ isActive: true })),
  decorateNotice: jest.fn((notice) => ({ id: String(notice._id) })),
  listNoticesForStudent: jest.fn(),
  sectionNotices: jest.fn(() => ({ actionRequired: [], unread: [], read: [] })),
  markNoticeOpened: jest.fn(),
  recordAcknowledgement: jest.fn(),
  recordConsent: jest.fn(),
  getGuardianReadStates: jest.fn(() => []),
}));
jest.mock("@/models/Notice", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

import { requireParentChild } from "@/lib/parentAccess";
import {
  markNoticeOpened,
  recordAcknowledgement,
  recordConsent,
  listNoticesForStudent,
} from "@/lib/parentNotices";
import Notice from "@/models/Notice";
import { errorResponse } from "@/lib/apiResponse";
import { GET as LIST } from "@/app/api/parent/notices/route";
import { GET as DETAIL } from "@/app/api/parent/notices/[id]/route";
import { POST as RESPOND } from "@/app/api/parent/notices/[id]/respond/route";

const NOTICE = "8888888888888888888888n1";
const AAYUSH = "1111111111111111111111a1";
const SCHOOL = "5555555555555555555555s1";

function detailContext() {
  return { params: Promise.resolve({ id: NOTICE }) };
}

/**
 * Stub Notice.findOne for both call shapes in the routes: the detail route
 * calls `.lean()` directly, the respond route calls `.select(...).lean()`.
 */
function noticeIs(value) {
  Notice.findOne.mockReturnValue({
    lean: () => Promise.resolve(value),
    select: () => ({ lean: () => Promise.resolve(value) }),
  });
}

function authorised() {
  requireParentChild.mockResolvedValue({
    parent: { _id: "parent-1", name: "Sita Sharma" },
    student: { _id: AAYUSH, name: "Aayush", grade: "Grade 8", school: SCHOOL },
    link: { relationshipType: "MOTHER" },
    permissions: { canGiveConsent: true, canReceiveNotices: true },
    context: {
      studentId: AAYUSH,
      schoolId: SCHOOL,
      schoolName: "Green Village",
      permissions: { canGiveConsent: true },
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  markNoticeOpened.mockResolvedValue({ openedAt: new Date() });
  recordAcknowledgement.mockResolvedValue({ acknowledgedAt: new Date() });
  recordConsent.mockResolvedValue({
    consentDecision: "YES",
    consentDecidedAt: new Date(),
  });
  listNoticesForStudent.mockResolvedValue({ notices: [], total: 0 });
});

describe("GET /api/parent/notices (list)", () => {
  it("never marks anything opened", async () => {
    authorised();

    await LIST(new Request("http://localhost/api/parent/notices?studentId=" + AAYUSH));

    expect(listNoticesForStudent).toHaveBeenCalled();
    expect(markNoticeOpened).not.toHaveBeenCalled();
  });

  it("requires the canReceiveNotices permission", async () => {
    requireParentChild.mockResolvedValue({
      error: errorResponse(403, "No", "PERMISSION_DENIED"),
    });

    const res = await LIST(new Request("http://localhost/api/parent/notices"));

    expect(res.status).toBe(403);
    expect(requireParentChild).toHaveBeenCalledWith(null, "canReceiveNotices");
  });
});

describe("GET /api/parent/notices/[id] (detail)", () => {
  it("records the open AFTER confirming the notice reaches this child", async () => {
    authorised();
    noticeIs({ _id: NOTICE, title: "Meeting", content: "Body" });

    const res = await DETAIL(
      new Request(`http://localhost/api/parent/notices/${NOTICE}?studentId=${AAYUSH}`),
      detailContext()
    );

    expect(res.status).toBe(200);
    expect(markNoticeOpened).toHaveBeenCalledWith(
      expect.objectContaining({ noticeId: NOTICE, parentId: "parent-1" })
    );
  });

  it("does NOT record an open for a notice this child was never sent", async () => {
    authorised();
    noticeIs(null);

    const res = await DETAIL(
      new Request(`http://localhost/api/parent/notices/${NOTICE}?studentId=${AAYUSH}`),
      detailContext()
    );

    expect(res.status).toBe(404);
    // A probe with a known notice id must not create a receipt.
    expect(markNoticeOpened).not.toHaveBeenCalled();
  });
});

describe("POST /api/parent/notices/[id]/respond", () => {
  function respondRequest(body) {
    return new Request(`http://localhost/api/parent/notices/${NOTICE}/respond`, {
      method: "POST",
      body: JSON.stringify({ studentId: AAYUSH, ...body }),
    });
  }

  it("gates CONSENT behind canGiveConsent", async () => {
    requireParentChild.mockResolvedValue({
      error: errorResponse(403, "Not allowed", "PERMISSION_DENIED"),
    });

    const res = await RESPOND(
      respondRequest({ action: "CONSENT", decision: "YES" }),
      detailContext()
    );

    expect(res.status).toBe(403);
    expect(requireParentChild).toHaveBeenCalledWith(AAYUSH, "canGiveConsent");
    expect(recordConsent).not.toHaveBeenCalled();
  });

  it("does NOT gate ACKNOWLEDGE behind consent rights", async () => {
    authorised();
    noticeIs({ _id: NOTICE, title: "N", requiresAcknowledgement: true });

    const res = await RESPOND(
      respondRequest({ action: "ACKNOWLEDGE" }),
      detailContext()
    );

    expect(res.status).toBe(200);
    // Confirming you read something is not acting on the child's behalf.
    expect(requireParentChild).toHaveBeenCalledWith(AAYUSH, null);
  });

  it("rejects an unknown action", async () => {
    const res = await RESPOND(
      respondRequest({ action: "DELETE_EVERYTHING" }),
      detailContext()
    );
    expect(res.status).toBe(400);
  });

  it("rejects consent on a notice that does not ask for it", async () => {
    authorised();
    noticeIs({ _id: NOTICE, title: "N", requiresConsent: false });

    const res = await RESPOND(
      respondRequest({ action: "CONSENT", decision: "YES" }),
      detailContext()
    );

    expect(res.status).toBe(400);
    expect(recordConsent).not.toHaveBeenCalled();
  });

  it("rejects a decision that is neither YES nor NO", async () => {
    authorised();
    noticeIs({ _id: NOTICE, title: "N", requiresConsent: true });

    const res = await RESPOND(
      respondRequest({ action: "CONSENT", decision: "MAYBE" }),
      detailContext()
    );

    expect(res.status).toBe(400);
  });

  it("records a valid consent decision", async () => {
    authorised();
    noticeIs({ _id: NOTICE, title: "Excursion", requiresConsent: true });

    const res = await RESPOND(
      respondRequest({ action: "CONSENT", decision: "NO" }),
      detailContext()
    );

    expect(res.status).toBe(200);
    expect(recordConsent).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "NO", parentId: "parent-1" })
    );
  });
});
