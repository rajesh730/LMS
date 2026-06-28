jest.mock("@/models/UserNotification", () => ({
  __esModule: true,
  default: { insertMany: jest.fn().mockResolvedValue([]) },
}));

jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

jest.mock("@/lib/realtimeBus", () => ({
  publishRealtimeEvent: jest.fn(),
}));

jest.mock("@/lib/workIndicatorRealtime", () => ({
  publishWorkIndicatorsUpdate: jest.fn(),
}));

import UserNotification from "@/models/UserNotification";
import User from "@/models/User";
import { publishRealtimeEvent } from "@/lib/realtimeBus";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";
import {
  notifyReleaseRequested,
  notifyReleaseApproved,
  notifyAdmissionRequested,
  notifyAdmissionApproved,
  notifyTransferRejected,
} from "@/lib/transferNotifications";

const insertedDocs = () => UserNotification.insertMany.mock.calls[0][0];

const baseTransfer = {
  _id: "t1",
  student: "stu1",
  fromSchool: "fromSchool",
  toSchool: "toSchool",
  studentNameSnapshot: "Tek Baral",
  transferCode: "TR-123456",
  status: "RELEASED",
};

describe("transferNotifications routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ schoolName: "New School" }) }),
    });
  });

  it("release requested → notifies the current (from) school only", async () => {
    await notifyReleaseRequested({ transfer: baseTransfer });

    const docs = insertedDocs();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      targetRole: "SCHOOL_ADMIN",
      recipientUser: "fromSchool",
      school: "fromSchool",
      category: "TRANSFER",
    });
    expect(publishRealtimeEvent).toHaveBeenCalledWith(
      "school-notifications",
      expect.objectContaining({ kind: "transfer-release-requested" })
    );
    expect(publishRealtimeEvent).not.toHaveBeenCalledWith(
      "student-notifications",
      expect.anything()
    );
    expect(publishWorkIndicatorsUpdate).toHaveBeenCalled();
  });

  it("release approved → notifies the student with the code", async () => {
    await notifyReleaseApproved({ transfer: baseTransfer });

    const docs = insertedDocs();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      targetRole: "STUDENT",
      recipientStudent: "stu1",
      category: "TRANSFER",
    });
    expect(docs[0].message).toContain("TR-123456");
    expect(publishRealtimeEvent).toHaveBeenCalledWith(
      "student-notifications",
      expect.anything()
    );
  });

  it("admission requested → notifies the destination (to) school", async () => {
    await notifyAdmissionRequested({ transfer: baseTransfer });

    const docs = insertedDocs();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      targetRole: "SCHOOL_ADMIN",
      recipientUser: "toSchool",
      school: "toSchool",
    });
  });

  it("admission approved → notifies the student and the origin school", async () => {
    await notifyAdmissionApproved({ transfer: baseTransfer });

    const docs = insertedDocs();
    expect(docs).toHaveLength(2);
    const roles = docs.map((d) => d.targetRole).sort();
    expect(roles).toEqual(["SCHOOL_ADMIN", "STUDENT"]);
    const studentDoc = docs.find((d) => d.targetRole === "STUDENT");
    expect(studentDoc.message).toContain("New School");
    expect(publishRealtimeEvent).toHaveBeenCalledWith(
      "student-notifications",
      expect.anything()
    );
    expect(publishRealtimeEvent).toHaveBeenCalledWith(
      "school-notifications",
      expect.anything()
    );
  });

  it("rejection (release) → notifies the student with the reason", async () => {
    await notifyTransferRejected({
      transfer: baseTransfer,
      type: "release",
      reason: "Dues pending",
    });

    const docs = insertedDocs();
    expect(docs).toHaveLength(1);
    expect(docs[0].targetRole).toBe("STUDENT");
    expect(docs[0].message).toContain("Dues pending");
  });

  it("rejection (admission) → notifies the student and the origin school", async () => {
    await notifyTransferRejected({ transfer: baseTransfer, type: "admission" });

    const docs = insertedDocs();
    expect(docs).toHaveLength(2);
    expect(docs.map((d) => d.targetRole).sort()).toEqual([
      "SCHOOL_ADMIN",
      "STUDENT",
    ]);
  });

  it("does nothing when there is no transfer", async () => {
    await notifyReleaseApproved({});
    expect(UserNotification.insertMany).not.toHaveBeenCalled();
  });
});
