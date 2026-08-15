jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Notice", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/NoticeReceipt", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/Achievement", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/SchoolMagazineArticle", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/ParticipationRequest", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/Event", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/Conversation", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/Student", () => ({ __esModule: true, default: {} }));

import {
  prioritiseCards,
  isEventLive,
  HOME_PRIORITY,
  HOME_CATEGORY_CAPS,
} from "@/lib/parentHome";

/**
 * §30's ordering rule is the part of Home most likely to be broken by a later
 * edit, so it is tested directly. `prioritiseCards` is pure, which is why it is
 * exported separately from the database work.
 */

function card(kind, occurredAt, id = `${kind}-${occurredAt}`) {
  return { id, kind, priority: HOME_PRIORITY[kind], occurredAt };
}

describe("card priority (§30)", () => {
  it("puts action-required above everything, regardless of recency", () => {
    const cards = prioritiseCards([
      card("ACHIEVEMENT", "2026-08-15T09:00:00Z"),
      card("ACTION_REQUIRED", "2026-01-01T09:00:00Z"),
    ]);

    // The achievement is far newer, and still loses.
    expect(cards[0].kind).toBe("ACTION_REQUIRED");
  });

  it("follows the full documented order", () => {
    const cards = prioritiseCards([
      card("GENERAL", "2026-08-15T09:00:00Z"),
      card("NEW_WRITING", "2026-08-15T09:00:00Z"),
      card("ACHIEVEMENT", "2026-08-15T09:00:00Z"),
      card("REGISTRATION_OPEN", "2026-08-15T09:00:00Z"),
      card("UNREAD_NOTICE", "2026-08-15T09:00:00Z"),
      card("UNREAD_MESSAGE", "2026-08-15T09:00:00Z"),
      card("CONSENT_REQUIRED", "2026-08-15T09:00:00Z"),
      card("LIVE_EVENT", "2026-08-15T09:00:00Z"),
      card("ACTION_REQUIRED", "2026-08-15T09:00:00Z"),
    ]);

    expect(cards.map((c) => c.kind)).toEqual([
      "ACTION_REQUIRED",
      "LIVE_EVENT",
      "CONSENT_REQUIRED",
      "UNREAD_MESSAGE",
      "UNREAD_NOTICE",
      "REGISTRATION_OPEN",
      "ACHIEVEMENT",
      "NEW_WRITING",
      "GENERAL",
    ]);
  });

  it("sorts newest-first WITHIN a priority band", () => {
    const cards = prioritiseCards([
      card("UNREAD_NOTICE", "2026-08-01T09:00:00Z", "older"),
      card("UNREAD_NOTICE", "2026-08-14T09:00:00Z", "newer"),
    ]);

    expect(cards.map((c) => c.id)).toEqual(["newer", "older"]);
  });
});

describe("no category may flood Home (§30)", () => {
  it("caps unread notices so they cannot bury the rest", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      card("UNREAD_NOTICE", `2026-08-${10 + i}T09:00:00Z`, `notice-${i}`)
    );

    const cards = prioritiseCards([...many, card("ACHIEVEMENT", "2026-08-01T09:00:00Z")]);

    expect(cards.filter((c) => c.kind === "UNREAD_NOTICE")).toHaveLength(
      HOME_CATEGORY_CAPS.UNREAD_NOTICE
    );
    // The achievement still makes it onto the screen.
    expect(cards.some((c) => c.kind === "ACHIEVEMENT")).toBe(true);
  });

  it("keeps the newest members of a capped category", () => {
    const cards = prioritiseCards([
      card("UNREAD_NOTICE", "2026-08-01T09:00:00Z", "oldest"),
      card("UNREAD_NOTICE", "2026-08-10T09:00:00Z", "middle"),
      card("UNREAD_NOTICE", "2026-08-20T09:00:00Z", "newest"),
      card("UNREAD_NOTICE", "2026-08-25T09:00:00Z", "very-newest"),
    ]);

    expect(cards.map((c) => c.id)).toEqual(["very-newest", "newest", "middle"]);
  });

  it("Simple Mode shows strictly fewer cards (§8)", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      card(
        ["ACTION_REQUIRED", "UNREAD_NOTICE", "ACHIEVEMENT", "NEW_WRITING"][i % 4],
        `2026-08-${10 + (i % 15)}T09:00:00Z`,
        `card-${i}`
      )
    );

    const standard = prioritiseCards(many, { simpleMode: false });
    const simple = prioritiseCards(many, { simpleMode: true });

    expect(simple.length).toBeLessThan(standard.length);
    expect(simple.length).toBeLessThanOrEqual(5);
    // The most urgent card survives the trim.
    expect(simple[0].kind).toBe("ACTION_REQUIRED");
  });

  it("handles an empty Home without error", () => {
    expect(prioritiseCards([])).toEqual([]);
  });
});

describe("isEventLive", () => {
  const now = new Date("2026-08-15T14:00:00Z");

  it("is true on the event's own day while ACTIVE", () => {
    expect(
      isEventLive(
        { date: new Date("2026-08-15T09:00:00Z"), lifecycleStatus: "ACTIVE" },
        now
      )
    ).toBe(true);
  });

  it("is false the day before and the day after", () => {
    expect(
      isEventLive(
        { date: new Date("2026-08-14T09:00:00Z"), lifecycleStatus: "ACTIVE" },
        now
      )
    ).toBe(false);
    expect(
      isEventLive(
        { date: new Date("2026-08-16T09:00:00Z"), lifecycleStatus: "ACTIVE" },
        now
      )
    ).toBe(false);
  });

  it("is false for a completed or cancelled event on the same day", () => {
    expect(
      isEventLive(
        { date: new Date("2026-08-15T09:00:00Z"), lifecycleStatus: "COMPLETED" },
        now
      )
    ).toBe(false);
    expect(
      isEventLive(
        { date: new Date("2026-08-15T09:00:00Z"), lifecycleStatus: "CANCELLED" },
        now
      )
    ).toBe(false);
  });

  it("is false with no date rather than throwing", () => {
    expect(isEventLive({ lifecycleStatus: "ACTIVE" }, now)).toBe(false);
    expect(isEventLive(null, now)).toBe(false);
  });
});
