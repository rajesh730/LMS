jest.mock("@/lib/parentAccess", () => ({
  requireParentSession: jest.fn(),
}));
jest.mock("@/lib/parentNotifications", () => ({
  listParentNotifications: jest.fn(),
  countUnreadParentNotifications: jest.fn(),
  markParentNotificationsSeen: jest.fn(),
  markParentNotificationRead: jest.fn(),
  markAllParentNotificationsRead: jest.fn(),
}));

import { requireParentSession } from "@/lib/parentAccess";
import {
  listParentNotifications,
  countUnreadParentNotifications,
  markParentNotificationsSeen,
  markParentNotificationRead,
  markAllParentNotificationsRead,
} from "@/lib/parentNotifications";
import { GET as LIST } from "@/app/api/notifications/route";
import { GET as COUNT } from "@/app/api/notifications/unread-count/route";
import { PATCH as SEEN } from "@/app/api/notifications/mark-seen/route";
import { PATCH as READ } from "@/app/api/notifications/[id]/read/route";
import { PATCH as READ_ALL } from "@/app/api/notifications/mark-all-read/route";

const PARENT_ID = "aaaaaaaaaaaaaaaaaaaaaaa1";
const NOTIFICATION_ID = "111111111111111111111111";

beforeEach(() => {
  jest.clearAllMocks();
  requireParentSession.mockResolvedValue({ parent: { _id: PARENT_ID } });
  listParentNotifications.mockResolvedValue({
    notifications: [],
    unreadCount: 0,
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
  });
  countUnreadParentNotifications.mockResolvedValue(3);
  markParentNotificationsSeen.mockResolvedValue({ updated: 3 });
  markParentNotificationRead.mockResolvedValue({ found: true, updated: 1 });
  markAllParentNotificationsRead.mockResolvedValue({ updated: 4 });
});

it("lists only through the signed-in parent's service scope", async () => {
  const response = await LIST(
    new Request("http://localhost/api/notifications?page=2&limit=500")
  );

  expect(response.status).toBe(200);
  expect(listParentNotifications).toHaveBeenCalledWith({
    parentId: PARENT_ID,
    page: 2,
    limit: 50,
  });
});

it("returns the parent's unread count", async () => {
  const response = await COUNT();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(countUnreadParentNotifications).toHaveBeenCalledWith({
    parentId: PARENT_ID,
  });
  expect(json.data.unreadCount).toBe(3);
});

it("marks UNREAD notifications SEEN for the signed-in parent", async () => {
  const response = await SEEN();
  expect(response.status).toBe(200);
  expect(markParentNotificationsSeen).toHaveBeenCalledWith({
    parentId: PARENT_ID,
  });
});

it("marks one owned notification READ", async () => {
  const response = await READ(new Request("http://localhost"), {
    params: Promise.resolve({ id: NOTIFICATION_ID }),
  });

  expect(response.status).toBe(200);
  expect(markParentNotificationRead).toHaveBeenCalledWith({
    parentId: PARENT_ID,
    notificationId: NOTIFICATION_ID,
  });
});

it("makes another parent's notification indistinguishable from a missing one", async () => {
  markParentNotificationRead.mockResolvedValue({ found: false, updated: 0 });

  const response = await READ(new Request("http://localhost"), {
    params: Promise.resolve({ id: NOTIFICATION_ID }),
  });

  expect(response.status).toBe(404);
});

it("marks every accessible notification READ", async () => {
  const response = await READ_ALL();
  expect(response.status).toBe(200);
  expect(markAllParentNotificationsRead).toHaveBeenCalledWith({
    parentId: PARENT_ID,
  });
});

it("does not call notification data services without a parent session", async () => {
  requireParentSession.mockResolvedValue({
    error: new Response(null, { status: 401 }),
  });

  const response = await COUNT();
  expect(response.status).toBe(401);
  expect(countUnreadParentNotifications).not.toHaveBeenCalled();
});
