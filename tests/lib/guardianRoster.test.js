import {
  isMeaningfulValue,
  hasImportableParentData,
  classifyCoverage,
  buildRosterRows,
  summariseCoverage,
  COVERAGE_LABELS,
  COVERAGE_STATES,
} from "@/lib/guardianRoster";

/**
 * The roster exists to make one thing visible: students whose parent details
 * were captured at registration but never turned into a guardian account.
 * Getting the classification wrong either hides real gaps or nags about
 * students who are fine, so the rules are pinned here.
 */

describe("registration placeholder detection", () => {
  it("treats the literal filler registration writes as empty", () => {
    // EnhancedStudentRegistration defaults blank fields to "To be added".
    expect(isMeaningfulValue("To be added")).toBe(false);
    expect(isMeaningfulValue("to be added")).toBe(false);
    expect(isMeaningfulValue("  TO BE ADDED  ")).toBe(false);
  });

  it("treats other common filler as empty too", () => {
    ["N/A", "na", "none", "-", "--", "nil", "unknown", "Not provided"].forEach(
      (value) => expect(isMeaningfulValue(value)).toBe(false)
    );
  });

  it("accepts a real name", () => {
    expect(isMeaningfulValue("Sita Sharma")).toBe(true);
    expect(isMeaningfulValue("Nabin")).toBe(true);
  });

  it("treats blank and missing as empty", () => {
    expect(isMeaningfulValue("")).toBe(false);
    expect(isMeaningfulValue("   ")).toBe(false);
    expect(isMeaningfulValue(null)).toBe(false);
    expect(isMeaningfulValue(undefined)).toBe(false);
  });

  it("needs only a NAME to be importable — contact details are optional", () => {
    expect(hasImportableParentData({ parentName: "Sita Sharma" })).toBe(true);
    expect(
      hasImportableParentData({
        parentName: "To be added",
        parentEmail: "real@example.com",
      })
    ).toBe(false);
  });
});

describe("coverage classification", () => {
  const withData = { parentName: "Sita Sharma" };
  const withoutData = { parentName: "To be added" };

  it("UNLINKED_DATA when registration has a parent but no guardian exists", () => {
    // The state this whole feature exists to surface.
    expect(classifyCoverage(withData, [])).toBe("UNLINKED_DATA");
  });

  it("NO_GUARDIAN when there is nothing to work from either", () => {
    expect(classifyCoverage(withoutData, [])).toBe("NO_GUARDIAN");
  });

  it("ACTIVATED when at least one guardian is using the app", () => {
    expect(
      classifyCoverage(withData, [
        { status: "ACTIVE", parentAccessState: "PENDING_ACTIVATION" },
        { status: "ACTIVE", parentAccessState: "ACTIVATED" },
      ])
    ).toBe("ACTIVATED");
  });

  it("NOT_ACTIVATED when guardians exist but none have connected", () => {
    expect(
      classifyCoverage(withData, [
        { status: "ACTIVE", parentAccessState: "PENDING_ACTIVATION" },
      ])
    ).toBe("NOT_ACTIVATED");
  });

  it("REVOKED when every link has been withdrawn", () => {
    expect(
      classifyCoverage(withData, [
        { status: "REVOKED", parentAccessState: "REVOKED" },
      ])
    ).toBe("REVOKED");
  });

  it("does not report UNLINKED_DATA once a revoked link exists", () => {
    // A school that deliberately removed a guardian should not be nagged to
    // re-import the same person from the student record.
    expect(classifyCoverage(withData, [{ status: "REVOKED" }])).toBe("REVOKED");
  });

  it("every state has a label, emoji and hint", () => {
    COVERAGE_STATES.filter((state) => state !== "ALL").forEach((state) => {
      const meta = COVERAGE_LABELS[state];
      expect(meta).toBeDefined();
      expect(meta.label).toBeTruthy();
      expect(meta.emoji).toBeTruthy();
      // Colour alone must never carry the meaning.
      expect(meta.hint).toBeTruthy();
    });
  });
});

