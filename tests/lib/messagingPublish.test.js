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

/**
 * The subject a school types must reach the parent.
 *
 * The bug these encode: the subject was stored on the CONVERSATION and only at
 * creation time. A guardian keeps one thread per child for years, so the school
 * typed "Sports day", "Fee reminder", "School closed Friday" — and every one
 * after the very first was dropped on the floor. The parent saw bare message
 * bodies with no headline at all.
 */
describe("message subject", () => {
  it("stores the subject on the message, not just the thread", async () => {
    await appendMessage({
      conversation: CONVERSATION,
      senderType: "STAFF",
      senderStaff: "staff-1",
      senderName: "Green Village",
      subject: "Sports day",
      body: "Please send a water bottle.",
    });

    const [doc] = Message.create.mock.calls[0];
    expect(doc.subject).toBe("Sports day");
    expect(doc.body).toBe("Please send a water bottle.");
  });

  it("keeps working on the second, third and hundredth announcement", async () => {
    // The thread already exists — this is exactly the path that used to lose
    // the subject, because nothing was being created.
    await appendMessage({
      conversation: CONVERSATION,
      senderType: "STAFF",
      senderStaff: "staff-1",
      senderName: "Green Village",
      subject: "Fee reminder",
      body: "Term fees are due on Friday.",
    });

    const [doc] = Message.create.mock.calls[0];
    expect(doc.subject).toBe("Fee reminder");

    const [, update] = Conversation.updateOne.mock.calls[0];
    // Denormalised onto the thread so the inbox row can show it in one query.
    expect(update.$set.subject).toBe("Fee reminder");
  });

  it("does not let an ordinary reply blank the headline", async () => {
    await appendMessage({
      conversation: CONVERSATION,
      senderType: "PARENT",
      senderParent: "parent-1",
      senderName: "Sita Sharma",
      body: "Thank you, we will send one.",
    });

    const [doc] = Message.create.mock.calls[0];
    expect(doc.subject).toBe("");

    // A reply carries no subject, and must NOT overwrite the announcement's —
    // otherwise answering "Sports day" strips its heading off the inbox.
    const [, update] = Conversation.updateOne.mock.calls[0];
    expect(update.$set).not.toHaveProperty("subject");
  });

  it("caps a subject at the field's limit rather than failing the write", async () => {
    await appendMessage({
      conversation: CONVERSATION,
      senderType: "STAFF",
      senderStaff: "staff-1",
      subject: "x".repeat(400),
      body: "Body",
    });

    const [doc] = Message.create.mock.calls[0];
    expect(doc.subject).toHaveLength(200);
  });

  it("carries the subject on the realtime event", async () => {
    await appendMessage({
      conversation: CONVERSATION,
      senderType: "STAFF",
      senderStaff: "staff-1",
      subject: "School closed Friday",
      body: "Heavy rain.",
    });

    const [, event] = publishRealtimeEvent.mock.calls[0];
    expect(event.subject).toBe("School closed Friday");
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
