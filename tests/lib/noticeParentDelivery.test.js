jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Notice", () => ({
  __esModule: true,
  default: { findById: jest.fn(), updateOne: jest.fn() },
}));
jest.mock("@/models/NoticeReceipt", () => ({
  __esModule: true,
  default: { bulkWrite: jest.fn() },
}));
jest.mock("@/models/ParentStudentLink", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/Parent", () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock("@/models/Student", () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock("@/models/User", () => ({ __esModule: true, default: { findById: jest.fn() } }));
jest.mock("@/lib/notifications/channels", () => ({
  InAppNotificationChannel: class {},
  ParentInboxChannel: class {},
  EmailNotificationChannel: class {},
  OfflineDeliveryChannel: class {},
  SmsNotificationChannel: class {},
}));

import Notice from "@/models/Notice";
import ParentStudentLink from "@/models/ParentStudentLink";
import Student from "@/models/Student";
import { publishNoticeToParents } from "@/lib/notifications/service";

/**
 * "Students and parents" has to actually reach parents — exactly once.
 *
 * Two failures this guards against, both silent:
 *
 *  1. Choosing the parents option and nothing being sent. Setting the flag only
 *     made a notice VISIBLE in the Parent App's Notice Centre; a guardian who
 *     did not go looking was never told, which is not what a school means by
 *     publishing.
 *  2. The same notice arriving twice in the parent's bell, because the school
 *     also pressed "Deliver" on the delivery page, or edited a typo.
 */

const NOTICE_ID = "8888888888888888888888n1";

function noticeIs(overrides = {}) {
  Notice.findById.mockReturnValue({
    select: () => ({
      lean: () =>
        Promise.resolve({
          _id: NOTICE_ID,
          status: "PUBLISHED",
          targetAudience: { students: true, teachers: false, parents: true },
          parentsNotifiedAt: null,
          isDeleted: false,
          ...overrides,
        }),
    }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  Notice.updateOne.mockResolvedValue({});
  // No students match, so publishNotice returns early without touching the
  // channels — this suite is about the GUARD, not the fan-out.
  Student.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) });
  ParentStudentLink.find.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve([]) }),
  });
});

describe("delivering a notice to parents", () => {
  it("delivers a published notice addressed to parents", async () => {
    noticeIs();
    // A second findById inside publishNotice returns the full document.
    Notice.findById
      .mockReturnValueOnce({
        select: () => ({
          lean: () =>
            Promise.resolve({
              _id: NOTICE_ID,
              status: "PUBLISHED",
              targetAudience: { students: true, parents: true },
              parentsNotifiedAt: null,
              isDeleted: false,
            }),
        }),
      })
      .mockReturnValueOnce({
        lean: () =>
          Promise.resolve({
            _id: NOTICE_ID,
            school: "school-1",
            priority: "NORMAL",
            targetAudience: { students: true, parents: true },
          }),
      });

    const result = await publishNoticeToParents(NOTICE_ID);
    expect(result.ok).toBe(true);
  });

  it("does nothing for a students-only notice", async () => {
    noticeIs({ targetAudience: { students: true, teachers: false, parents: false } });

    const result = await publishNoticeToParents(NOTICE_ID);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Not addressed to parents");
    expect(Notice.updateOne).not.toHaveBeenCalled();
  });

  it("does nothing for a draft", async () => {
    // A draft is not published to anyone yet — saving one must never notify.
    noticeIs({ status: "DRAFT" });

    const result = await publishNoticeToParents(NOTICE_ID);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Not published");
  });

  it("refuses to deliver the same notice twice", async () => {
    // The guard that stops an edit — or the delivery page's own button —
    // putting a duplicate in every guardian's notification bell.
    noticeIs({ parentsNotifiedAt: new Date("2026-08-16T10:00:00Z") });

    const result = await publishNoticeToParents(NOTICE_ID);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Already delivered");
  });

  it("does nothing for an archived notice", async () => {
    noticeIs({ isDeleted: true });

    const result = await publishNoticeToParents(NOTICE_ID);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Notice is archived");
  });

  it("never throws — publishing must not fail on a delivery error", async () => {
    Notice.findById.mockImplementation(() => {
      throw new Error("database down");
    });

    // The notice is already saved by the time this runs. Surfacing the failure
    // would turn a successful publish into an error the school has to retry.
    await expect(publishNoticeToParents(NOTICE_ID)).resolves.toEqual({
      ok: false,
      reason: "database down",
    });
  });

  it("treats a missing notice as a no-op rather than a crash", async () => {
    Notice.findById.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(null) }),
    });

    const result = await publishNoticeToParents(NOTICE_ID);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Notice not found");
  });
});
