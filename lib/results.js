export const RESULT_PLACEMENTS = [
  "WINNER",
  "RUNNER_UP",
  "THIRD_PLACE",
  "MERIT",
  "SPECIAL_MENTION",
  "PARTICIPANT",
];

export function formatPlacementLabel(value) {
  return String(value || "").replaceAll("_", " ");
}

export function sanitizeScorecardCriteria(criteria) {
  if (!Array.isArray(criteria)) return [];

  return criteria
    .map((criterion) => ({
      label: String(criterion?.label || "").trim(),
      maxScore: Number.isFinite(Number(criterion?.maxScore))
        ? Math.max(1, Math.min(100, Math.round(Number(criterion.maxScore))))
        : 10,
    }))
    .filter((criterion) => criterion.label)
    .slice(0, 8);
}

export function buildScorecard(criteria, scores) {
  const normalizedCriteria = sanitizeScorecardCriteria(criteria);
  const scoreMap = new Map(
    Array.isArray(scores)
      ? scores
          .filter((entry) => entry?.label)
          .map((entry) => [
            String(entry.label).trim(),
            {
              score: Number(entry.score),
              comment: String(entry.comment || "").trim(),
            },
          ])
      : []
  );

  return normalizedCriteria.map((criterion) => {
    const existing = scoreMap.get(criterion.label);
    const rawScore = Number.isFinite(existing?.score) ? existing.score : 0;
    const score = Math.max(
      0,
      Math.min(criterion.maxScore, Math.round(rawScore * 100) / 100)
    );

    return {
      label: criterion.label,
      maxScore: criterion.maxScore,
      score,
      comment: existing?.comment || "",
    };
  });
}

export function getScoreTotals(scorecard) {
  const entries = Array.isArray(scorecard) ? scorecard : [];
  const totalScore = entries.reduce(
    (sum, entry) => sum + Number(entry?.score || 0),
    0
  );
  const maxScore = entries.reduce(
    (sum, entry) => sum + Number(entry?.maxScore || 0),
    0
  );

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore,
    scorePercentage:
      maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0,
  };
}

export function buildCertificateCode(id, awardedAt = new Date()) {
  const stamp = new Date(awardedAt).getFullYear();
  const raw = String(id || "").replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `EGT-${stamp}-${raw || "CERT"}`;
}

export function buildCertificatePath(id) {
  return `/certificates/${id}`;
}
