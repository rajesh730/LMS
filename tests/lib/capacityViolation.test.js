// Mock side-effectful imports so loading the route module is cheap; we only
// exercise the pure capacityViolation export here.
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());

import { capacityViolation } from "@/app/api/events/[id]/participate/route";

describe("capacityViolation (event over-enrollment guard)", () => {
  it("allows when under both limits", () => {
    expect(
      capacityViolation({
        schoolActive: 4,
        globalActive: 40,
        maxPerSchool: 5,
        maxTotal: 50,
      })
    ).toBeNull();
  });

  it("allows exactly at the limit", () => {
    expect(
      capacityViolation({
        schoolActive: 5,
        globalActive: 50,
        maxPerSchool: 5,
        maxTotal: 50,
      })
    ).toBeNull();
  });

  it("blocks when the per-school limit is exceeded", () => {
    const msg = capacityViolation({
      schoolActive: 6,
      maxPerSchool: 5,
      maxTotal: 50,
      globalActive: 10,
    });
    expect(msg).toMatch(/school has reached the limit of 5/);
  });

  it("blocks when the global limit is exceeded", () => {
    const msg = capacityViolation({
      schoolActive: 2,
      globalActive: 51,
      maxPerSchool: 5,
      maxTotal: 50,
    });
    expect(msg).toMatch(/reached its limit of 50/);
  });

  it("ignores limits that are unset (0 / falsy)", () => {
    expect(
      capacityViolation({ schoolActive: 999, globalActive: 999 })
    ).toBeNull();
  });

  it("per-school limit takes precedence in the message", () => {
    const msg = capacityViolation({
      schoolActive: 6,
      globalActive: 51,
      maxPerSchool: 5,
      maxTotal: 50,
    });
    expect(msg).toMatch(/school/);
  });
});
