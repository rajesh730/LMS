// Domain tests for lib/eventParticipation.js.
//
// These rules used to live inside app/api/events/[id]/participate/route.js and
// could only be reached through an HTTP request. They are pure functions now,
// so they are tested directly — that is the whole point of the extraction.
jest.mock("@/lib/db", () => jest.fn());

import {
  applyDefaultTeamNames,
  buildDefaultTeamName,
  normalizeParticipationFormat,
  normalizeSchoolTeamBaseName,
  normalizeTeamPayload,
  validateMultiTeamPayload,
  validateTeamSelection,
} from "@/lib/eventParticipation";

const teamEvent = { participationFormat: "TEAM", minTeamSize: 2, maxTeamSize: 4 };
const soloEvent = { participationFormat: "INDIVIDUAL" };

describe("normalizeParticipationFormat", () => {
  it("reads an explicit TEAM format", () => {
    expect(normalizeParticipationFormat({ participationFormat: "team" })).toBe("TEAM");
  });

  it("infers TEAM from team-size fields even when the format is unset", () => {
    expect(normalizeParticipationFormat({ minTeamSize: 2 })).toBe("TEAM");
    expect(normalizeParticipationFormat({ maxTeamSize: 5 })).toBe("TEAM");
  });

  it("defaults to INDIVIDUAL", () => {
    expect(normalizeParticipationFormat({})).toBe("INDIVIDUAL");
    expect(normalizeParticipationFormat(null)).toBe("INDIVIDUAL");
  });
});

describe("normalizeSchoolTeamBaseName", () => {
  it("drops the word 'school' and collapses whitespace", () => {
    expect(normalizeSchoolTeamBaseName("Everest  Public School")).toBe("Everest Public");
  });

  it("falls back to 'School' when nothing is left", () => {
    expect(normalizeSchoolTeamBaseName("School")).toBe("School");
    expect(normalizeSchoolTeamBaseName("")).toBe("School");
  });
});

describe("buildDefaultTeamName", () => {
  it("does not number the first team", () => {
    expect(buildDefaultTeamName("Everest School", 0)).toBe("Team Everest");
  });

  it("numbers subsequent teams from 2", () => {
    expect(buildDefaultTeamName("Everest School", 1)).toBe("Team Everest 2");
    expect(buildDefaultTeamName("Everest School", 2)).toBe("Team Everest 3");
  });
});

describe("validateTeamSelection", () => {
  it("skips validation entirely for individual events", () => {
    expect(validateTeamSelection(soloEvent, [], "", "")).toBeNull();
  });

  it("requires a team name", () => {
    expect(validateTeamSelection(teamEvent, ["a", "b"], "  ", "a")).toMatch(
      /require a team name/
    );
  });

  it("requires a captain", () => {
    expect(validateTeamSelection(teamEvent, ["a", "b"], "Alpha", "")).toMatch(
      /require a team captain/
    );
  });

  it("requires the captain to be one of the members", () => {
    expect(validateTeamSelection(teamEvent, ["a", "b"], "Alpha", "zz")).toMatch(
      /captain must be included/
    );
  });

  it("enforces the minimum team size", () => {
    expect(validateTeamSelection(teamEvent, ["a"], "Alpha", "a")).toMatch(
      /at least 2 team members/
    );
  });

  it("enforces the maximum team size", () => {
    expect(
      validateTeamSelection(teamEvent, ["a", "b", "c", "d", "e"], "Alpha", "a")
    ).toMatch(/at most 4 team members/);
  });

  it("counts duplicate ids once, so a padded roster is still too small", () => {
    expect(validateTeamSelection(teamEvent, ["a", "a", "a"], "Alpha", "a")).toMatch(
      /at least 2 team members/
    );
  });

  it("accepts a valid team", () => {
    expect(validateTeamSelection(teamEvent, ["a", "b"], "Alpha", "a")).toBeNull();
  });
});

describe("normalizeTeamPayload", () => {
  it("trims, dedupes and stringifies member ids", () => {
    expect(
      normalizeTeamPayload([
        { teamName: "  Alpha ", captainStudentId: " a ", studentIds: ["a", "a", 7] },
      ])
    ).toEqual([{ teamName: "Alpha", captainStudentId: "a", studentIds: ["a", "7"] }]);
  });

  it("accepts `students` as an alias for `studentIds`", () => {
    expect(normalizeTeamPayload([{ teamName: "Alpha", students: ["x"] }])[0].studentIds)
      .toEqual(["x"]);
  });

  it("drops entries that are entirely empty", () => {
    expect(normalizeTeamPayload([{ teamName: "", studentIds: [] }])).toEqual([]);
  });

  it("tolerates a non-array payload", () => {
    expect(normalizeTeamPayload(null)).toEqual([]);
    expect(normalizeTeamPayload("nope")).toEqual([]);
  });
});

describe("applyDefaultTeamNames", () => {
  it("only fills in names that are missing", () => {
    const result = applyDefaultTeamNames(
      [{ teamName: "Chosen", studentIds: [] }, { teamName: "", studentIds: [] }],
      "Everest School"
    );
    expect(result.map((t) => t.teamName)).toEqual(["Chosen", "Team Everest 2"]);
  });
});

describe("validateMultiTeamPayload", () => {
  it("skips validation for individual events", () => {
    expect(validateMultiTeamPayload(soloEvent, [])).toBeNull();
  });

  it("requires at least one team", () => {
    expect(validateMultiTeamPayload(teamEvent, [])).toMatch(/at least one team/);
  });

  it("rejects duplicate team names case-insensitively", () => {
    const teams = [
      { teamName: "Alpha", captainStudentId: "a", studentIds: ["a", "b"] },
      { teamName: "alpha", captainStudentId: "c", studentIds: ["c", "d"] },
    ];
    expect(validateMultiTeamPayload(teamEvent, teams)).toMatch(/Duplicate team name/);
  });

  it("prefixes a per-team failure with that team's name", () => {
    const teams = [{ teamName: "Alpha", captainStudentId: "a", studentIds: ["a"] }];
    expect(validateMultiTeamPayload(teamEvent, teams)).toMatch(
      /^Alpha: This event requires at least 2/
    );
  });

  it("rejects the same student appearing in two teams", () => {
    const teams = [
      { teamName: "Alpha", captainStudentId: "a", studentIds: ["a", "b"] },
      { teamName: "Beta", captainStudentId: "b", studentIds: ["b", "c"] },
    ];
    expect(validateMultiTeamPayload(teamEvent, teams)).toMatch(
      /cannot be added to more than one team/
    );
  });

  it("accepts a valid multi-team payload", () => {
    const teams = [
      { teamName: "Alpha", captainStudentId: "a", studentIds: ["a", "b"] },
      { teamName: "Beta", captainStudentId: "c", studentIds: ["c", "d"] },
    ];
    expect(validateMultiTeamPayload(teamEvent, teams)).toBeNull();
  });
});

