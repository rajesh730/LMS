// Domain tests for lib/eventResults.js.
//
// Placement and status-precedence rules decide what a certificate says, so they
// are worth pinning down. They were previously unreachable without an HTTP
// request; extracting them out of the results route made this file possible.
jest.mock("@/lib/db", () => jest.fn());

import {
  FINAL_STATUS_TO_PLACEMENT,
  STATUS_PRIORITY,
  buildLevel,
  filterEntriesForSchool,
  getBetterStatus,
  isTeamEvent,
  placementLabel,
} from "@/lib/eventResults";

describe("isTeamEvent", () => {
  it("is true only for the TEAM format", () => {
    expect(isTeamEvent({ participationFormat: "TEAM" })).toBe(true);
    expect(isTeamEvent({ participationFormat: "team" })).toBe(true);
    expect(isTeamEvent({ participationFormat: "INDIVIDUAL" })).toBe(false);
  });

  it("defaults to individual for missing input", () => {
    expect(isTeamEvent({})).toBe(false);
    expect(isTeamEvent(null)).toBe(false);
  });
});

describe("getBetterStatus", () => {
  it("keeps the stronger of two outcomes regardless of argument order", () => {
    expect(getBetterStatus("FINALIST", "WINNER")).toBe("WINNER");
    expect(getBetterStatus("WINNER", "FINALIST")).toBe("WINNER");
  });

  it("orders the full placement ladder", () => {
    expect(getBetterStatus("RUNNER_UP", "THIRD_PLACE")).toBe("RUNNER_UP");
    expect(getBetterStatus("SELECTED", "FINALIST")).toBe("FINALIST");
    expect(getBetterStatus("DISQUALIFIED", "SELECTED")).toBe("SELECTED");
  });

  it("treats an unranked status as worse than any ranked one", () => {
    expect(getBetterStatus("WINNER", "NOT_ATTEMPTED")).toBe("WINNER");
    expect(getBetterStatus("NOT_ATTEMPTED", "WINNER")).toBe("WINNER");
  });

  it("normalizes case and the PARTICIPATED alias before comparing", () => {
    expect(getBetterStatus("winner", "finalist")).toBe("WINNER");
    expect(getBetterStatus("PARTICIPATED", "PARTICIPATED")).toBe("NOT_ATTEMPTED");
  });
});

describe("FINAL_STATUS_TO_PLACEMENT", () => {
  it("maps SELECTED down to FINALIST", () => {
    expect(FINAL_STATUS_TO_PLACEMENT.SELECTED).toBe("FINALIST");
  });

  it("never awards a placement to a disqualified entrant", () => {
    expect(FINAL_STATUS_TO_PLACEMENT.DISQUALIFIED).toBe("PARTICIPANT");
  });

  it("agrees with STATUS_PRIORITY on which statuses exist", () => {
    expect(Object.keys(FINAL_STATUS_TO_PLACEMENT).sort()).toEqual(
      Object.keys(STATUS_PRIORITY).sort()
    );
  });
});

describe("placementLabel", () => {
  it("uses Nepali-school runner-up wording, not raw enum names", () => {
    expect(placementLabel("RUNNER_UP")).toBe("1st Runner Up");
    expect(placementLabel("THIRD_PLACE")).toBe("2nd Runner Up");
  });

  it("humanizes any other placement", () => {
    expect(placementLabel("WINNER")).toBe("WINNER");
    expect(placementLabel("SPECIAL_MENTION")).toBe("SPECIAL MENTION");
  });

  it("returns an empty string for nothing", () => {
    expect(placementLabel(null)).toBe("");
    expect(placementLabel(undefined)).toBe("");
  });
});

describe("buildLevel", () => {
  it("distinguishes platform events from school events", () => {
    expect(buildLevel({ eventScope: "PLATFORM" })).toBe("PLATFORM");
    expect(buildLevel({ eventScope: "SCHOOL" })).toBe("SCHOOL");
    expect(buildLevel({})).toBe("SCHOOL");
  });
});

describe("filterEntriesForSchool", () => {
  const entries = [
    { id: 1, school: "s1" },
    { id: 2, school: { _id: "s2" } },
    { id: 3, school: "s1" },
  ];

  it("returns everything when no school is given (super admin view)", () => {
    expect(filterEntriesForSchool(entries, "")).toHaveLength(3);
  });

  it("matches a bare school id", () => {
    expect(filterEntriesForSchool(entries, "s1").map((e) => e.id)).toEqual([1, 3]);
  });

  it("matches a populated school document", () => {
    expect(filterEntriesForSchool(entries, "s2").map((e) => e.id)).toEqual([2]);
  });

  it("compares as strings, so an ObjectId-like value still matches", () => {
    const oid = { toString: () => "s1" };
    expect(filterEntriesForSchool(entries, oid).map((e) => e.id)).toEqual([1, 3]);
  });
});
