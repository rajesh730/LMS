jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/parentNotifications", () => ({ notifyGuardians: jest.fn() }));
jest.mock("@/lib/emailService", () => ({ sendNoticeEmail: jest.fn() }));
jest.mock("@/lib/parentMessaging", () => ({ appendMessage: jest.fn() }));
jest.mock("@/models/Conversation", () => ({
  __esModule: true,
  default: { find: jest.fn(), create: jest.fn() },
}));
jest.mock("@/models/Message", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));

import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { appendMessage } from "@/lib/parentMessaging";
import { ParentInboxChannel } from "@/lib/notifications/channels";

/**
 * Notices delivered into the guardian's message inbox.
 *
 * Parents live in the conversation thread, not in a separate Notice Centre, so
 * a notice published to parents is mirrored there as an announcement. Two
 * things have to hold, and both are the kind that go wrong quietly:
 *
 *  1. The notice's TITLE arrives as the message subject, so the inbox shows a
 *     headline rather than a wall of body text.
 *  2. Delivering twice does not post it twice. Delivery legitimately re-runs —
 *     the school can press "Deliver" again — and duplicates in a family's chat
 *     would be both confusing and impossible to clean up.
 */

const channel = new ParentInboxChannel();

const NOTICE = {
  _id: "notice-1",
  title: "holiday 2.0",
  content: "to every student, enjoy your holiday",
  author: "school-admin-1",
  requiresAcknowledgement: false,
  requiresConsent: false,
};

function recipient(overrides = {}) {
  return {
    parent: { _id: "parent-1", name: "Mina BK", accessState: "ACTIVATED" },
    student: { _id: "student-1", name: "Aayush Basnet", school: "school-1" },
    link: { canReceiveNotices: true },
    ...overrides,
  };
}

/** Conversation.find(...).sort(...) resolving to `rows`. */
function threadsAre(rows) {
  Conversation.find.mockReturnValue({ sort: () => Promise.resolve(rows) });
}

/** Message.find(...).select(...).lean() resolving to `rows`. */
function deliveredMessagesAre(rows) {
  Message.find.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(rows) }),
  });
}

const EXISTING_THREAD = {
  _id: "conv-1",
  student: "student-1",
  participants: [{ participantType: "PARENT", parent: "parent-1" }],
};

beforeEach(() => {
  jest.clearAllMocks();
  threadsAre([]);
  deliveredMessagesAre([]);
  Conversation.create.mockResolvedValue(EXISTING_THREAD);
  appendMessage.mockResolvedValue({ _id: "m1" });
});

