jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Parent", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/ParentStudentLink", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/UserNotification", () => ({
  __esModule: true,
  USER_NOTIFICATION_STATUSES: ["UNREAD", "SEEN", "READ"],
  USER_NOTIFICATION_TYPES: [
    "MESSAGE",
    "NOTICE",
    "EVENT",
    "ACHIEVEMENT",
    "ATTENDANCE",
    "PAYMENT",
    "HOMEWORK",
    "RESULT",
    "CONSENT",
    "MAGAZINE",
    "TRANSFER",
    "WRITING",
    "GENERAL",
  ],
  default: {
    bulkWrite: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));
jest.mock("@/lib/webPush", () => ({
  sendPushNotifications: jest.fn(),
}));
jest.mock("@/lib/realtimeBus", () => ({
  publishRealtimeEvent: jest.fn(),
}));

import Parent from "@/models/Parent";
import Student from "@/models/Student";
import ParentStudentLink from "@/models/ParentStudentLink";
import UserNotification from "@/models/UserNotification";
import { sendPushNotifications } from "@/lib/webPush";
import { publishRealtimeEvent } from "@/lib/realtimeBus";
import {
  createParentNotificationsForTargets,
  normalizeNotificationActionUrl,
  notifyGuardians,
} from "@/lib/parentNotifications";

function selectedLean(rows) {
  return {
    select: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(rows) })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  Parent.find.mockReturnValue(
    selectedLean([{ _id: "parent-2", authVersion: 0 }])
  );
  Student.find.mockReturnValue(
    selectedLean([{ _id: "student-1", name: "Aayush", school: "school-1" }])
  );
  ParentStudentLink.find.mockImplementation((query) => {
    if (query.student === "student-1") {
      return selectedLean(
        [{ parent: "parent-1" }, { parent: "parent-2" }].filter((link) =>
          query.parent?.$in ? query.parent.$in.includes(link.parent) : true
        )
      );
    }
    return selectedLean([
      {
        parent: "parent-2",
        student: "student-1",
        canMessageSchool: true,
      },
    ]);
  });
  UserNotification.bulkWrite.mockResolvedValue({});
  UserNotification.find.mockImplementation(() => ({
    select: () => ({
      lean: async () => {
        const operations = UserNotification.bulkWrite.mock.calls[0]?.[0] || [];
        return operations.map(
          (operation) => operation.updateOne.update.$setOnInsert
        );
      },
    }),
  }));
  sendPushNotifications.mockResolvedValue({ sent: 1 });
});

it("keeps a selected-parent message and every delivery signal inside the exact audience", async () => {
  const result = await notifyGuardians({
    studentId: "student-1",
    includeParentIds: ["parent-2"],
    enforceCategoryPermission: false,
    category: "MESSAGE",
    title: "Message from school",
    message: "Please call the office.",
    href: "/parent/messages/thread-1",
    entityId: "message-1",
    dedupeKey: "MESSAGE:message-1",
  });

  expect(ParentStudentLink.find).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      student: "student-1",
      parent: { $in: ["parent-2"] },
    })
  );
  expect(result.sent).toBe(1);

  const [[operations]] = UserNotification.bulkWrite.mock.calls;
  const document = operations[0].updateOne.update.$setOnInsert;
  expect(document).toEqual(
    expect.objectContaining({
      recipientParent: "parent-2",
      recipientStudent: "student-1",
      school: "school-1",
      type: "MESSAGE",
      status: "UNREAD",
      actionUrl: "/parent/messages/thread-1",
      entityId: "message-1",
    })
  );
  expect(document.dedupeKey).toBe(
    "MESSAGE:message-1:PARENT:parent-2:student-1"
  );
  expect(sendPushNotifications).toHaveBeenCalledWith([
    expect.objectContaining({
      parentId: "parent-2",
      href: "/parent/messages/thread-1",
    }),
  ]);
  expect(publishRealtimeEvent).toHaveBeenCalledWith(
    "parent-notifications:parent-2",
    expect.objectContaining({ type: "notification:new" })
  );
});

it("drops a target when there is no active parent-child link", async () => {
  ParentStudentLink.find.mockReturnValue(selectedLean([]));

  const result = await createParentNotificationsForTargets({
    targets: [{ parentId: "parent-2", studentId: "student-1" }],
    type: "NOTICE",
    title: "School notice",
    body: "School will close early.",
    actionUrl: "/parent/notices/notice-1",
  });

  expect(result).toEqual({ sent: 0, notificationIds: [] });
  expect(UserNotification.bulkWrite).not.toHaveBeenCalled();
  expect(sendPushNotifications).not.toHaveBeenCalled();
  expect(publishRealtimeEvent).not.toHaveBeenCalled();
});

it("never lets an external action URL reach a parent or service worker", () => {
  expect(normalizeNotificationActionUrl("https://evil.example/steal")).toBe(
    "/parent/notifications"
  );
  expect(normalizeNotificationActionUrl("//evil.example/steal")).toBe(
    "/parent/notifications"
  );
  expect(normalizeNotificationActionUrl("/parent/notices/n1")).toBe(
    "/parent/notices/n1"
  );
});
