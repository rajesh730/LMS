import {
  PARENT_STATUS,
  LEARNING_STAGES,
  getStatus,
  noticeStatus,
  eventStatus,
  notificationStatus,
} from "@/lib/parentStatus";

/**
 * §4's rules are product commitments, not styling details, so they are pinned
 * here: colour is never alone, and the RAG scale is never applied to a child's
 * ability.
 */

describe("status descriptors always carry colour + icon + text", () => {
  it.each(Object.keys(PARENT_STATUS))(
    "%s has a tone, an icon and a label",
    (key) => {
      const descriptor = PARENT_STATUS[key];
      expect(descriptor.tone).toBeTruthy();
      expect(descriptor.icon).toBeTruthy();
      expect(descriptor.labelKey).toBeTruthy();
      expect(descriptor.defaultLabel).toBeTruthy();
    }
  );

  it("falls back to INFO for an unknown key rather than rendering nothing", () => {
    expect(getStatus("NOPE")).toBe(PARENT_STATUS.INFO);
    expect(getStatus(undefined)).toBe(PARENT_STATUS.INFO);
  });
});

describe("learning stages are separate from the RAG system (§4)", () => {
  it("uses no red/yellow/green tone for ability", () => {
    Object.values(LEARNING_STAGES).forEach((stage) => {
      expect(stage.tone).toBeUndefined();
    });
  });

  it("has no negative rung — the lowest stage is 'Developing'", () => {
    const labels = Object.values(LEARNING_STAGES).map((s) => s.defaultLabel);
    expect(labels).toEqual([
      "Developing",
      "Progressing",
      "Strong",
      "Achievement",
    ]);
    expect(labels.join(" ")).not.toMatch(/poor|weak|behind|fail/i);
  });
});

describe("noticeStatus", () => {
  const plain = { requiresConsent: false, requiresAcknowledgement: false };

  it("is ACTION_REQUIRED while consent is unanswered", () => {
    expect(
      noticeStatus({ requiresConsent: true }, { consentDecision: "PENDING" }).key
    ).toBe("ACTION_REQUIRED");
  });

  it("clears once consent is answered", () => {
    expect(
      noticeStatus(
        { requiresConsent: true },
        { consentDecision: "YES", openedAt: new Date() }
      ).key
    ).toBe("COMPLETE");
  });

  it("treats NO as answered — a refusal is still a decision", () => {
    expect(
      noticeStatus(
        { requiresConsent: true },
        { consentDecision: "NO", openedAt: new Date() }
      ).key
    ).toBe("COMPLETE");
  });

  it("is ACTION_REQUIRED until an acknowledgement notice is confirmed", () => {
    expect(
      noticeStatus({ requiresAcknowledgement: true }, { openedAt: new Date() })
        .key
    ).toBe("ACTION_REQUIRED");
    expect(
      noticeStatus(
        { requiresAcknowledgement: true },
        { openedAt: new Date(), acknowledgedAt: new Date() }
      ).key
    ).toBe("COMPLETE");
  });

  it("escalates an UNOPENED urgent notice to red, not yellow", () => {
    expect(noticeStatus({ ...plain, priority: "URGENT" }, null).key).toBe(
      "ACTION_REQUIRED"
    );
    expect(noticeStatus({ ...plain, type: "URGENT" }, null).key).toBe(
      "ACTION_REQUIRED"
    );
  });

  it("is NEEDS_ATTENTION for an ordinary unopened notice", () => {
    expect(noticeStatus(plain, null).key).toBe("NEEDS_ATTENTION");
    expect(noticeStatus(plain, { deliveredAt: new Date() }).key).toBe(
      "NEEDS_ATTENTION"
    );
  });

  it("is COMPLETE once opened", () => {
    expect(noticeStatus(plain, { openedAt: new Date() }).key).toBe("COMPLETE");
  });
});

describe("eventStatus", () => {
  const now = new Date("2026-08-15T10:00:00Z");

  it("is COMPLETE when the child is enrolled", () => {
    expect(eventStatus({}, { status: "ENROLLED" }, now).key).toBe("COMPLETE");
    expect(eventStatus({}, { status: "APPROVED" }, now).key).toBe("COMPLETE");
  });

  it("is NEEDS_ATTENTION while the school has not confirmed", () => {
    expect(eventStatus({}, { status: "PENDING" }, now).key).toBe(
      "NEEDS_ATTENTION"
    );
  });

  it("goes RED when registration closes within 48 hours", () => {
    const soon = new Date("2026-08-16T10:00:00Z");
    expect(
      eventStatus({ registrationDeadline: soon }, null, now).key
    ).toBe("ACTION_REQUIRED");
  });

  it("stays YELLOW when there is still plenty of time", () => {
    const later = new Date("2026-08-30T10:00:00Z");
    expect(
      eventStatus({ registrationDeadline: later }, null, now).key
    ).toBe("NEEDS_ATTENTION");
  });

  it("is INFO once the deadline has passed", () => {
    const past = new Date("2026-08-01T10:00:00Z");
    expect(eventStatus({ registrationDeadline: past }, null, now).key).toBe(
      "INFO"
    );
  });
});

describe("notificationStatus maps priority to the same visual language", () => {
  it.each([
    ["URGENT", "ACTION_REQUIRED"],
    ["ACTION", "NEEDS_ATTENTION"],
    ["POSITIVE", "COMPLETE"],
    ["INFO", "INFO"],
    [undefined, "INFO"],
  ])("%s -> %s", (priority, expected) => {
    expect(notificationStatus(priority).key).toBe(expected);
  });
});
