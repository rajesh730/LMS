// Domain tests for lib/eventCatalog.js, extracted from app/api/events/route.js.
import {
  buildTeamKey,
  describeEventForFamilies,
  groupRequestsByEvent,
  validateTeamRules,
} from "@/lib/eventCatalog";
import { resolveParticipationFormat } from "@/lib/eventParticipationFormat";

describe("buildTeamKey", () => {
  it("keys a team by school and normalized name", () => {
    expect(buildTeamKey({ school: "s1", teamName: "  Alpha " })).toBe("s1::alpha");
  });

  it("accepts a populated school document", () => {
    expect(buildTeamKey({ school: { _id: "s1" }, teamName: "Alpha" })).toBe("s1::alpha");
  });

  it("gives unnamed teams a stable placeholder instead of an empty key", () => {
    expect(buildTeamKey({ school: "s1", teamName: "" })).toBe("s1::default-team");
    expect(buildTeamKey({ school: "s1" })).toBe("s1::default-team");
  });

  it("treats names differing only by case or padding as the same team", () => {
    expect(buildTeamKey({ school: "s1", teamName: "ALPHA" })).toBe(
      buildTeamKey({ school: "s1", teamName: "alpha " })
    );
  });
});

describe("validateTeamRules", () => {
  it("ignores team sizes on an individual event", () => {
    expect(
      validateTeamRules({ participationFormat: "INDIVIDUAL", minTeamSize: 9, maxTeamSize: 1 })
    ).toBeNull();
  });

  it("treats unset bounds as 'no limit', not zero", () => {
    expect(validateTeamRules({ participationFormat: "TEAM" })).toBeNull();
    expect(
      validateTeamRules({ participationFormat: "TEAM", minTeamSize: "", maxTeamSize: null })
    ).toBeNull();
  });

  it("rejects sizes below 1", () => {
    expect(validateTeamRules({ participationFormat: "TEAM", minTeamSize: 0 })).toMatch(
      /Minimum team size must be at least 1/
    );
    expect(validateTeamRules({ participationFormat: "TEAM", maxTeamSize: 0 })).toMatch(
      /Maximum team size must be at least 1/
    );
  });

  it("rejects a non-numeric size", () => {
    expect(validateTeamRules({ participationFormat: "TEAM", minTeamSize: "abc" })).toMatch(
      /Minimum team size/
    );
  });

  it("rejects an inverted range", () => {
    expect(
      validateTeamRules({ participationFormat: "TEAM", minTeamSize: 5, maxTeamSize: 2 })
    ).toMatch(/cannot exceed maximum/);
  });

  it("accepts a valid range, including min === max", () => {
    expect(
      validateTeamRules({ participationFormat: "TEAM", minTeamSize: 2, maxTeamSize: 4 })
    ).toBeNull();
    expect(
      validateTeamRules({ participationFormat: "TEAM", minTeamSize: 3, maxTeamSize: 3 })
    ).toBeNull();
  });
});

describe("resolveParticipationFormat (single shared implementation)", () => {
  // Regression: app/api/events/route.js used to carry its own copy that compared
  // `value === "TEAM"` exactly. Creating an event with "team" stored INDIVIDUAL,
  // while the read path used the case-insensitive lib version and reported TEAM.
  it("is case-insensitive, so 'team' and 'TEAM' agree", () => {
    expect(resolveParticipationFormat("team")).toBe("TEAM");
    expect(resolveParticipationFormat("TEAM")).toBe("TEAM");
    expect(resolveParticipationFormat("Team")).toBe("TEAM");
  });

  it("infers TEAM from either size bound", () => {
    expect(resolveParticipationFormat("INDIVIDUAL", 2, null)).toBe("TEAM");
    expect(resolveParticipationFormat("INDIVIDUAL", null, 5)).toBe("TEAM");
  });

  it("treats empty-string sizes as unset", () => {
    expect(resolveParticipationFormat("INDIVIDUAL", "", "")).toBe("INDIVIDUAL");
  });

  it("defaults to INDIVIDUAL", () => {
    expect(resolveParticipationFormat(undefined)).toBe("INDIVIDUAL");
  });
});

describe("groupRequestsByEvent", () => {
  it("buckets requests by event id", () => {
    const grouped = groupRequestsByEvent([
      { event: "e1", id: 1 },
      { event: "e2", id: 2 },
      { event: "e1", id: 3 },
    ]);

    expect(grouped.get("e1").map((r) => r.id)).toEqual([1, 3]);
    expect(grouped.get("e2").map((r) => r.id)).toEqual([2]);
  });

  it("skips requests with no event, rather than creating an empty bucket", () => {
    const grouped = groupRequestsByEvent([{ id: 1 }, { event: "", id: 2 }]);
    expect(grouped.size).toBe(0);
  });

  it("handles an empty or missing list", () => {
    expect(groupRequestsByEvent().size).toBe(0);
    expect(groupRequestsByEvent([]).size).toBe(0);
  });
});

describe("describeEventForFamilies", () => {
  it("leads with the description and adds date and eligibility", () => {
    const text = describeEventForFamilies({
      description: "  Inter-house quiz  ",
      date: "2026-03-14T00:00:00.000Z",
      eligibleGrades: ["Grade 9", "Grade 10"],
    });

    expect(text).toContain("Inter-house quiz");
    expect(text).toContain("Date: 14 March 2026");
    expect(text).toContain("For: Grade 9, Grade 10");
    expect(text).toContain("Open Events to see the details.");
  });

  it("spells the date in plain English, not a locale timestamp", () => {
    const text = describeEventForFamilies({ date: "2026-12-01T00:00:00.000Z" });
    expect(text).toContain("Date: 1 December 2026");
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("omits sections it has no data for, but always keeps the call to action", () => {
    expect(describeEventForFamilies({})).toBe("Open Events to see the details.");
  });

  it("stays within the 2000-char Notice.content cap", () => {
    const text = describeEventForFamilies({ description: "x".repeat(5000) });
    expect(text.length).toBe(2000);
  });
});
