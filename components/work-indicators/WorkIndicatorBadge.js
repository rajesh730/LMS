"use client";

import { getWorkIndicatorBadgeText } from "@/lib/workIndicatorLabels";

export default function WorkIndicatorBadge({
  count,
  tone = "action",
  compact = false,
  className = "",
}) {
  const {
    numericCount,
    displayCount,
    fullLabel,
    ariaLabel,
  } = getWorkIndicatorBadgeText({ count, tone });

  if (numericCount <= 0) return null;

  const toneClass =
    tone === "new"
      ? "bg-red-500 text-white"
      : "bg-amber-400 text-[#17120a]";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-black ${toneClass} ${
        compact
          ? "h-5 min-w-5 px-1 text-[10px]"
          : "h-6 min-w-6 px-2 text-xs"
      } ${className}`}
      aria-label={ariaLabel}
      title={fullLabel}
    >
      {compact ? displayCount : fullLabel}
    </span>
  );
}
