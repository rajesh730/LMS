import { planPromotionReversal } from "@/lib/promotionCorrection";

const ACTIVE = 2025;

describe("planPromotionReversal", () => {
  it("plans a revert for a mistakenly promoted student", () => {
    const plan = planPromotionReversal({
      studentStatus: "ACTIVE",
      activeYearStart: ACTIVE,
      schoolEnrollments: [
        { status: "PROMOTED", grade: "Grade 5", academicYearStart: 2024 },
        { status: "CURRENT", grade: "Grade 6", academicYearStart: 2025 },
      ],
    });
    expect(plan).toEqual({
      type: "PROMOTED",
      revertGrade: "Grade 5",
      closedYearStart: 2024,
    });
  });

  it("plans an un-graduate for a mistakenly graduated student", () => {
    const plan = planPromotionReversal({
      studentStatus: "ALUMNI",
      activeYearStart: ACTIVE,
      schoolEnrollments: [
        { status: "PROMOTED", grade: "Grade 9", academicYearStart: 2023 },
        { status: "GRADUATED", grade: "Grade 10", academicYearStart: 2024 },
      ],
    });
    expect(plan).toEqual({
      type: "GRADUATED",
      revertGrade: "Grade 10",
      closedYearStart: 2024,
    });
  });

  it("refuses when the student was retained (not promoted)", () => {
    const plan = planPromotionReversal({
      studentStatus: "ACTIVE",
      activeYearStart: ACTIVE,
      schoolEnrollments: [
        { status: "PROMOTED", grade: "Grade 6", academicYearStart: 2024 },
        { status: "CURRENT", grade: "Grade 6", academicYearStart: 2025 },
      ],
    });
    expect(plan.error).toMatch(/already repeated/);
  });

  it("refuses when there is no current enrollment for the active year", () => {
    const plan = planPromotionReversal({
      studentStatus: "ACTIVE",
      activeYearStart: ACTIVE,
      schoolEnrollments: [
        { status: "PROMOTED", grade: "Grade 5", academicYearStart: 2024 },
      ],
    });
    expect(plan.error).toMatch(/No current enrollment/);
  });

  it("refuses when there was no prior promotion", () => {
    const plan = planPromotionReversal({
      studentStatus: "ACTIVE",
      activeYearStart: ACTIVE,
      schoolEnrollments: [
        { status: "CURRENT", grade: "Grade 6", academicYearStart: 2025 },
      ],
    });
    expect(plan.error).toMatch(/not promoted/);
  });

  it("requires an active year", () => {
    const plan = planPromotionReversal({
      studentStatus: "ACTIVE",
      activeYearStart: null,
      schoolEnrollments: [],
    });
    expect(plan.error).toMatch(/No active academic year/);
  });
});
