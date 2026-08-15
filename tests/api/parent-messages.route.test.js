jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/parentAccess", () => ({ requireParentChild: jest.fn() }));
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

import { requireParentChild } from "@/lib/parentAccess";
import {
  getAvailableTopics,
  findOrCreateConversation,
  appendMessage,
} from "@/lib/parentMessaging";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
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
  it("404s a thread this guardian is not a participant in", async () => {
    authorised();
    Conversation.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });

    const res = await THREAD(
      new Request(
        `http://localhost/api/parent/messages/${CONVERSATION}?studentId=${AAYUSH}`
      ),
      { params: Promise.resolve({ id: CONVERSATION }) }
    );

    expect(res.status).toBe(404);
    // Participation is part of the FILTER, so the thread's existence is not
    // even confirmed to a non-participant.
    expect(Conversation.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ "participants.parent": PARENT_A })
    );
  });

  it("marks own messages as mine and returns them oldest-first", async () => {
    authorised();
    Conversation.findOne.mockReturnValue({
      lean: () =>
        Promise.resolve({
          _id: CONVERSATION,
          topic: "LEARNING",
          routedToLabel: "Class Teacher",
          student: AAYUSH,
        }),
    });
    Message.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            select: () => ({
              lean: () =>
                Promise.resolve([
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
                ]),
            }),
          }),
        }),
      }),
    });

    const res = await THREAD(
      new Request(
        `http://localhost/api/parent/messages/${CONVERSATION}?studentId=${AAYUSH}`
      ),
      { params: Promise.resolve({ id: CONVERSATION }) }
    );
    const json = await res.json();

    // Fetched newest-first, reversed for display.
    expect(json.data.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(json.data.messages[0].mine).toBe(true);
    expect(json.data.messages[1].mine).toBe(false);
  });
});
