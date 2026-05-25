export function getWorkIndicatorDescriptor(tone = "action") {
  return tone === "new" ? "new" : "pending";
}

export function formatWorkIndicatorCount(count) {
  const numericCount = Math.max(0, Number(count) || 0);
  return numericCount > 99 ? "99+" : String(numericCount);
}

export function getWorkIndicatorBadgeText({ count, tone = "action" } = {}) {
  const numericCount = Math.max(0, Number(count) || 0);
  const descriptor = getWorkIndicatorDescriptor(tone);
  const displayCount = formatWorkIndicatorCount(numericCount);

  return {
    numericCount,
    displayCount,
    descriptor,
    shortLabel: displayCount,
    fullLabel: `${displayCount} ${descriptor}`,
    ariaLabel: `${numericCount} ${descriptor} ${numericCount === 1 ? "item" : "items"}`,
  };
}
