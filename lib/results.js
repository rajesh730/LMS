export function formatPlacementLabel(value) {
  if (value === "RUNNER_UP") return "1st Runner Up";
  if (value === "THIRD_PLACE") return "2nd Runner Up";
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


export function buildCertificateCode(id, awardedAt = new Date()) {
  const stamp = new Date(awardedAt).getFullYear();
  const raw = String(id || "").replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `EGT-${stamp}-${raw || "CERT"}`;
}

export function buildCertificatePath(id) {
  return `/certificates/${id}`;
}
