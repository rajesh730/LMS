jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/parentAccess", () => ({
  requireParentChild: jest.fn(),
  requireParentSession: jest.fn(),
}));
jest.mock("@/lib/parentMessaging", () => ({
  getAvailableTopics: jest.fn(),
  findOrCreateConversation: jest.fn(),
  appendMessage: jest.fn(),
  markConversationRead: jest.fn(),
  sanitiseAttachments: jest.fn((a) => a || []),
  TOPIC_CATALOGUE: [{ topic: "LEARNING", emoji: "🎓" }],
}));
jest.mock("@/models/Conversation", () => ({
  __esModule: true,
  default: { find: jest.fn(), findOne: jest.fn() },
}));
jest.mock("@/models/Message", () => ({
  __esModule: true,
  default: { find: jest.fn(), updateMany: jest.fn() },
}));
jest.mock("@/models/ParentStudentLink", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

import {
  requireParentChild,
  requireParentSession,
} from "@/lib/parentAccess";
import {
  getAvailableTopics,
  findOrCreateConversation,
  appendMessage,
} from "@/lib/parentMessaging";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import ParentStudentLink from "@/models/ParentStudentLink";
import Student from "@/models/Student";
import { errorResponse } from "@/lib/apiResponse";
import { GET as LIST, POST as START } from "@/app/api/parent/messages/route";
import { GET as THREAD } from "@/app/api/parent/messages/[id]/route";

const PARENT_A = "aaaaaaaaaaaaaaaaaaaaaaa1";
const AAYUSH = "1111111111111111111111a1";
const AARYA = "2222222222222222222222a2";
const SCHOOL = "5555555555555555555555s1";
const CONVERSATION = "3333333333333333333333c1";

function authorised(studentId = AAYUSH) {
  requireParentChild.mockResolvedValue({
    parent: { _id: PARENT_A, name: "Sita Sharma" },
    student: { _id: studentId, name: "Aayush", school: SCHOOL },
    permissions: { canMessageSchool: true },
    context: { studentId, schoolId: SCHOOL, schoolName: "Green Village" },
  });
}

function conversationList(rows) {
  Conversation.find.mockReturnValue({
    sort: () => ({
      limit: () => ({ select: () => ({ lean: () => Promise.resolve(rows) }) }),
    }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  getAvailableTopics.mockResolvedValue([
    { topic: "LEARNING", emoji: "🎓", labelKey: "messages.topicLearning" },
  ]);
  conversationList([]);
});

describe("conversation list scoping (§19, §36)", () => {
  it("scopes by BOTH the child and this guardian's participation", async () => {
    authorised();

    await LIST(
      new Request(`http://localhost/api/parent/messages?studentId=${AAYUSH}`)
    );

    expect(Conversation.find).toHaveBeenCalledWith(
      expect.objectContaining({
        student: AAYUSH,
        // Without this, one guardian could read the other's thread.
        "participants.parent": PARENT_A,
      })
    );
  });

  it("switching child re-scopes the list to the other child", async () => {
    authorised(AARYA);

    await LIST(
      new Request(`http://localhost/api/parent/messages?studentId=${AARYA}`)
    );

    expect(Conversation.find).toHaveBeenCalledWith(
      expect.objectContaining({ student: AARYA })
    );
  });

  it("requires the canMessageSchool permission", async () => {
    requireParentChild.mockResolvedValue({
      error: errorResponse(403, "No messaging", "PERMISSION_DENIED"),
    });

    const res = await LIST(new Request("http://localhost/api/parent/messages"));

    expect(res.status).toBe(403);
    expect(requireParentChild).toHaveBeenCalledWith(null, "canMessageSchool");
  });

  it("returns the staff LABEL, never an individual's contact details (§15)", async () => {
    authorised();
    conversationList([
      {
        _id: CONVERSATION,
        topic: "LEARNING",
        routedToLabel: "Class Teacher",
        lastMessagePreview: "Hello",
        lastMessageAt: new Date(),
        participants: [
          { participantType: "PARENT", parent: PARENT_A, unreadCount: 2 },
        ],
      },
    ]);

    const res = await LIST(
      new Request(`http://localhost/api/parent/messages?studentId=${AAYUSH}`)
    );
    const json = await res.json();
    const [thread] = json.data.conversations;

    expect(thread.title).toBe("Class Teacher");
    expect(thread.unreadCount).toBe(2);
    expect(JSON.stringify(thread)).not.toMatch(/@|\+977|phone/i);
  });
});

describe("starting a conversation — topic routing (§14)", () => {
  it("rejects a topic the school does not offer", async () => {
    authorised();

    const res = await START(
      new Request("http://localhost/api/parent/messages", {
        method: "POST",
        body: JSON.stringify({
          studentId: AAYUSH,
          topic: "TRANSPORT",
          message: "Where is the bus?",
        }),
      })
    );

    expect(res.status).toBe(400);
    // Never silently reroute to a fallback the parent did not choose.
    expect(findOrCreateConversation).not.toHaveBeenCalled();
  });

  it("routes an offered topic without the parent naming a recipient", async () => {
    authorised();
    findOrCreateConversation.mockResolvedValue({ _id: CONVERSATION });

    const res = await START(
      new Request("http://localhost/api/parent/messages", {
        method: "POST",
        body: JSON.stringify({
          studentId: AAYUSH,
          topic: "LEARNING",
          message: "How is Aayush doing in maths?",
        }),
      })
    );

    expect(res.status).toBe(201);
    const call = findOrCreateConversation.mock.calls[0][0];
    expect(call.topic).toBe("LEARNING");
    // The school id comes from the verified context, not the request body.
    expect(call.schoolId).toBe(SCHOOL);
    expect(call).not.toHaveProperty("recipient");
    expect(appendMessage).toHaveBeenCalled();
  });

  it("rejects an empty message", async () => {
    authorised();

    const res = await START(
      new Request("http://localhost/api/parent/messages", {
        method: "POST",
        body: JSON.stringify({ studentId: AAYUSH, topic: "LEARNING", message: "  " }),
      })
    );

    expect(res.status).toBe(400);
  });

  it("explains when the school has messaging switched off", async () => {
    authorised();
    getAvailableTopics.mockResolvedValue([]);

    const res = await START(
      new Request("http://localhost/api/parent/messages", {
        method: "POST",
        body: JSON.stringify({ studentId: AAYUSH, topic: "LEARNING", message: "Hi" }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/not enabled parent messaging/i);
  });
});

describe("reading a thread", () => {
  /**
   * The thread is authorised against the conversation's OWN child, not the
   * child currently selected in the app. A guardian with two children used to
   * get "Failed to load conversation" whenever the switcher was on the other
   * one — following a notification deep link did it every time.
   */
  function signedIn() {
    requireParentSession.mockResolvedValue({
      parent: { _id: PARENT_A, name: "Sita Sharma" },
      session: { user: { id: PARENT_A, role: "PARENT" } },
    });
  }

  function conversationIs(value) {
    Conversation.findOne.mockResolvedValue(value);
  }

  function linkIs(value) {
    ParentStudentLink.findOne.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(value) }),
    });
  }

  function messagesAre(rows) {
    Message.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            select: () => ({ lean: () => Promise.resolve(rows) }),
          }),
        }),
      }),
    });
  }

  function request() {
    return THREAD(
      new Request(`http://localhost/api/parent/messages/${CONVERSATION}`),
      { params: Promise.resolve({ id: CONVERSATION }) }
    );
  }

  beforeEach(() => {
    signedIn();
    linkIs({ canMessageSchool: true });
    messagesAre([]);
    Student.findById.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve({ _id: AARYA, name: "Aarya", grade: "Grade 5" }),
      }),
    });
  });

  it("opens a thread about a child OTHER than the selected one", async () => {
    // The exact regression. The conversation is about Aarya; the app may well
    // be showing Aayush. It must still open.
    conversationIs({
      _id: CONVERSATION,
      topic: "LEARNING",
      routedToLabel: "Class Teacher",
      student: AARYA,
    });

    const res = await request();
    const json = await res.json();

    expect(res.status).toBe(200);
    // The response names the child it is ACTUALLY about, so the app can align
    // its switcher rather than showing the wrong name over the messages.
    expect(json.data.child.id).toBe(AARYA);
  });

  it("404s a thread this guardian is not a participant in", async () => {
    conversationIs(null);

    const res = await request();

    expect(res.status).toBe(404);
    // Participation is part of the FILTER, so the thread's existence is not
    // even confirmed to a non-participant.
    expect(Conversation.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ "participants.parent": PARENT_A })
    );
  });

  it("404s when access to that child has been revoked since", async () => {
    conversationIs({ _id: CONVERSATION, student: AARYA });
    linkIs(null);

    const res = await request();

    // Participation alone is not enough — a school can withdraw a guardian
    // from a child without deleting the thread.
    expect(res.status).toBe(404);
    expect(Message.find).not.toHaveBeenCalled();
  });

  it("403s a guardian the school disabled messaging for", async () => {
    conversationIs({ _id: CONVERSATION, student: AARYA });
    linkIs({ canMessageSchool: false });

    const res = await request();

    expect(res.status).toBe(403);
  });

  it("marks own messages as mine and returns them oldest-first", async () => {
    conversationIs({
      _id: CONVERSATION,
      topic: "LEARNING",
      routedToLabel: "Class Teacher",
      student: AARYA,
    });
    messagesAre([
      {
        _id: "m2",
        senderType: "STAFF",
        senderName: "Mr Thapa",
        body: "He is doing well.",
        createdAt: new Date("2026-08-15T10:05:00Z"),
      },
      {
        _id: "m1",
        senderType: "PARENT",
        senderParent: PARENT_A,
        body: "How is he doing?",
        createdAt: new Date("2026-08-15T10:00:00Z"),
      },
    ]);

    const res = await request();
    const json = await res.json();

    // Fetched newest-first, reversed for display.
    expect(json.data.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(json.data.messages[0].mine).toBe(true);
    expect(json.data.messages[1].mine).toBe(false);
  });
});
