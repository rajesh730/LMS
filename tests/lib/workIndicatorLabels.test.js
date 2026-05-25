import {
  formatWorkIndicatorCount,
  getWorkIndicatorBadgeText,
  getWorkIndicatorDescriptor,
} from "@/lib/workIndicatorLabels";

describe("work indicator badge labels", () => {
  it("uses pending language for action items", () => {
    expect(getWorkIndicatorDescriptor("action")).toBe("pending");
    expect(getWorkIndicatorBadgeText({ count: 3, tone: "action" })).toEqual({
      numericCount: 3,
      displayCount: "3",
      descriptor: "pending",
      shortLabel: "3",
      fullLabel: "3 pending",
      ariaLabel: "3 pending items",
    });
  });

  it("uses new language for unseen updates", () => {
    expect(getWorkIndicatorBadgeText({ count: 1, tone: "new" })).toEqual({
      numericCount: 1,
      displayCount: "1",
      descriptor: "new",
      shortLabel: "1",
      fullLabel: "1 new",
      ariaLabel: "1 new item",
    });
  });

  it("caps large counts for compact display without losing accessible count", () => {
    expect(formatWorkIndicatorCount(120)).toBe("99+");
    expect(getWorkIndicatorBadgeText({ count: 120, tone: "new" })).toMatchObject({
      numericCount: 120,
      displayCount: "99+",
      fullLabel: "99+ new",
      ariaLabel: "120 new items",
    });
  });
});
