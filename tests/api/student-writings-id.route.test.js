jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock("@/models/SchoolMagazineArticle", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock("@/models/MagazineIssue", () => ({
  __esModule: true,
  default: { updateOne: jest.fn().mockResolvedValue({}) },
}));
jest.mock("@/lib/workIndicatorRealtime", () => ({
  publishWorkIndicatorsUpdate: jest.fn(),
}));
jest.mock("@/lib/magazineNotifications", () => ({
  notifySchoolMagazineSubmitted: jest.fn(),
}));
jest.mock("@/lib/writingCategories", () => ({
  normalizeWritingCategory: (v) => v || "POEM",
}));

import { getServerSession } from "next-auth";
import Student from "@/models/Student";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import MagazineIssue from "@/models/MagazineIssue";
import { notifySchoolMagazineSubmitted } from "@/lib/magazineNotifications";
import { PATCH } from "@/app/api/student/writings/[id]/route";

const ARTICLE_ID = "507f1f77bcf86cd799439011";

function mockStudent(student) {
  Student.findOne.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(student) }),
  });
}

function patchReq(body) {
  return new Request(`http://localhost/api/student/writings/${ARTICLE_ID}`, {
    method: "PATCH",
    body: JSON.stringify(body || {}),
  });
}

function run(body) {
  return PATCH(patchReq(body), { params: { id: ARTICLE_ID } });
}

describe("student writings [id] PATCH — cross-school ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue({
      user: { id: "stu1", role: "STUDENT" },
    });
  });

  it("looks up the writing by author only (not current school)", async () => {
    mockStudent({ _id: "stu1", school: "orbit", name: "Manju" });
    SchoolMagazineArticle.findOne.mockResolvedValue({
      _id: ARTICLE_ID,
      school: "orbit",
      authorStudent: "stu1",
      title: "t",
      content: "c",
      category: "POEM",
      isPublished: false,
      save: jest.fn().mockResolvedValue(undefined),
    });

    await run({ title: "x", content: "y", category: "POEM" });

    const filter = SchoolMagazineArticle.findOne.mock.calls[0][0];
    expect(filter).toHaveProperty("authorStudent", "stu1");
    expect(filter.school).toBeUndefined();
  });

  it("lets her edit a piece from a school she left, without school re-review", async () => {
    mockStudent({ _id: "stu1", school: "orbit", name: "Manju" });
    const article = {
      _id: ARTICLE_ID,
      school: "nepal", // written at a former school
      authorStudent: "stu1",
      title: "old",
      content: "old",
      category: "POEM",
      isPublished: true, // published — would normally be locked
      showOnSchoolWall: true,
      isGlobalWallPublished: true,
      save: jest.fn().mockResolvedValue(undefined),
    };
    SchoolMagazineArticle.findOne.mockResolvedValue(article);

    const res = await run({ title: "New", content: "Better", category: "POEM" });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Writing updated");
    expect(article.title).toBe("New");
    expect(article.content).toBe("Better");
    // Never re-attaches to a school wall or review queue.
    expect(article.showOnSchoolWall).toBe(false);
    expect(article.isGlobalWallPublished).toBe(false);
    expect(article.save).toHaveBeenCalled();
    expect(notifySchoolMagazineSubmitted).not.toHaveBeenCalled();
  });

  it("hides a transferred-out piece and pulls it from the old magazine issue", async () => {
    mockStudent({ _id: "stu1", school: "orbit", name: "Manju" });
    const article = {
      _id: ARTICLE_ID,
      school: "nepal",
      authorStudent: "stu1",
      isPublished: true,
      isMagazinePublished: true,
      magazineIssue: "issue1",
      save: jest.fn().mockResolvedValue(undefined),
    };
    SchoolMagazineArticle.findOne.mockResolvedValue(article);

    const res = await run({ action: "MAKE_PRIVATE" });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toMatch(/hidden/i);
    expect(article.isPublished).toBe(false);
    expect(article.isMagazinePublished).toBe(false);
    // Pulled from the origin school's magazine issue (by the owning school).
    expect(MagazineIssue.updateOne).toHaveBeenCalledWith(
      { _id: "issue1", school: "nepal" },
      { $pull: { articles: ARTICLE_ID } }
    );
  });

  it("still blocks editing a published piece at the student's CURRENT school", async () => {
    mockStudent({ _id: "stu1", school: "orbit", name: "Manju" });
    SchoolMagazineArticle.findOne.mockResolvedValue({
      _id: ARTICLE_ID,
      school: "orbit", // same as current school — normal moderation applies
      authorStudent: "stu1",
      isPublished: true,
      save: jest.fn().mockResolvedValue(undefined),
    });

    const res = await run({ title: "x", content: "y", category: "POEM" });
    expect(res.status).toBe(400);
  });

  it("cannot edit a writing owned by another student", async () => {
    mockStudent({ _id: "stu1", school: "orbit", name: "Manju" });
    SchoolMagazineArticle.findOne.mockResolvedValue(null);

    const res = await run({ title: "Stolen", content: "No", category: "POEM" });

    expect(res.status).toBe(404);
    expect(SchoolMagazineArticle.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: ARTICLE_ID,
        authorStudent: "stu1",
      })
    );
  });
});
