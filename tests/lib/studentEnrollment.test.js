import {
  makeEnrollmentEntry,
  closeCurrentEnrollments,
  getCurrentEnrollment,
  buildAuthoredEraSnapshot,
} from "@/lib/studentEnrollment";

describe("makeEnrollmentEntry", () => {
  it("stamps a CURRENT entry from the academic year", () => {
    const entry = makeEnrollmentEntry({
      school: "school-1",
      schoolName: "Orbit",
      grade: "Grade 5",
      rollNumber: 12,
      academicYear: { year: "2025-26", yearStart: 2025 },
    });

    expect(entry).toMatchObject({
      school: "school-1",
      schoolNameSnapshot: "Orbit",
      grade: "Grade 5",
      rollNumber: "12",
      academicYear: "2025-26",
      academicYearStart: 2025,
      status: "CURRENT",
      endedAt: null,
    });
    expect(entry.startedAt).toBeInstanceOf(Date);
  });

  it("tolerates a missing academic year", () => {
    const entry = makeEnrollmentEntry({ school: "s", grade: "Grade 1" });
    expect(entry.academicYear).toBe("");
    expect(entry.academicYearStart).toBeNull();
    expect(entry.rollNumber).toBe("");
  });
});

describe("closeCurrentEnrollments", () => {
  it("closes only CURRENT entries with the given outcome", () => {
    const student = {
      enrollments: [
        { status: "PROMOTED", endedAt: new Date("2020-01-01") },
        { status: "CURRENT", endedAt: null },
      ],
    };

    closeCurrentEnrollments(student, "TRANSFERRED");

    expect(student.enrollments[0].status).toBe("PROMOTED"); // untouched
    expect(student.enrollments[1].status).toBe("TRANSFERRED");
    expect(student.enrollments[1].endedAt).toBeInstanceOf(Date);
  });

  it("is a no-op when there are no enrollments", () => {
    const student = {};
    expect(() => closeCurrentEnrollments(student, "GRADUATED")).not.toThrow();
  });
});

describe("getCurrentEnrollment", () => {
  it("prefers the CURRENT entry matching the student's current school", () => {
    const student = {
      school: "orbit",
      enrollments: [
        { school: "nepal", status: "TRANSFERRED" },
        { school: "orbit", status: "CURRENT", grade: "Grade 10" },
      ],
    };
    expect(getCurrentEnrollment(student).school).toBe("orbit");
  });

  it("falls back to any CURRENT entry, then the last one", () => {
    expect(
      getCurrentEnrollment({
        school: "x",
        enrollments: [{ school: "a", status: "CURRENT" }],
      }).school
    ).toBe("a");
    expect(
      getCurrentEnrollment({
        school: "x",
        enrollments: [
          { school: "a", status: "PROMOTED" },
          { school: "b", status: "TRANSFERRED" },
        ],
      }).school
    ).toBe("b");
  });

  it("returns null when there are no enrollments", () => {
    expect(getCurrentEnrollment({ enrollments: [] })).toBeNull();
    expect(getCurrentEnrollment({})).toBeNull();
  });
});

describe("buildAuthoredEraSnapshot", () => {
  it("snapshots school + grade + year from the current enrollment", () => {
    const student = {
      school: "nepal",
      grade: "Grade 9",
      enrollments: [
        {
          school: "nepal",
          status: "CURRENT",
          schoolNameSnapshot: "Nepal Model School",
          grade: "Grade 9",
          academicYear: "2026",
          academicYearStart: 2026,
        },
      ],
    };
    expect(buildAuthoredEraSnapshot(student)).toEqual({
      authorSchoolNameSnapshot: "Nepal Model School",
      authorGrade: "Grade 9",
      authorAcademicYear: "2026",
      authorAcademicYearStart: 2026,
    });
  });

  it("falls back to the student's grade with blanks when no enrollment exists", () => {
    expect(buildAuthoredEraSnapshot({ grade: "Grade 5", enrollments: [] })).toEqual({
      authorSchoolNameSnapshot: "",
      authorGrade: "Grade 5",
      authorAcademicYear: "",
      authorAcademicYearStart: null,
    });
  });
});
