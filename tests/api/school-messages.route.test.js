jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/parentMessaging", () => ({
  appendMessage: jest.fn().mockResolvedValue({ _id: "m1" }),
  // Publishes the live "seen" event. Stubbed so the realtime bus is not
  // exercised here — its own behaviour is covered in messagingChannels tests.
  publishThreadRead: jest.fn(),
  TOPIC_CATALOGUE: [
    { topic: "LEARNING", emoji: "🎓", defaultLabel: "Learning" },
  ],
}));
jest.mock("@/lib/parentNotifications", () => ({
  notifyGuardians: jest.fn().mockResolvedValue({ sent: 1 }),
}));
jest.mock("@/models/Conversation", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    updateOne: jest.fn(),
  },
}));
jest.mock("@/models/Message", () => ({
  __esModule: true,
  default: { find: jest.fn(), updateMany: jest.fn() },
}));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("@/models/Parent", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/Student", () => ({ __esModule: true, default: {} }));

import { getServerSession } from "next-auth";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";
import { appendMessage, publishThreadRead } from "@/lib/parentMessaging";
import { GET as INBOX } from "@/app/api/school/messages/route";
import {
  GET as THREAD,
  POST as REPLY,
} from "@/app/api/school/messages/[id]/route";

/**
 * The staff inbox closes the loop on parent messaging. Its two risks are
 * cross-tenant leakage and mis-attributing a reply to an individual member of
 * staff, so both are pinned here.
 */

const SCHOOL_A = "aaaaaaaaaaaaaaaaaaaaaaa1";
const SCHOOL_B = "bbbbbbbbbbbbbbbbbbbbbbb2";
const CONVO = "3333333333333333333333c1";

function signedInAs(schoolId, role = "SCHOOL_ADMIN") {
  getServerSession.mockResolvedValue({
    user: { id: schoolId, role, schoolId, name: "Office" },
  });
}

function inboxReturns(rows) {
  Conversation.countDocuments.mockResolvedValue(rows.length);
  Conversation.find.mockReturnValue({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          populate: () => ({ select: () => ({ lean: () => Promise.resolve(rows) }) }),
        }),
      }),
    }),
  });
}

function conversationDoc(overrides = {}) {
  return {
    _id: CONVO,
    school: SCHOOL_A,
    student: "student-1",
    topic: "LEARNING",
    routedToLabel: "Class Teacher",
    originType: "PARENT_INITIATED",
    status: "OPEN",
    participants: [],
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function context() {
  return { params: Promise.resolve({ id: CONVO }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  Conversation.updateOne.mockResolvedValue({});
  Message.updateMany.mockResolvedValue({});
  User.findById.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve({ schoolName: "Green Village" }) }),
  });
});

describe("inbox", () => {
  it("scopes to the caller's own school", async () => {
    signedInAs(SCHOOL_A);
    inboxReturns([]);

    await INBOX(new Request("http://localhost/api/school/messages"));

    expect(Conversation.find).toHaveBeenCalledWith(
      expect.objectContaining({ school: SCHOOL_A })
    );
  });

  it("surfaces the STAFF unread count as 'needs a reply'", async () => {
    signedInAs(SCHOOL_A);
    inboxReturns([
      {
        _id: CONVO,
        topic: "LEARNING",
        originType: "PARENT_INITIATED",
        lastMessagePreview: "Is homework due Friday?",
        lastMessageAt: new Date(),
        student: { _id: "s1", name: "Aayush", grade: "Grade 8" },
        participants: [
          { participantType: "PARENT", displayName: "Sita Sharma" },
          { participantType: "STAFF", unreadCount: 2 },
        ],
      },
    ]);

    const res = await INBOX(new Request("http://localhost/api/school/messages"));
    const json = await res.json();
    const [row] = json.data.conversations;

    expect(row.unreadCount).toBe(2);
    expect(row.guardianName).toBe("Sita Sharma");
    // Which child, so a parent with two children is never ambiguous.
    expect(row.child.name).toBe("Aayush");
  });

  it("filters to threads awaiting a staff reply", async () => {
    signedInAs(SCHOOL_A);
    inboxReturns([]);

    await INBOX(
      new Request("http://localhost/api/school/messages?filter=UNREAD")
    );

    expect(Conversation.find).toHaveBeenCalledWith(
      expect.objectContaining({
        participants: {
          $elemMatch: { participantType: "STAFF", unreadCount: { $gt: 0 } },
        },
      })
    );
  });

  it("refuses a parent", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "p1", role: "PARENT" },
    });
    const res = await INBOX(new Request("http://localhost/api/school/messages"));
    expect(res.status).toBe(403);
  });
});