describe("buildRosterRows", () => {
  const students = [
    {
      _id: "s1",
      name: "Aayush Sharma",
      grade: "Grade 8",
      rollNumber: "12",
      status: "ACTIVE",
      parentName: "Sita Sharma",
      parentContactNumber: "9800000000",
      parentEmail: "To be added",
      guardianRelationship: "MOTHER",
    },
    {
      _id: "s2",
      name: "Aarya Sharma",
      grade: "Grade 4",
      status: "ACTIVE",
      parentName: "To be added",
    },
  ];

  it("attaches guardians to the right student", () => {
    const rows = buildRosterRows({
      students,
      links: [
        {
          _id: "l1",
          parent: "p1",
          student: "s1",
          status: "ACTIVE",
          relationshipType: "MOTHER",
          isPrimaryGuardian: true,
          canGiveConsent: true,
          canReceiveNotices: true,
        },
      ],
      parents: [
        {
          _id: "p1",
          name: "Sita Sharma",
          parentId: "PRV-P-X7K4Q9",
          accessState: "ACTIVATED",
          email: "",
          phone: "",
        },
      ],
    });

    expect(rows[0].guardians).toHaveLength(1);
    expect(rows[0].guardians[0].parentIdentifier).toBe("PRV-P-X7K4Q9");
    expect(rows[0].coverage).toBe("ACTIVATED");
    expect(rows[1].guardians).toHaveLength(0);
  });

  it("exposes registration details, filtering out the placeholders", () => {
    const rows = buildRosterRows({ students, links: [], parents: [] });

    expect(rows[0].registrationParent).toEqual({
      name: "Sita Sharma",
      relationshipType: "MOTHER",
      phone: "9800000000",
      // "To be added" must not become a real email address.
      email: "",
    });
    expect(rows[1].registrationParent).toBeNull();
  });

  it("shows the household name rather than an individual (§20)", () => {
    const rows = buildRosterRows({
      students: [students[0]],
      links: [{ _id: "l1", parent: "p1", student: "s1", status: "ACTIVE" }],
      parents: [
        {
          _id: "p1",
          name: "Sita Sharma",
          isHousehold: true,
          householdName: "Sharma Family",
          accessState: "ACTIVATED",
        },
      ],
    });

    expect(rows[0].guardians[0].name).toBe("Sharma Family");
    expect(rows[0].guardians[0].isHousehold).toBe(true);
  });

  it("counts only ACTIVE links as guardians", () => {
    const rows = buildRosterRows({
      students: [students[0]],
      links: [
        { _id: "l1", parent: "p1", student: "s1", status: "ACTIVE" },
        { _id: "l2", parent: "p2", student: "s1", status: "REVOKED" },
      ],
      parents: [
        { _id: "p1", name: "Sita", accessState: "ACTIVATED" },
        { _id: "p2", name: "Ram", accessState: "REVOKED" },
      ],
    });

    expect(rows[0].guardianCount).toBe(1);
    // Both are still listed so the school can see the revoked one.
    expect(rows[0].guardians).toHaveLength(2);
  });

  it("survives a link whose parent record is missing", () => {
    const rows = buildRosterRows({
      students: [students[0]],
      links: [{ _id: "l1", parent: "ghost", student: "s1", status: "ACTIVE" }],
      parents: [],
    });

    expect(rows[0].guardians[0].name).toBe("Guardian");
    expect(rows[0].guardians[0].parentIdentifier).toBeNull();
  });
});

describe("summariseCoverage", () => {
  it("counts each state", () => {
    const summary = summariseCoverage([
      { coverage: "ACTIVATED" },
      { coverage: "ACTIVATED" },
      { coverage: "UNLINKED_DATA" },
      { coverage: "NO_GUARDIAN" },
      { coverage: "NOT_ACTIVATED" },
      { coverage: "REVOKED" },
    ]);

    expect(summary).toEqual({
      total: 6,
      activated: 2,
      notActivated: 1,
      unlinkedData: 1,
      noGuardian: 1,
      revoked: 1,
    });
  });

  it("handles an empty roster", () => {
    expect(summariseCoverage([]).total).toBe(0);
  });
});
