jest.mock("web-push", () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
  },
}));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Parent", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/PushSubscription", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    deleteMany: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

import webPush from "web-push";
import Parent from "@/models/Parent";
import PushSubscription from "@/models/PushSubscription";
import { sendPushNotifications } from "@/lib/webPush";

function selectedLean(rows) {
  return {
    select: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(rows) })),
  };
}

const originalEnv = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
  subject: process.env.VAPID_SUBJECT,
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
  process.env.VAPID_PRIVATE_KEY = "private-key";
  process.env.VAPID_SUBJECT = "mailto:test@pravyo.example";
  Parent.find.mockReturnValue(selectedLean([{ _id: "parent-1", authVersion: 4 }]));
  PushSubscription.find.mockReturnValue(
    selectedLean([
      {
        parent: "parent-1",
        endpoint: "https://push.example/device-1",
        keys: { p256dh: "key-1", auth: "auth-1" },
        authVersion: 4,
      },
      {
        parent: "parent-1",
        endpoint: "https://push.example/device-2",
        keys: { p256dh: "key-2", auth: "auth-2" },
        authVersion: 4,
      },
    ])
  );
  PushSubscription.deleteMany.mockResolvedValue({ deletedCount: 0 });
  PushSubscription.deleteOne.mockResolvedValue({ deletedCount: 0 });
  webPush.sendNotification.mockResolvedValue({ statusCode: 201 });
});

afterAll(() => {
  if (originalEnv.publicKey === undefined) {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  } else {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalEnv.publicKey;
  }
  if (originalEnv.privateKey === undefined) {
    delete process.env.VAPID_PRIVATE_KEY;
  } else {
    process.env.VAPID_PRIVATE_KEY = originalEnv.privateKey;
  }
  if (originalEnv.subject === undefined) {
    delete process.env.VAPID_SUBJECT;
  } else {
    process.env.VAPID_SUBJECT = originalEnv.subject;
  }
});

it("sends one parent notification to every current device", async () => {
  const result = await sendPushNotifications([
    {
      parentId: "parent-1",
      notificationId: "notification-1",
      title: "New message",
      body: "Please call the office.",
      href: "/parent/messages/thread-1",
      createdAt: "2026-09-08T10:00:00.000Z",
    },
  ]);

  expect(result.sent).toBe(2);
  expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
  const payload = JSON.parse(webPush.sendNotification.mock.calls[0][1]);
  expect(payload).toEqual(
    expect.objectContaining({
      notificationId: "notification-1",
      href: "/parent/messages/thread-1",
      createdAt: "2026-09-08T10:00:00.000Z",
    })
  );
});

it("deletes stale credential generations instead of pushing private text", async () => {
  PushSubscription.find.mockReturnValue(
    selectedLean([
      {
        parent: "parent-1",
        endpoint: "https://push.example/old-device",
        keys: { p256dh: "old-key", auth: "old-auth" },
        authVersion: 3,
      },
    ])
  );

  const result = await sendPushNotifications([
    {
      parentId: "parent-1",
      notificationId: "notification-1",
      title: "Private notice",
      body: "For this family only",
    },
  ]);

  expect(result.sent).toBe(0);
  expect(webPush.sendNotification).not.toHaveBeenCalled();
  expect(PushSubscription.deleteMany).toHaveBeenCalledWith({
    endpoint: { $in: ["https://push.example/old-device"] },
  });
});

it("sanitizes an external deep link before it reaches the service worker", async () => {
  await sendPushNotifications([
    {
      parentId: "parent-1",
      notificationId: "notification-1",
      title: "New notice",
      body: "Open it",
      href: "https://evil.example/steal",
    },
  ]);

  const payload = JSON.parse(webPush.sendNotification.mock.calls[0][1]);
  expect(payload.href).toBe("/parent/notifications");
});
