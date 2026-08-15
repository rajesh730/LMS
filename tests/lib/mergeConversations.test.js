jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Conversation", () => ({
  __esModule: true,
  default: { find: jest.fn(), updateOne: jest.fn(), updateMany: jest.fn() },
}));
jest.mock("@/models/Message", () => ({
  __esModule: true,
  default: { updateMany: jest.fn(), findOne: jest.fn() },
}));

import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { mergeDuplicateConversations } from "@/lib/mergeConversations";

/**
 * One thread per guardian per child.
 *
 * Conversations used to be keyed on topic, so a parent who asked about
 * "Learning" and later about "Other" produced two rows in the school's inbox
 * for the same person and the same child. This folds those back together.
 */

const SCHOOL = "school-1";
const AAYUSH = "student-aayush";
const ROHIT = "student-rohit";
const MINA = "parent-mina";
const RAMESH = "parent-ramesh";

function conversation(id, { student, parent, topic, createdAt, lastMessageAt, staffUnread = 0, originType = "PARENT_INITIATED" }) {
  return {
    _id: id,
    school: SCHOOL,
    student,
    topic,
    originType,
    routedToLabel: topic === "LEARNING" ? "Class Teacher" : "School Office",
    createdAt: new Date(createdAt),
    lastMessageAt: new Date(lastMessageAt),
    lastMessagePreview: "…",
    participants: [
      { participantType: "PARENT", parent, unreadCount: 0 },
      { participantType: "STAFF", staff: "staff-1", unreadCount: staffUnread },
    ],
  };
}

function conversationsAre(rows) {
  Conversation.find.mockReturnValue({
    sort: () => ({ lean: () => Promise.resolve(rows) }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  Conversation.updateOne.mockResolvedValue({});
  Conversation.updateMany.mockResolvedValue({});
  Message.updateMany.mockResolvedValue({});
  Message.findOne.mockReturnValue({
    sort: () => ({
      select: () => ({
        lean: () =>
          Promise.resolve({
            body: "what is sandesh?",
            senderType: "PARENT",
            createdAt: new Date("2026-08-15T12:00:00Z"),
          }),
      }),
    }),
  });
});

describe("the exact reported case", () => {
  // Mina BK appeared twice for Aayush (topic Other + topic Learning) and once
  // for Rohit. Only the first two should merge.
  function reportedCase() {
    conversationsAre([
      conversation("c-other", {
        student: AAYUSH,
        parent: MINA,
        topic: "OTHER",
        createdAt: "2026-08-15T10:00:00Z",
        lastMessageAt: "2026-08-15T11:00:00Z",
        staffUnread: 1,
      }),
      conversation("c-learning", {
        student: AAYUSH,
        parent: MINA,
        topic: "LEARNING",
        createdAt: "2026-08-15T11:30:00Z",
        lastMessageAt: "2026-08-15T12:00:00Z",
        staffUnread: 2,
      }),
      conversation("c-rohit", {
        student: ROHIT,
        parent: MINA,
        topic: "ADMINISTRATION",
        createdAt: "2026-08-15T09:00:00Z",
        lastMessageAt: "2026-08-15T09:30:00Z",
      }),
    ]);
  }

  it("merges the two threads for the SAME child", async () => {
    reportedCase();

    const result = await mergeDuplicateConversations(SCHOOL);

    expect(result.merged).toBe(1);
    // Messages move onto the oldest thread.
    expect(Message.updateMany).toHaveBeenCalledWith(
      { conversation: { $in: ["c-learning"] } },
      { $set: { conversation: "c-other" } }
    );
  });

  it("does NOT merge across children", async () => {
    reportedCase();

    await mergeDuplicateConversations(SCHOOL);

    // "Mina about Aayush" and "Mina about Rohit" are different conversations.
    const moved = Message.updateMany.mock.calls.flatMap(
      ([filter]) => filter.conversation.$in
    );
    expect(moved).not.toContain("c-rohit");
  });

  it("retires the duplicate rather than deleting it", async () => {
    reportedCase();

    await mergeDuplicateConversations(SCHOOL);

    // Soft delete keeps the history auditable.
    expect(Conversation.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ["c-learning"] } },
      { $set: { isDeleted: true } }
    );
  });

  it("adds the unread counts together", async () => {
    reportedCase();

    await mergeDuplicateConversations(SCHOOL);

    const [, update] = Conversation.updateOne.mock.calls[0];
    const staff = update.$set.participants.find(
      (p) => p.participantType === "STAFF"
    );
    // Two threads showing 1 and 2 unread were three messages nobody had read.
    expect(staff.unreadCount).toBe(3);
  });

  it("keeps the label from the most recently active thread", async () => {
    reportedCase();

    await mergeDuplicateConversations(SCHOOL);

    const [, update] = Conversation.updateOne.mock.calls[0];
    // The parent last asked about Learning, so that is what the inbox shows.
    expect(update.$set.topic).toBe("LEARNING");
    expect(update.$set.routedToLabel).toBe("Class Teacher");
  });

  it("rebuilds the preview from the genuinely newest message", async () => {
    reportedCase();

    await mergeDuplicateConversations(SCHOOL);

    const [, update] = Conversation.updateOne.mock.calls[0];
    expect(update.$set.lastMessagePreview).toBe("what is sandesh?");
    expect(update.$set.lastMessageSenderType).toBe("PARENT");
  });
});

