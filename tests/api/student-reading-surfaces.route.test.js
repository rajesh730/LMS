jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock("@/models/SchoolMagazineArticle", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/MagazineIssue", () => ({
  __esModule: true,
  default: { find: jest.fn(), findOne: jest.fn() },
}));

import { getServerSession } from "next-auth";
import Student from "@/models/Student";
import MagazineIssue from "@/models/MagazineIssue";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { GET as getSchoolWall } from "@/app/api/student/school-wall/route";
import { GET as getMagazine } from "@/app/api/student/magazine/route";

function mockStudent() {
  Student.findOne.mockReturnValue({
    select: () => ({
      lean: () =>
        Promise.resolve({
          _id: "student-1",
          school: "school-a",
          name: "Manju",
          grade: "9",
          rollNumber: "4",
        }),
    }),
  });
}

describe("student reading surface isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue({
      user: { id: "student-1", role: "STUDENT" },
    });
    mockStudent();
  });

  it("loads School Wall items only from the student's current school", async () => {
    const lean = jest.fn().mockResolvedValue([]);
    SchoolMagazineArticle.find.mockReturnValue({
      populate: () => ({
        sort: () => ({
          limit: () => ({ lean }),
        }),
      }),
    });

    const response = await getSchoolWall();

    expect(response.status).toBe(200);
    expect(SchoolMagazineArticle.find).toHaveBeenCalledWith({
      school: "school-a",
      status: { $in: ["SUBMITTED", "APPROVED"] },
      showOnSchoolWall: { $ne: false },
      isDeleted: { $ne: true },
    });
  });

  it("requests published issues only and excludes empty issues", async () => {
    MagazineIssue.find.mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.resolve([
            {
              _id: "issue-with-content",
              school: "school-a",
              title: "June Magazine 1",
              month: 6,
              year: 2026,
              weekNumber: 1,
              weekStart: new Date("2026-06-01"),
              weekEnd: new Date("2026-06-30"),
              status: "PUBLISHED",
            },
            {
              _id: "empty-issue",
              school: "school-a",
              title: "June Magazine 2",
              month: 6,
              year: 2026,
              weekNumber: 2,
              weekStart: new Date("2026-06-15"),
              weekEnd: new Date("2026-06-30"),
              status: "PUBLISHED",
            },
          ]),
      }),
    });
    SchoolMagazineArticle.find.mockReturnValue({
      select: () => ({
        sort: () => ({
          lean: () =>
            Promise.resolve([
              {
                _id: "article-1",
                magazineIssue: "issue-with-content",
                title: "A Poem",
                category: "POEM",
              },
            ]),
        }),
      }),
    });

    const response = await getMagazine();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(MagazineIssue.find).toHaveBeenCalledWith({
      school: "school-a",
      status: "PUBLISHED",
    });
    expect(SchoolMagazineArticle.find).toHaveBeenCalledWith(
      expect.objectContaining({
        school: "school-a",
        isMagazinePublished: true,
        isDeleted: { $ne: true },
      })
    );
    expect(payload.issues).toHaveLength(1);
    expect(payload.issues[0].id).toBe("issue-with-content");
  });

  it("rejects non-students before querying school content", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "teacher-1", role: "TEACHER", schoolId: "school-a" },
    });

    const response = await getMagazine();

    expect(response.status).toBe(403);
    expect(Student.findOne).not.toHaveBeenCalled();
    expect(MagazineIssue.find).not.toHaveBeenCalled();
  });
});
