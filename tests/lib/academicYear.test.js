import {
  normalizeCalendar,
  formatAcademicYear,
  buildAcademicYear,
  nextAcademicYear,
  getGradeNumber,
  getOrderedGrades,
  getMaxGradeNumber,
  getNextGrade,
  isTopGrade,
} from "@/lib/academicYear";

describe("academicYear — calendar + year math", () => {
  it("normalizes calendar values, defaulting to AD", () => {
    expect(normalizeCalendar("bs")).toBe("BS");
    expect(normalizeCalendar("AD")).toBe("AD");
    expect(normalizeCalendar("")).toBe("AD");
    expect(normalizeCalendar("garbage")).toBe("AD");
  });

  it("formats AD and BS labels from the canonical AD start year", () => {
    expect(formatAcademicYear(2025, "AD")).toBe("2025-26");
    expect(formatAcademicYear(2099, "AD")).toBe("2099-00");
    // BS = AD + 57 for the session start.
    expect(formatAcademicYear(2025, "BS")).toBe("2082/83");
    expect(formatAcademicYear("not-a-year", "AD")).toBe("");
  });

  it("builds a complete descriptor", () => {
    expect(buildAcademicYear(2025, "AD")).toEqual({
      yearStart: 2025,
      calendar: "AD",
      year: "2025-26",
    });
  });

  it("advances to the next session", () => {
    expect(nextAcademicYear({ yearStart: 2025, calendar: "AD" })).toEqual({
      yearStart: 2026,
      calendar: "AD",
      year: "2026-27",
    });
    expect(nextAcademicYear({ yearStart: 2082 - 57, calendar: "BS" }).year).toBe(
      "2083/84"
    );
  });
});

describe("academicYear — grade progression (promotion brain)", () => {
  const grades = ["Grade 1", "Grade 2", "Grade 3", "Grade 10"];

  it("extracts the numeric grade", () => {
    expect(getGradeNumber("Grade 10")).toBe(10);
    expect(getGradeNumber("10")).toBe(10);
    expect(getGradeNumber("")).toBeNull();
  });

  it("orders + de-duplicates grades ascending", () => {
    expect(getOrderedGrades(["Grade 10", "Grade 2", "Grade 2", "Grade 1"])).toEqual([
      "Grade 1",
      "Grade 2",
      "Grade 10",
    ]);
    expect(getOrderedGrades([])).toEqual([]);
  });

  it("finds the max grade", () => {
    expect(getMaxGradeNumber(grades)).toBe(10);
    expect(getMaxGradeNumber([])).toBeNull();
  });

  it("promotes to the next grade up", () => {
    expect(getNextGrade("Grade 1", grades)).toBe("Grade 2");
    expect(getNextGrade("Grade 2", grades)).toBe("Grade 3");
  });

  it("returns null for the top grade (→ graduation, not a phantom grade)", () => {
    expect(getNextGrade("Grade 10", grades)).toBeNull();
    expect(isTopGrade("Grade 10", grades)).toBe(true);
    expect(isTopGrade("Grade 1", grades)).toBe(false);
  });

  it("never invents a grade above the configured maximum", () => {
    // A student sitting above the max still graduates rather than moving up.
    expect(getNextGrade("Grade 12", ["Grade 1", "Grade 10"])).toBeNull();
  });
});
