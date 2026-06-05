import { diversifyBySchool } from "@/lib/schoolDiversifiedFeed";

function item(id, schoolId, date) {
  return { id, schoolId, date };
}

describe("diversifyBySchool", () => {
  it("rotates schools while keeping each school's posts newest-first", () => {
    const items = [
      item("a1", "a", "2026-06-05"),
      item("a2", "a", "2026-06-04"),
      item("a3", "a", "2026-06-03"),
      item("b1", "b", "2026-06-02"),
      item("c1", "c", "2026-06-01"),
    ];

    const diversified = diversifyBySchool(items, {
      limit: 5,
      getSchoolKey: (value) => value.schoolId,
      getTime: (value) => value.date,
    });

    expect(diversified.map((value) => value.id)).toEqual([
      "a1",
      "b1",
      "c1",
      "a2",
      "a3",
    ]);
  });

  it("still fills the feed when only one school has posts", () => {
    const items = [
      item("a1", "a", "2026-06-05"),
      item("a2", "a", "2026-06-04"),
      item("a3", "a", "2026-06-03"),
    ];

    const diversified = diversifyBySchool(items, {
      limit: 3,
      getSchoolKey: (value) => value.schoolId,
      getTime: (value) => value.date,
    });

    expect(diversified.map((value) => value.id)).toEqual(["a1", "a2", "a3"]);
  });
});
