"use client";

import { FaRegCalendarAlt } from "react-icons/fa";
import useCalendarPreference from "@/lib/useCalendarPreference";

// Compact AD / BS switch. Persists per-user and updates every date on screen.
export default function CalendarToggle({ withLabel = true, className = "" }) {
  const { calendar, setCalendar } = useCalendarPreference();

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {withLabel && (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#52657d]">
          <FaRegCalendarAlt className="text-[#1f4f7a]" />
          Dates
        </span>
      )}
      <div className="inline-flex items-center gap-0.5 rounded-full border border-[#e4e7f2] bg-white p-0.5">
        {[
          ["AD", "AD"],
          ["BS", "BS"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setCalendar(value)}
            aria-pressed={calendar === value}
            title={value === "BS" ? "Bikram Sambat (Nepali)" : "Gregorian (English)"}
            className={`rounded-full px-3 py-1 text-xs font-black transition ${
              calendar === value
                ? "bg-[var(--brand-primary)] text-white"
                : "text-[#52657d] hover:bg-[#f4f6fb]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
