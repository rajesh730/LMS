import {
  formatAuthoredEra,
  getAuthoredSchoolName,
  formatAuthoredAt,
  serializeAuthoredEra,
} from "@/lib/writingProvenance";

describe("formatAuthoredEra", () => {
  it("joins grade and academic year", () => {
    expect(
      formatAuthoredEra({ authorGrade: "Grade 9", authorAcademicYear: "2026" })
    ).toBe("Grade 9 · 2026");
  });

  it("drops missing parts", () => {
    expect(formatAuthoredEra({ authorGrade: "Grade 9" })).toBe("Grade 9");
    expect(formatAuthoredEra({ authorAcademicYear: "2026" })).toBe("2026");
    expect(formatAuthoredEra({})).toBe("");
  });
});

describe("getAuthoredSchoolName", () => {
  it("prefers the authoring-era snapshot", () => {
    expect(
      getAuthoredSchoolName(
        { authorSchoolNameSnapshot: "Nepal Model School" },
        "Orbit"
      )
    ).toBe("Nepal Model School");
  });

  it("falls back to the live name, then a default", () => {
    expect(getAuthoredSchoolName({}, "Orbit")).toBe("Orbit");
    expect(getAuthoredSchoolName({}, "")).toBe("School");
  });
});

describe("formatAuthoredAt", () => {
  it("combines school and era", () => {
    expect(
      formatAuthoredAt(
        {
          authorSchoolNameSnapshot: "Nepal Model School",
          authorGrade: "Grade 9",
          authorAcademicYear: "2026",
        },
        "Orbit"
      )
    ).toBe("Nepal Model School · Grade 9 · 2026");
  });

  it("returns just the school when no era is known", () => {
    expect(
      formatAuthoredAt({ authorSchoolNameSnapshot: "Nepal Model School" })
    ).toBe("Nepal Model School");
  });
});

describe("serializeAuthoredEra", () => {
  it("exposes the era fields with safe defaults", () => {
    expect(serializeAuthoredEra({})).toEqual({
      authorSchoolNameSnapshot: "",
      authorGrade: "",
      authorAcademicYear: "",
    });
    expect(
      serializeAuthoredEra({
        authorSchoolNameSnapshot: "Nepal",
        authorGrade: "Grade 9",
        authorAcademicYear: "2026",
        extra: "ignored",
      })
    ).toEqual({
      authorSchoolNameSnapshot: "Nepal",
      authorGrade: "Grade 9",
      authorAcademicYear: "2026",
    });
  });
});
