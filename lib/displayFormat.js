// Canonical display helpers so labels/dates read identically on every screen.

const PLACEMENT_LABELS = {
  WINNER: "Winner",
  RUNNER_UP: "1st Runner Up",
  THIRD_PLACE: "2nd Runner Up",
  FINALIST: "Finalist",
  SPECIAL_MENTION: "Special Mention",
  MERIT: "Merit",
  PARTICIPANT: "Participant",
};

/** One consistent, title-cased placement label across the whole app. */
export function formatPlacement(value) {
  const key = String(value || "").toUpperCase();
  if (PLACEMENT_LABELS[key]) return PLACEMENT_LABELS[key];
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** One consistent date format (e.g. "5 Jun 2026"). */
export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
