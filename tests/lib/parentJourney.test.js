jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/Achievement", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/SchoolMagazineArticle", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/ParticipationRequest", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/Event", () => ({ __esModule: true, default: {} }));

import Student from "@/models/Student";
import User from "@/models/User";
import Achievement from "@/models/Achievement";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import ParticipationRequest from "@/models/ParticipationRequest";
import {
  buildStudentJourney,
  groupJourney,
  matchesFilter,
} from "@/lib/parentJourney";

/**
 * The Journey is DERIVED from source entities, so the properties worth testing
 * are the ones a stored timeline would get wrong: transfer attribution (§24),
 * absence of duplicates (§35), and grouping.
 */

const AAYUSH = "1111111111111111111111a1";
const ORBIT = "6666666666666666666666s2";
const GREEN_VILLAGE = "5555555555555555555555s1";
const DEBATE_EVENT = "7777777777777777777777e1";

function selectLean(value) {
  return { select: () => ({ lean: () => Promise.resolve(value) }) };
}

function achievementQuery(value) {
  return {
    sort: () => ({
      select: () => ({
        populate: () => ({ lean: () => Promise.resolve(value) }),
      }),
    }),
  };
}

function writingQuery(value) {
  return {
    sort: () => ({ select: () => ({ lean: () => Promise.resolve(value) }) }),
  };
}

function participationQuery(value) {
  return {
    sort: () => ({
      select: () => ({
        populate: () => ({ lean: () => Promise.resolve(value) }),
      }),
    }),
  };
}

/** A student who moved Orbit (2025) → Green Village (2026). */
function transferredStudent() {
  return {
    _id: AAYUSH,
    name: "Aayush Sharma",
    grade: "Grade 8",
    school: GREEN_VILLAGE,
    status: "ACTIVE",
    enrollments: [
      {
        school: ORBIT,
        schoolNameSnapshot: "Orbit English Secondary School",
        grade: "Grade 7",
        academicYear: "2025-26",
        academicYearStart: 2025,
        status: "TRANSFERRED",
        startedAt: new Date("2025-04-01"),
        endedAt: new Date("2025-12-31"),
      },
      {
        school: GREEN_VILLAGE,
        schoolNameSnapshot: "Green Village Secondary School",
        grade: "Grade 8",
        academicYear: "2026-27",
        academicYearStart: 2026,
        status: "CURRENT",
        startedAt: new Date("2026-01-01"),
        endedAt: null,
      },
    ],
  };
}

function mockSchools() {
  User.find.mockReturnValue(
    selectLean([
      { _id: ORBIT, schoolName: "Orbit English Secondary School" },
      { _id: GREEN_VILLAGE, schoolName: "Green Village Secondary School" },
    ])
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  Achievement.find.mockReturnValue(achievementQuery([]));
  SchoolMagazineArticle.find.mockReturnValue(writingQuery([]));
  ParticipationRequest.find.mockReturnValue(participationQuery([]));
});

describe("transferred student (§24) — history keeps its original school", () => {
  it("attributes an old-school achievement to the OLD school", async () => {
    Student.findOne.mockReturnValue(selectLean(transferredStudent()));
    mockSchools();
    Achievement.find.mockReturnValue(
      achievementQuery([
        {
          _id: "ach-orbit",
          title: "Creative Writing Certificate",
          placement: "WINNER",
          awardedAt: new Date("2025-07-10"),
          school: ORBIT,
          event: null,
        },
      ])
    );

    const journey = await buildStudentJourney(AAYUSH);
    const achievement = journey.entries.find((e) => e.id === "achievement:ach-orbit");

    // NOT the child's current school.
    expect(achievement.school.name).toBe("Orbit English Secondary School");
    expect(achievement.academicYear).toBe("2025-26");
  });

  it("emits a milestone for each school, so the move is visible", async () => {
    Student.findOne.mockReturnValue(selectLean(transferredStudent()));
    mockSchools();

    const journey = await buildStudentJourney(AAYUSH);
    const milestones = journey.entries.filter((e) => e.type === "MILESTONE");

    expect(milestones).toHaveLength(2);
    expect(milestones.map((m) => m.title)).toEqual(
      expect.arrayContaining([
        "Joined Orbit English Secondary School",
        "Moved to Green Village Secondary School",
      ])
    );
  });

  it("groups by year so 2025 = Orbit and 2026 = Green Village", async () => {
    Student.findOne.mockReturnValue(selectLean(transferredStudent()));
    mockSchools();

    const journey = await buildStudentJourney(AAYUSH);
    const groups = groupJourney(journey.entries, "YEAR");

    const y2026 = groups.find((g) => g.key === "2026");
    const y2025 = groups.find((g) => g.key === "2025");

    expect(y2026.subLabel).toBe("Green Village Secondary School");
    expect(y2025.subLabel).toBe("Orbit English Secondary School");
    // Newest year first.
    expect(groups[0].key).toBe("2026");
  });
});

describe("graduated student (§25) — the journey survives", () => {
  it("adds a graduation milestone and keeps every entry", async () => {
    Student.findOne.mockReturnValue(
      selectLean({
        _id: AAYUSH,
        name: "Aayush",
        grade: "Grade 10",
        school: GREEN_VILLAGE,
        status: "GRADUATED",
        enrollments: [
          {
            school: GREEN_VILLAGE,
            schoolNameSnapshot: "Green Village Secondary School",
            grade: "Grade 10",
            academicYear: "2026-27",
            academicYearStart: 2026,
            status: "GRADUATED",
            startedAt: new Date("2026-01-01"),
            endedAt: new Date("2026-12-20"),
          },
        ],
      })
    );
    mockSchools();

    const journey = await buildStudentJourney(AAYUSH);
    const titles = journey.entries.map((e) => e.title);

    expect(titles).toContain("Graduated from Green Village Secondary School");
    expect(journey.student.status).toBe("GRADUATED");
  });
});

