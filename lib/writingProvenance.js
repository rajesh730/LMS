// Formats the authoring-era provenance of a writing — where + when it was
// written — so every surface can label it as history ("Written at Nepal Model
// School · Grade 9 · 2026") rather than a stale current affiliation after the
// author transfers schools. Degrades gracefully when snapshot fields are missing
// (older docs): drops the parts it doesn't have, falls back to the live school
// name. See docs/ACADEMIC_YEAR_AND_PORTFOLIO.md.

// Returns the school name to show for a piece, preferring the authoring-era
// snapshot, then the live origin school, then a neutral default.
export function getAuthoredSchoolName(article = {}, liveSchoolName = "") {
  return (
    article.authorSchoolNameSnapshot ||
    liveSchoolName ||
    "School"
  );
}

// Builds the " · "-joined era detail (grade + academic year), e.g.
// "Grade 9 · 2026". Returns "" when neither is known.
export function formatAuthoredEra(article = {}) {
  const grade = String(article.authorGrade || "").trim();
  const year = String(article.authorAcademicYear || "").trim();
  return [grade, year].filter(Boolean).join(" · ");
}

// Full provenance label, e.g. "Nepal Model School · Grade 9 · 2026".
export function formatAuthoredAt(article = {}, liveSchoolName = "") {
  const name = getAuthoredSchoolName(article, liveSchoolName);
  const era = formatAuthoredEra(article);
  return era ? `${name} · ${era}` : name;
}

// The authoring-era fields to expose from an API serializer, so client cards can
// render provenance. Spread into a serialized article: `...serializeAuthoredEra(doc)`.
export function serializeAuthoredEra(article = {}) {
  return {
    authorSchoolNameSnapshot: article.authorSchoolNameSnapshot || "",
    authorGrade: article.authorGrade || "",
    authorAcademicYear: article.authorAcademicYear || "",
  };
}
