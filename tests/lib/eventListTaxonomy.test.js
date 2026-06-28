import {
  isCompletedEvent,
  isLiveEvent,
  isRegistrationOpenEvent,
  isTerminalEvent,
  matchesEventFacets,
  matchesEventListFilter,
} from "@/lib/eventListTaxonomy";

describe("shared event list taxonomy", () => {
  it("uses mutually exclusive registration, live, completed, and archived buckets", () => {
    const registration = {
      status: "APPROVED",
      lifecycleStatus: "ACTIVE",
      eventWorkflowStatus: "OPEN_FOR_REGISTRATION",
    };
    const live = {
      status: "APPROVED",
      lifecycleStatus: "ACTIVE",
      eventWorkflowStatus: "ROUND_ACTIVE",
    };
    const completed = {
      status: "APPROVED",
      lifecycleStatus: "COMPLETED",
      resultsPublished: true,
    };
    const cancelled = {
      status: "APPROVED",
      lifecycleStatus: "CANCELLED",
    };

    expect(isRegistrationOpenEvent(registration)).toBe(true);
    expect(isLiveEvent(registration)).toBe(false);
    expect(isLiveEvent(live)).toBe(true);
    expect(isCompletedEvent(completed)).toBe(true);
    expect(isTerminalEvent(cancelled)).toBe(true);

    expect(matchesEventListFilter(registration, "REGISTRATION")).toBe(true);
    expect(matchesEventListFilter(live, "LIVE")).toBe(true);
    expect(matchesEventListFilter(completed, "COMPLETED")).toBe(true);
    expect(matchesEventListFilter(cancelled, "ARCHIVED")).toBe(true);
    expect(matchesEventListFilter(cancelled, "ALL")).toBe(false);
  });

  it("does not classify pending approval events as live", () => {
    expect(
      isLiveEvent({
        status: "PENDING",
        lifecycleStatus: "ACTIVE",
        eventWorkflowStatus: "ROUND_ACTIVE",
      })
    ).toBe(false);
  });

  it("supports role-specific My Events without changing shared status rules", () => {
    const event = {
      lifecycleStatus: "ACTIVE",
      eventWorkflowStatus: "OPEN_FOR_REGISTRATION",
    };
    expect(matchesEventListFilter(event, "MINE", { isMine: true })).toBe(true);
    expect(matchesEventListFilter(event, "MINE", { isMine: false })).toBe(false);
  });

  it("applies shared text, type, grade, and visibility facets", () => {
    const event = {
      title: "Science Fair",
      description: "Annual exhibition",
      eventType: "SHOWCASE",
      eligibleGrades: ["Grade 9"],
      visibility: "PUBLIC",
    };

    expect(
      matchesEventFacets(event, {
        search: "science",
        type: "SHOWCASE",
        grade: "Grade 9",
        visibility: "PUBLIC",
      })
    ).toBe(true);
    expect(matchesEventFacets(event, { search: "football" })).toBe(false);
  });
});