describe("no duplicate entries (§35)", () => {
  it("attaches a certificate to its achievement instead of adding a second entry", async () => {
    Student.findOne.mockReturnValue(selectLean(transferredStudent()));
    mockSchools();
    Achievement.find.mockReturnValue(
      achievementQuery([
        {
          _id: "ach-1",
          title: "Best Speaker",
          placement: "WINNER",
          awardedAt: new Date("2026-06-18"),
          school: GREEN_VILLAGE,
          event: { _id: DEBATE_EVENT, title: "Inter-School Debate" },
          certificateCode: "PRV-123",
          certificateUrl: "https://example.com/cert.pdf",
          certificateIssuedAt: new Date("2026-06-20"),
          certificateState: "CERTIFICATE_ACTIVE",
        },
      ])
    );

    const journey = await buildStudentJourney(AAYUSH);
    const forThisAward = journey.entries.filter((e) =>
      e.title.includes("Best Speaker")
    );

    // Exactly ONE timeline node, carrying the certificate.
    expect(forThisAward).toHaveLength(1);
    expect(forThisAward[0].certificate.code).toBe("PRV-123");
    // …but it IS reachable through the Certificates filter.
    expect(matchesFilter(forThisAward[0], "CERTIFICATES")).toBe(true);
    expect(journey.counts.CERTIFICATES).toBe(1);
  });

  it("suppresses the participation entry when the same event produced an award", async () => {
    Student.findOne.mockReturnValue(selectLean(transferredStudent()));
    mockSchools();
    Achievement.find.mockReturnValue(
      achievementQuery([
        {
          _id: "ach-1",
          title: "Best Speaker",
          placement: "WINNER",
          awardedAt: new Date("2026-06-18"),
          school: GREEN_VILLAGE,
          event: { _id: DEBATE_EVENT, title: "Inter-School Debate" },
        },
      ])
    );
    ParticipationRequest.find.mockReturnValue(
      participationQuery([
        {
          _id: "part-1",
          status: "ENROLLED",
          school: GREEN_VILLAGE,
          event: { _id: DEBATE_EVENT, title: "Inter-School Debate", date: new Date("2026-06-18") },
        },
      ])
    );

    const journey = await buildStudentJourney(AAYUSH);

    expect(journey.entries.filter((e) => e.type === "EVENT")).toHaveLength(0);
    expect(journey.entries.filter((e) => e.type === "ACHIEVEMENT")).toHaveLength(1);
  });

  it("KEEPS a participation entry when there was no award", async () => {
    Student.findOne.mockReturnValue(selectLean(transferredStudent()));
    mockSchools();
    ParticipationRequest.find.mockReturnValue(
      participationQuery([
        {
          _id: "part-2",
          status: "ENROLLED",
          school: GREEN_VILLAGE,
          event: {
            _id: "other-event",
            title: "Science Exhibition",
            date: new Date("2026-07-22"),
          },
        },
      ])
    );

    const journey = await buildStudentJourney(AAYUSH);

    expect(
      journey.entries.filter((e) => e.title === "Science Exhibition")
    ).toHaveLength(1);
  });
});

describe("filters", () => {
  it("separates RESEARCH from general writing", async () => {
    Student.findOne.mockReturnValue(selectLean(transferredStudent()));
    mockSchools();
    SchoolMagazineArticle.find.mockReturnValue(
      writingQuery([
        {
          _id: "w1",
          title: "The Future of AI",
          category: "BLOG_ARTICLE",
          school: GREEN_VILLAGE,
          publishedAt: new Date("2026-08-03"),
          status: "APPROVED",
        },
        {
          _id: "w2",
          title: "Water Quality Study",
          category: "RESEARCH",
          school: GREEN_VILLAGE,
          publishedAt: new Date("2026-05-21"),
          status: "APPROVED",
        },
      ])
    );

    const journey = await buildStudentJourney(AAYUSH);

    expect(journey.counts.WRITING).toBe(1);
    expect(journey.counts.RESEARCH).toBe(1);
  });

  it("ALL matches everything", () => {
    expect(matchesFilter({ type: "MILESTONE" }, "ALL")).toBe(true);
    expect(matchesFilter({ type: "ACHIEVEMENT" }, "ACHIEVEMENTS")).toBe(true);
    expect(matchesFilter({ type: "ACHIEVEMENT" }, "WRITING")).toBe(false);
  });
});

describe("ordering", () => {
  it("returns newest first and does not float undated entries to the top", async () => {
    Student.findOne.mockReturnValue(selectLean(transferredStudent()));
    mockSchools();
    Achievement.find.mockReturnValue(
      achievementQuery([
        {
          _id: "old",
          title: "Old award",
          placement: "MERIT",
          awardedAt: new Date("2025-05-01"),
          school: ORBIT,
          event: null,
        },
        {
          _id: "undated",
          title: "Undated award",
          placement: "MERIT",
          awardedAt: null,
          school: GREEN_VILLAGE,
          event: null,
        },
        {
          _id: "new",
          title: "New award",
          placement: "WINNER",
          awardedAt: new Date("2026-08-12"),
          school: GREEN_VILLAGE,
          event: null,
        },
      ])
    );

    const journey = await buildStudentJourney(AAYUSH);
    const titles = journey.entries.map((e) => e.title);

    expect(titles.indexOf("New award")).toBeLessThan(titles.indexOf("Old award"));
    expect(titles[titles.length - 1]).toBe("Undated award");
  });
});