describe("thread", () => {
  function messagesAre(rows) {
    Message.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({ select: () => ({ lean: () => Promise.resolve(rows) }) }),
        }),
      }),
    });
  }

  it("404s a conversation belonging to another school", async () => {
    signedInAs(SCHOOL_A);
    // The school is part of the FILTER, so a School B thread never matches.
    Conversation.findOne.mockResolvedValue(null);

    const res = await THREAD(new Request("http://localhost"), context());

    expect(res.status).toBe(404);
    expect(Conversation.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ school: SCHOOL_A })
    );
  });

  it("clears the STAFF unread counter only, never the parent's", async () => {
    signedInAs(SCHOOL_A);
    Conversation.findOne.mockResolvedValue(conversationDoc());
    Conversation.findById.mockReturnValue({
      populate: () => ({
        lean: () =>
          Promise.resolve({
            participants: [
              { participantType: "PARENT", displayName: "Sita Sharma" },
            ],
            student: { _id: "s1", name: "Aayush", grade: "Grade 8" },
          }),
      }),
    });
    messagesAre([]);

    await THREAD(new Request("http://localhost"), context());

    const [filter] = Conversation.updateOne.mock.calls[0];
    // The school reading a message is not the parent reading the reply.
    expect(filter["participants.participantType"]).toBe("STAFF");
  });

  it("announces the read so the parent's tick turns on live", async () => {
    signedInAs(SCHOOL_A);
    Conversation.findOne.mockResolvedValue(conversationDoc());
    Conversation.findById.mockReturnValue({
      populate: () => ({
        lean: () => Promise.resolve({ participants: [], student: null }),
      }),
    });
    messagesAre([]);

    await THREAD(new Request("http://localhost"), context());

    expect(publishThreadRead).toHaveBeenCalledWith(
      expect.objectContaining({ reader: "STAFF" })
    );
  });

  it("marks own messages as mine and returns oldest-first", async () => {
    signedInAs(SCHOOL_A);
    Conversation.findOne.mockResolvedValue(conversationDoc());
    Conversation.findById.mockReturnValue({
      populate: () => ({
        lean: () => Promise.resolve({ participants: [], student: null }),
      }),
    });
    messagesAre([
      { _id: "m2", senderType: "STAFF", body: "Yes", createdAt: new Date(2) },
      { _id: "m1", senderType: "PARENT", body: "Due Friday?", createdAt: new Date(1) },
    ]);

    const res = await THREAD(new Request("http://localhost"), context());
    const json = await res.json();

    expect(json.data.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(json.data.messages[0].mine).toBe(false);
    expect(json.data.messages[1].mine).toBe(true);
  });
});

describe("replying", () => {
  it("attributes the reply to the SCHOOL, not the staff member", async () => {
    signedInAs(SCHOOL_A);
    Conversation.findOne.mockResolvedValue(
      conversationDoc({ routedToLabel: "Class Teacher" })
    );

    const res = await REPLY(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ message: "Yes, Friday." }),
      }),
      context()
    );

    expect(res.status).toBe(201);
    const call = appendMessage.mock.calls[0][0];
    expect(call.senderType).toBe("STAFF");
    // A parent must not learn which teacher is on the desk today.
    expect(call.senderName).toBe("Class Teacher");
    expect(call.senderName).not.toBe("Office");
  });

  it("records a teacher reply against the Teacher collection", async () => {
    signedInAs(SCHOOL_A, "TEACHER");
    Conversation.findOne.mockResolvedValue(conversationDoc());

    await REPLY(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ message: "Noted." }),
      }),
      context()
    );

    expect(appendMessage.mock.calls[0][0].senderStaffModel).toBe("Teacher");
  });

  it("rejects an empty reply", async () => {
    signedInAs(SCHOOL_A);
    Conversation.findOne.mockResolvedValue(conversationDoc());

    const res = await REPLY(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ message: "   " }),
      }),
      context()
    );

    expect(res.status).toBe(400);
    expect(appendMessage).not.toHaveBeenCalled();
  });

  it("cannot reply into another school's thread", async () => {
    signedInAs(SCHOOL_A);
    Conversation.findOne.mockResolvedValue(null);

    const res = await REPLY(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ message: "Hello" }),
      }),
      context()
    );

    expect(res.status).toBe(404);
    expect(appendMessage).not.toHaveBeenCalled();
  });
});
