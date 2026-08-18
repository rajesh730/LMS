// The canonical session -> Student query, consolidated from 20 hand-copied
// versions across 16 routes and 4 lib modules.
import { buildStudentLookupForSession } from "@/lib/studentIdentity";

describe("buildStudentLookupForSession", () => {
  const session = { user: { id: "u1", email: "kid@example.com" } };

  it("matches all four identity fields", () => {
    // User and Student are separate collections, so a signed-in student can be
    // reached by any of these. Dropping one silently locks those students out.
    expect(buildStudentLookupForSession(session).$or).toEqual([
      { _id: "u1" },
      { userId: "u1" },
      { email: "kid@example.com" },
      { username: "kid@example.com" },
    ]);
  });

  it("excludes deleted and non-active students", () => {
    const query = buildStudentLookupForSession(session);
    expect(query.isDeleted).toEqual({ $ne: true });
    expect(query.status).toBe("ACTIVE");
  });

  it("is spreadable so callers can add their own scoping", () => {
    const scoped = { ...buildStudentLookupForSession(session), school: "s1" };
    expect(scoped.school).toBe("s1");
    expect(scoped.$or).toHaveLength(4);
    expect(scoped.status).toBe("ACTIVE");
  });

  it("returns a fresh object each call, so callers cannot corrupt each other", () => {
    const first = buildStudentLookupForSession(session);
    first.$or.push({ rogue: true });
    expect(buildStudentLookupForSession(session).$or).toHaveLength(4);
  });
});
