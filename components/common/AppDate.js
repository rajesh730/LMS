"use client";

import { useSession } from "next-auth/react";
import {
  formatDate,
  formatDateTime,
  formatMonthYear,
  normalizeCalendar,
} from "@/lib/nepaliDate";

// Renders a date in the viewer's preferred calendar (AD or BS). Safe to use
// inside server components as a client island — it reads the session client-side
// and falls back to AD for logged-out viewers.
export default function AppDate({
  value,
  mode = "date", // "date" | "monthYear" | "dateTime"
  calendar, // optional explicit override
  withYear = true,
  className = "",
  fallback = null,
}) {
  const { data: session } = useSession();
  if (!value) return fallback;

  const cal = normalizeCalendar(calendar || session?.user?.calendarPreference);
  const text =
    mode === "monthYear"
      ? formatMonthYear(value, cal)
      : mode === "dateTime"
      ? formatDateTime(value, cal)
      : formatDate(value, cal, { withYear });

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
