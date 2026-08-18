"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { normalizeCalendar } from "@/lib/nepaliDate";

// The signed-in user's preferred display calendar ("AD" | "BS"), read from the
// session, plus a setter that persists the choice and refreshes the session so
// every date on screen updates app-wide.
export default function useCalendarPreference() {
  const { data: session, update } = useSession();
  const calendar = normalizeCalendar(session?.user?.calendarPreference);

  const setCalendar = useCallback(
    async (next) => {
      const value = normalizeCalendar(next);
      await fetch("/api/me/calendar-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendar: value }),
      }).catch(() => {});
      await update?.();
    },
    [update]
  );

  return { calendar, setCalendar };
}
