import {
  applyAccessLevelDefaults,
  PARENT_ACCESS_LEVELS,
  PARENT_RELATIONSHIP_TYPES,
} from "@/models/ParentStudentLink";

/**
 * §20 — separated / differently-permissioned guardians.
 *
 * The access-level presets are what a school picks in the UI; the individual
 * booleans are what the API enforces. This pins the mapping so a future edit
 * cannot quietly widen what a restricted guardian can do.
 */

describe("access level presets", () => {
  it("FULL grants everything", () => {
    const link = applyAccessLevelDefaults({ accessLevel: "FULL" });
    expect(link).toMatchObject({
      canViewPortfolio: true,
      canReceiveNotices: true,
      canRegisterEvents: true,
      canGiveConsent: true,
      canMessageSchool: true,
    });
  });

  it("VIEW_AND_NOTICES can see and be told, but cannot ACT", () => {
    const link = applyAccessLevelDefaults({ accessLevel: "VIEW_AND_NOTICES" });

    expect(link.canViewPortfolio).toBe(true);
    expect(link.canReceiveNotices).toBe(true);
    // The separated-parent case: informed, but not able to commit the child.
    expect(link.canRegisterEvents).toBe(false);
    expect(link.canGiveConsent).toBe(false);
  });

  it("VIEW_ONLY is portfolio access and nothing else", () => {
    const link = applyAccessLevelDefaults({ accessLevel: "VIEW_ONLY" });

    expect(link.canViewPortfolio).toBe(true);
    expect(link.canReceiveNotices).toBe(false);
    expect(link.canGiveConsent).toBe(false);
    expect(link.canMessageSchool).toBe(false);
  });

  it("never grants consent by default at any level below FULL", () => {
    PARENT_ACCESS_LEVELS.filter((level) => level !== "FULL").forEach((level) => {
      expect(applyAccessLevelDefaults({ accessLevel: level }).canGiveConsent).toBe(
        false
      );
    });
  });

  it("leaves an unknown access level untouched rather than granting anything", () => {
    const link = applyAccessLevelDefaults({ accessLevel: "MADE_UP" });
    expect(link.canGiveConsent).toBeUndefined();
  });

  it("tolerates a null document", () => {
    expect(applyAccessLevelDefaults(null)).toBeNull();
  });
});

describe("relationship types cover the guardians §19 names", () => {
  it.each(["MOTHER", "FATHER", "GRANDPARENT", "LEGAL_GUARDIAN"])(
    "%s is a valid relationship",
    (relationship) => {
      expect(PARENT_RELATIONSHIP_TYPES).toContain(relationship);
    }
  );
});