describe("announcements fold in too", () => {
  it("merges a school announcement thread with the parent's own thread", async () => {
    conversationsAre([
      conversation("c-parent", {
        student: AAYUSH,
        parent: MINA,
        topic: "LEARNING",
        createdAt: "2026-08-15T10:00:00Z",
        lastMessageAt: "2026-08-15T10:00:00Z",
      }),
      conversation("c-announce", {
        student: AAYUSH,
        parent: MINA,
        topic: "ADMINISTRATION",
        createdAt: "2026-08-15T11:00:00Z",
        lastMessageAt: "2026-08-15T11:00:00Z",
        originType: "SCHOOL_ANNOUNCEMENT",
      }),
    ]);

    const result = await mergeDuplicateConversations(SCHOOL);

    expect(result.merged).toBe(1);
    const [, update] = Conversation.updateOne.mock.calls[0];
    // A merged thread is a real two-way conversation.
    expect(update.$set.originType).toBe("PARENT_INITIATED");
  });
});

describe("leaves clean data alone", () => {
  it("does nothing when every guardian has one thread per child", async () => {
    conversationsAre([
      conversation("c1", {
        student: AAYUSH,
        parent: MINA,
        topic: "LEARNING",
        createdAt: "2026-08-15T10:00:00Z",
        lastMessageAt: "2026-08-15T10:00:00Z",
      }),
      conversation("c2", {
        student: AAYUSH,
        parent: RAMESH,
        topic: "LEARNING",
        createdAt: "2026-08-15T10:00:00Z",
        lastMessageAt: "2026-08-15T10:00:00Z",
      }),
    ]);

    const result = await mergeDuplicateConversations(SCHOOL);

    expect(result.merged).toBe(0);
    expect(Message.updateMany).not.toHaveBeenCalled();
  });

  it("returns early with fewer than two conversations", async () => {
    conversationsAre([]);
    expect((await mergeDuplicateConversations(SCHOOL)).merged).toBe(0);
  });

  it("skips a malformed thread with no parent participant", async () => {
    conversationsAre([
      { _id: "c1", school: SCHOOL, student: AAYUSH, participants: [] },
      { _id: "c2", school: SCHOOL, student: AAYUSH, participants: [] },
    ]);

    const result = await mergeDuplicateConversations(SCHOOL);

    // Guessing which guardian it belonged to would be worse than leaving it.
    expect(result.merged).toBe(0);
  });
});

describe("never breaks the inbox", () => {
  it("swallows a database failure", async () => {
    Conversation.find.mockImplementation(() => {
      throw new Error("connection lost");
    });

    const result = await mergeDuplicateConversations(SCHOOL);

    expect(result.error).toBe(true);
    expect(result.merged).toBe(0);
  });
});
