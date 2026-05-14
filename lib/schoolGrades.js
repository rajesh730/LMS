export function normalizeSchoolLevelConfig(config = {}) {
  const source = config.schoolLevel || config;
  const minGrade = Math.max(1, Number.parseInt(source.minGrade, 10) || 1);
  const maxGrade = Math.min(
    10,
    Math.max(minGrade, Number.parseInt(source.maxGrade, 10) || 10)
  );

  return {
    schoolLevel: {
      minGrade,
      maxGrade,
    },
  };
}

export function buildGradeLabels(config = {}) {
  const normalized = normalizeSchoolLevelConfig(config);
  const { minGrade, maxGrade } = normalized.schoolLevel;

  return Array.from(
    { length: maxGrade - minGrade + 1 },
    (_, index) => `Grade ${minGrade + index}`
  );
}

export function normalizeGradeValue(grade) {
  const value = String(grade || "").trim();
  if (!value) return "";

  const match = value.match(/\d+/);
  if (!match) return value;

  const gradeNumber = Number.parseInt(match[0], 10);
  if (!Number.isFinite(gradeNumber)) return value;

  return `Grade ${gradeNumber}`;
}

export function gradeListContains(eligibleGrades = [], grade) {
  if (!Array.isArray(eligibleGrades) || eligibleGrades.length === 0) {
    return true;
  }

  const normalizedGrade = normalizeGradeValue(grade);
  return eligibleGrades.some(
    (eligibleGrade) => normalizeGradeValue(eligibleGrade) === normalizedGrade
  );
}

export function getEquivalentGradeValues(grade) {
  const value = String(grade || "").trim();
  const normalized = normalizeGradeValue(value);
  const match = normalized.match(/\d+/);
  const numeric = match ? String(Number.parseInt(match[0], 10)) : "";

  return Array.from(new Set([value, normalized, numeric].filter(Boolean)));
}
