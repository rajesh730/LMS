import {
  normalizeCalendar,
  formatAdDate,
  formatBsDate,
  formatDate,
  formatMonthYear,
} from "@/lib/nepaliDate";

describe("normalizeCalendar", () => {
  it("accepts AD, defaults everything else to BS", () => {
    expect(normalizeCalendar("AD")).toBe("AD");
    expect(normalizeCalendar("ad")).toBe("AD");
    expect(normalizeCalendar("BS")).toBe("BS");
    expect(normalizeCalendar("")).toBe("BS");
    expect(normalizeCalendar(undefined)).toBe("BS");
  });
});

describe("formatBsDate (exact conversion)", () => {
  it("converts known dates to Romanized BS", () => {
    // 2026-06-24 AD = Asar 10, 2083 BS
    expect(formatBsDate(new Date(2026, 5, 24))).toBe("Asar 10, 2083");
    // Nepali New Year: 2023-04-14 AD = Baisakh 1, 2080 BS
    expect(formatBsDate(new Date(2023, 3, 14))).toBe("Baisakh 1, 2080");
  });

  it("returns empty for falsy/invalid input", () => {
    expect(formatBsDate(null)).toBe("");
    expect(formatBsDate("not-a-date")).toBe("");
  });
});

describe("formatDate (calendar switch)", () => {
  const date = new Date(2026, 5, 24);

  it("renders AD when calendar is AD/default", () => {
    expect(formatDate(date, "AD")).toBe("Jun 24, 2026");
    expect(formatDate(date)).toBe("Jun 24, 2026");
  });

  it("renders exact BS when calendar is BS", () => {
    expect(formatDate(date, "BS")).toBe("Asar 10, 2083");
  });
});

describe("formatAdDate / formatMonthYear", () => {
  it("formats AD short date", () => {
    expect(formatAdDate(new Date(2026, 5, 24))).toBe("Jun 24, 2026");
  });

  it("formats month + year per calendar", () => {
    expect(formatMonthYear(new Date(2026, 5, 24), "AD")).toBe("June 2026");
    expect(formatMonthYear(new Date(2026, 5, 24), "BS")).toBe("Asar 2083");
  });
});
