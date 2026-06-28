// Pure planner for reversing a *mistaken* promotion after a rollover has run.
//
// Scenario: a school promoted a student who should have repeated (or graduated a
// student who should have stayed). The school's academic year has already
// advanced — we keep that — but the individual student must be put back into
// their previous grade as a "retained" record, and the closed year's summary
// counters corrected (promoted/graduated -1, retained +1).
//
// `schoolEnrollments` must already be filtered to the school in question.
export function planPromotionReversal({
  schoolEnrollments = [],
  studentStatus,
  activeYearStart,
}) {
  if (activeYearStart == null) {
    return { error: "No active academic year to correct against." };
  }

  const entries = Array.isArray(schoolEnrollments) ? schoolEnrollments : [];
  const isAlumni = ["ALUMNI", "GRADUATED"].includes(
    String(studentStatus || "").toUpperCase()
  );

  // ── Graduated by mistake → un-graduate and repeat the top grade ──
  if (isAlumni) {
    const gradEntry = entries
      .filter((e) => e.status === "GRADUATED")
      .sort((a, b) => (b.academicYearStart ?? 0) - (a.academicYearStart ?? 0))[0];

    if (!gradEntry) {
      return { error: "No graduation record found to reverse." };
    }
    return {
      type: "GRADUATED",
      revertGrade: gradEntry.grade,
      closedYearStart: gradEntry.academicYearStart,
      // The graduated entry becomes a RETAINED record; a fresh CURRENT entry is
      // added for the active year (handled by the caller).
    };
  }

  // ── Promoted by mistake → drop back one grade as a repeater ──
  const currentEntry = entries.find(
    (e) => e.status === "CURRENT" && e.academicYearStart === activeYearStart
  );
  if (!currentEntry) {
    return { error: "No current enrollment for the active year was found." };
  }

  const priorPromoted = entries
    .filter(
      (e) =>
        e.status === "PROMOTED" &&
        (e.academicYearStart ?? Infinity) < activeYearStart
    )
    .sort((a, b) => (b.academicYearStart ?? 0) - (a.academicYearStart ?? 0))[0];

  if (!priorPromoted) {
    return { error: "This student was not promoted in the latest rollover." };
  }
  if (priorPromoted.grade === currentEntry.grade) {
    return { error: "This student already repeated the grade — nothing to undo." };
  }

  return {
    type: "PROMOTED",
    revertGrade: priorPromoted.grade,
    closedYearStart: priorPromoted.academicYearStart,
  };
}
