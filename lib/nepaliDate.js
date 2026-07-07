import NepaliDate from "nepali-date-converter";

// Date display in the user's chosen calendar: Gregorian (AD) or Bikram Sambat
// (BS). BS uses an exact, table-based conversion (via nepali-date-converter),
// not the +57 year approximation used for academic-year *labels*. Month names
// are Romanized (e.g. "Asar 10, 2083") to suit schools registered in English.

// Bikram Sambat (BS) is the platform default; only an explicit "AD" opts out.
export function normalizeCalendar(value) {
  return String(value || "").toUpperCase() === "AD" ? "AD" : "BS";
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// AD short date, e.g. "Jun 24, 2026".
export function formatAdDate(value, { withYear = true } = {}) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

// Exact BS date, Romanized, e.g. "Asar 10, 2083".
export function formatBsDate(value, { withYear = true } = {}) {
  const date = toDate(value);
  if (!date) return "";
  try {
    return new NepaliDate(date).format(withYear ? "MMMM D, YYYY" : "MMMM D");
  } catch {
    // Out of the converter's supported range — fall back to AD rather than fail.
    return formatAdDate(value, { withYear });
  }
}

// Format a date in the requested calendar ("AD" | "BS").
export function formatDate(value, calendar = "AD", options = {}) {
  return normalizeCalendar(calendar) === "BS"
    ? formatBsDate(value, options)
    : formatAdDate(value, options);
}

// Date + time, e.g. "Asar 10, 2083, 2:14 PM" / "Jun 24, 2026, 2:14 PM". The time
// part is calendar-agnostic; only the date switches with the calendar.
export function formatDateTime(value, calendar = "AD") {
  const date = toDate(value);
  if (!date) return "";
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatDate(value, calendar)}, ${time}`;
}

// Month + year only, e.g. "Asar 2083" / "June 2026" — for "since"/range labels.
export function formatMonthYear(value, calendar = "AD") {
  const date = toDate(value);
  if (!date) return "";
  if (normalizeCalendar(calendar) === "BS") {
    try {
      return new NepaliDate(date).format("MMMM YYYY");
    } catch {
      /* fall through to AD */
    }
  }
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
