import {
  schoolMessagesChannel,
  parentMessagesChannel,
  isMessagingChannel,
  canAccessChannel,
} from "@/lib/messagingChannels";

/**
 * These channels carry a family's private conversation with the school in real
 * time. The SSE route treats an UNRECOGNISED channel as public, so if
 * `isMessagingChannel` ever stopped matching, or `canAccessChannel` ever
 * returned true too readily, a stranger could tail someone else's messages by
 * guessing an id. Both are pinned hard here.
 */

const SCHOOL_A = "school-a";
const SCHOOL_B = "school-b";
const PARENT_A = "parent-a";
const PARENT_B = "parent-b";

const asSchoolAdmin = (id) => ({ user: { id, role: "SCHOOL_ADMIN" } });
const asTeacher = (schoolId) => ({
  user: { id: "teacher-1", role: "TEACHER", schoolId },
});
const asParent = (id) => ({ user: { id, role: "PARENT" } });

describe("channel names", () => {
  it("namespaces both kinds", () => {
    expect(schoolMessagesChannel(SCHOOL_A)).toBe("school-messages:school-a");
    expect(parentMessagesChannel(PARENT_A)).toBe("parent-messages:parent-a");
  });

  it("recognises them as private messaging channels", () => {
    expect(isMessagingChannel(schoolMessagesChannel(SCHOOL_A))).toBe(true);
    expect(isMessagingChannel(parentMessagesChannel(PARENT_A))).toBe(true);
  });

  it("does not claim unrelated channels", () => {
    // These keep the SSE route's existing rules.
    expect(isMessagingChannel("public-feed")).toBe(false);
    expect(isMessagingChannel("school-notifications")).toBe(false);
    expect(isMessagingChannel("")).toBe(false);
    expect(isMessagingChannel(null)).toBe(false);
  });
});

describe("school inbox channel", () => {
  const channel = schoolMessagesChannel(SCHOOL_A);

  it("lets a school admin hear its own inbox", () => {
    expect(canAccessChannel(channel, asSchoolAdmin(SCHOOL_A))).toBe(true);
  });

  it("lets a teacher at that school hear it", () => {
    expect(canAccessChannel(channel, asTeacher(SCHOOL_A))).toBe(true);
  });

  it("BLOCKS another school's admin", () => {
    expect(canAccessChannel(channel, asSchoolAdmin(SCHOOL_B))).toBe(false);
  });

  it("BLOCKS a teacher from another school", () => {
    expect(canAccessChannel(channel, asTeacher(SCHOOL_B))).toBe(false);
  });

  it("BLOCKS a parent", () => {
    expect(canAccessChannel(channel, asParent(PARENT_A))).toBe(false);
  });

  it("BLOCKS SUPER_ADMIN too", () => {
    // Platform staff have no business tailing a family's conversation live.
    // The audited assisted-access view exists for legitimate need.
    expect(
      canAccessChannel(channel, { user: { id: "root", role: "SUPER_ADMIN" } })
    ).toBe(false);
  });
});

describe("parent channel", () => {
  const channel = parentMessagesChannel(PARENT_A);

  it("lets the guardian hear their own threads", () => {
    expect(canAccessChannel(channel, asParent(PARENT_A))).toBe(true);
  });

  it("BLOCKS a different guardian", () => {
    // The whole attack: guess an id, tail the conversation.
    expect(canAccessChannel(channel, asParent(PARENT_B))).toBe(false);
  });

  it("BLOCKS school staff", () => {
    expect(canAccessChannel(channel, asSchoolAdmin(SCHOOL_A))).toBe(false);
    expect(canAccessChannel(channel, asTeacher(SCHOOL_A))).toBe(false);
  });
});

describe("refuses anything malformed", () => {
  it("rejects an anonymous caller", () => {
    expect(canAccessChannel(schoolMessagesChannel(SCHOOL_A), null)).toBe(false);
    expect(canAccessChannel(parentMessagesChannel(PARENT_A), {})).toBe(false);
  });

  it("rejects a channel with an empty id", () => {
    expect(canAccessChannel("school-messages:", asSchoolAdmin(SCHOOL_A))).toBe(
      false
    );
    expect(canAccessChannel("parent-messages:", asParent(PARENT_A))).toBe(false);
  });

  it("rejects a channel it does not own — no accidental fall-through to true", () => {
    // Anything not explicitly allowed must be denied by this function; the SSE
    // route only calls it for messaging channels.
    expect(canAccessChannel("public-feed", asParent(PARENT_A))).toBe(false);
    expect(canAccessChannel("", asParent(PARENT_A))).toBe(false);
  });

  it("does not let a prefix lookalike through", () => {
    expect(
      canAccessChannel("school-messages-evil:school-a", asSchoolAdmin(SCHOOL_A))
    ).toBe(false);
  });
});
