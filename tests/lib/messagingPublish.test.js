jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/realtimeBus", () => ({
  publishRealtimeEvent: jest.fn(),
}));
jest.mock("@/models/Conversation", () => ({
  __esModule: true,
  default: { updateOne: jest.fn(), findById: jest.fn() },
  CONVERSATION_TOPICS: ["LEARNING", "OTHER"],
}));
jest.mock("@/models/Message", () => ({
  __esModule: true,
  default: { create: jest.fn(), updateMany: jest.fn() },
}));
jest.mock("@/models/SchoolConfig", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/User", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/Teacher", () => ({ __esModule: true, default: {} }));

import { publishRealtimeEvent } from "@/lib/realtimeBus";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { appendMessage, publishThreadRead } from "@/lib/parentMessaging";

/**
 * Realtime publishing must never disturb messaging.
 *
 * This exists because of a real regression: `publishRealtimeEvent` is
 * SYNCHRONOUS and returns undefined, but the publish calls were written as
 * `publishRealtimeEvent(...).catch(...)`. Every thread load and every send
 * threw `Cannot read properties of undefined (reading 'catch')` and surfaced
 * to the parent as "Failed to load conversation".
 *
 * The lesson the tests encode: a message that has already been written to the
 * database must survive anything the notification layer does.
 */

const CONVERSATION = {
  _id: "conv-1",
  school: "school-1",
  student: "student-1",
  participants: [
    { participantType: "PARENT", parent: "parent-1", unreadCount: 0 },
    { participantType: "STAFF", staff: "staff-1", unreadCount: 0 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  Conversation.updateOne.mockResolvedValue({});
  Message.create.mockResolvedValue({ _id: "m1", createdAt: new Date() });
});

describe("appendMessage", () => {
  it("publishes to the school and to each parent participant", async () => {
    await appendMessage({
      conversation: CONVERSATION,
      senderType: "PARENT",
      senderParent: "parent-1",
      senderName: "Sita Sharma",
      body: "Hello",
    });

    const channels = publishRealtimeEvent.mock.calls.map(([channel]) => channel);
    expect(channels).toContain("school-messages:school-1");
    expect(channels).toContain("parent-messages:parent-1");
  });

  it("returns the saved message even when publishing THROWS", async () => {
    // The regression, generalised: the bus blowing up must not lose a message
    // that is already in the database.
    publishRealtimeEvent.mockImplementation(() => {
      throw new Error("redis is on fire");
    });

    const message = await appendMessage({
      conversation: CONVERSATION,
      senderType: "PARENT",
      senderParent: "parent-1",
      senderName: "Sita Sharma",
      body: "Hello",
    });

    expect(message._id).toBe("m1");
    expect(Message.create).toHaveBeenCalled();
  });

  it("does not treat the publish result as a promise", async () => {
    // publishRealtimeEvent is synchronous and returns undefined. Calling
    // .catch()/.then() on it is the exact bug this guards.
    publishRealtimeEvent.mockReturnValue(undefined);

    await expect(
      appendMessage({
        conversation: CONVERSATION,
        senderType: "STAFF",
        senderStaff: "staff-1",
        senderName: "School",
        body: "Reply",
      })
    ).resolves.toBeTruthy();
  });
});

describe("publishThreadRead", () => {
  it("announces the read on both sides", () => {
    publishThreadRead({ conversation: CONVERSATION, reader: "PARENT" });

    const channels = publishRealtimeEvent.mock.calls.map(([channel]) => channel);
    expect(channels).toContain("school-messages:school-1");
    expect(channels).toContain("parent-messages:parent-1");

    const [, event] = publishRealtimeEvent.mock.calls[0];
    expect(event.reader).toBe("PARENT");
    // Carries no message content — only the fact that it was read.
    expect(event).not.toHaveProperty("body");
  });

  it("never throws, whatever the bus does", () => {
    publishRealtimeEvent.mockImplementation(() => {
      throw new Error("bus down");
    });

    expect(() =>
      publishThreadRead({ conversation: CONVERSATION, reader: "STAFF" })
    ).not.toThrow();
  });

  it("tolerates a conversation with no parent participant", () => {
    expect(() =>
      publishThreadRead({
        conversation: { _id: "c", school: "s", participants: [] },
        reader: "STAFF",
      })
    ).not.toThrow();
  });
});