describe("delivering a notice into the inbox", () => {
  it("posts the notice as an announcement carrying its title as the subject", async () => {
    threadsAre([EXISTING_THREAD]);

    const result = await channel.send({
      notice: NOTICE,
      recipients: [recipient()],
      schoolName: "Green Village Secondary School",
    });

    expect(result).toMatchObject({ channel: "PARENT_INBOX", status: "SENT", count: 1 });

    const [call] = appendMessage.mock.calls;
    expect(call[0]).toMatchObject({
      conversation: EXISTING_THREAD,
      senderType: "STAFF",
      senderName: "Green Village Secondary School",
      subject: "holiday 2.0",
      body: "to every student, enjoy your holiday",
      sourceNotice: "notice-1",
    });
  });

  it("starts a thread for a guardian who has never had one", async () => {
    threadsAre([]);

    await channel.send({
      notice: NOTICE,
      recipients: [recipient()],
      schoolName: "Green Village Secondary School",
    });

    const [created] = Conversation.create.mock.calls[0];
    // The school comes from the STUDENT record: a platform notice has no
    // school of its own, and a multi-school family must not have one school's
    // thread reused for the other's child.
    expect(created.school).toBe("school-1");
    expect(created.student).toBe("student-1");
    expect(created.originType).toBe("SCHOOL_ANNOUNCEMENT");
    expect(appendMessage).toHaveBeenCalledTimes(1);
  });

  it("does NOT post the same notice into a thread twice", async () => {
    threadsAre([EXISTING_THREAD]);
    // This exact announcement is already sitting in that thread.
    deliveredMessagesAre([
      {
        conversation: "conv-1",
        subject: NOTICE.title,
        body: NOTICE.content,
      },
    ]);

    const result = await channel.send({
      notice: NOTICE,
      recipients: [recipient()],
      schoolName: "Green Village Secondary School",
    });

    expect(appendMessage).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "SKIPPED", count: 0 });
  });

  it("DOES post when the same notice now says something different", async () => {
    // An event notice is upserted in place, so a cancellation rewrites the
    // record families were already told about. Deduping on the notice id alone
    // would leave every inbox showing "this is happening" for an event that
    // has been called off.
    threadsAre([EXISTING_THREAD]);
    deliveredMessagesAre([
      {
        conversation: "conv-1",
        subject: "New event: Sports Day",
        body: "Sports day is on Friday.",
      },
    ]);

    await channel.send({
      notice: {
        ...NOTICE,
        title: "Cancelled: Sports Day",
        content: "Sports day has been cancelled.",
      },
      recipients: [recipient()],
      schoolName: "Green Village",
    });

    expect(appendMessage).toHaveBeenCalledTimes(1);
    expect(appendMessage.mock.calls[0][0].subject).toBe("Cancelled: Sports Day");
  });

  it("seeds the thread for a guardian who has not activated yet", async () => {
    // Deliberately not gated on accessState: the notice waits for them instead
    // of being lost because it was published a day before they signed in.
    threadsAre([EXISTING_THREAD]);

    await channel.send({
      notice: NOTICE,
      recipients: [
        recipient({
          parent: { _id: "parent-1", name: "Mina BK", accessState: "PENDING_ACTIVATION" },
        }),
      ],
      schoolName: "Green Village",
    });

    expect(appendMessage).toHaveBeenCalledTimes(1);
  });

  it("skips a guardian the school switched notices off for", async () => {
    const result = await channel.send({
      notice: NOTICE,
      recipients: [recipient({ link: { canReceiveNotices: false } })],
      schoolName: "Green Village",
    });

    expect(appendMessage).not.toHaveBeenCalled();
    expect(result.status).toBe("SKIPPED");
  });

  it("tells the guardian where to respond when the notice needs a decision", async () => {
    threadsAre([EXISTING_THREAD]);

    await channel.send({
      notice: { ...NOTICE, requiresConsent: true },
      recipients: [recipient()],
      schoolName: "Green Village",
    });

    // Consent cannot be given by replying in chat — accepting a "yes" here as
    // consent would be the worst outcome of putting notices in the inbox.
    expect(appendMessage.mock.calls[0][0].body).toContain(
      "Please open Notices to respond"
    );
  });

  it("keeps two children of one guardian in their own threads", async () => {
    const secondThread = {
      _id: "conv-2",
      student: "student-2",
      participants: [{ participantType: "PARENT", parent: "parent-1" }],
    };
    threadsAre([EXISTING_THREAD, secondThread]);

    await channel.send({
      notice: NOTICE,
      recipients: [
        recipient(),
        recipient({
          student: { _id: "student-2", name: "Aarya Basnet", school: "school-1" },
        }),
      ],
      schoolName: "Green Village",
    });

    expect(appendMessage).toHaveBeenCalledTimes(2);
    const threads = appendMessage.mock.calls.map((c) => c[0].conversation._id);
    expect(threads).toEqual(["conv-1", "conv-2"]);
  });

  it("never throws — the other channels must still run", async () => {
    Conversation.find.mockImplementation(() => {
      throw new Error("database down");
    });

    await expect(
      channel.send({
        notice: NOTICE,
        recipients: [recipient()],
        schoolName: "Green Village",
      })
    ).resolves.toMatchObject({ status: "FAILED", reason: "database down" });
  });
});
