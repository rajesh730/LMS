jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/parentAccess", () => ({ requireParentChild: jest.fn() }));
jest.mock("@/models/Achievement", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/SchoolMagazineArticle", () => ({
  __esModule: true,
  default: { find: jest.fn(), findOne: jest.fn() },
}));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));

import { requireParentChild } from "@/lib/parentAccess";
import Achievement from "@/models/Achievement";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import User from "@/models/User";
import { GET as getPortfolio } from "@/app/api/parent/portfolio/route";
import { GET as getWriting } from "@/app/api/parent/writings/[id]/route";

const student = {
  _id: "student-1",
  name: "Asha",
  school: "school-1",
  enrollments: [],
};

function chainTo(value, methods) {
  const chain = {};
  for (const method of methods) chain[method] = jest.fn(() => chain);
  chain.lean = jest.fn().mockResolvedValue(value);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
  requireParentChild.mockResolvedValue({
    student,
    context: {
      studentId: "student-1",
      schoolId: "school-1",
      schoolName: "Pravyo School",
    },
  });
  Achievement.find.mockReturnValue(
    chainTo([], ["sort", "limit", "select", "populate"])
  );
  User.find.mockReturnValue(chainTo([], ["select"]));
});

it("returns every non-deleted child writing and magazine selection", async () => {
  const writing = {
    _id: "writing-1",
    school: "school-1",
    title: "My Draft",
    content: "Private draft text",
    preview: "Private draft text",
    status: "DRAFT",
    magazineIssue: {
      _id: "issue-1",
      title: "August Magazine 1",
      status: "DRAFT",
    },
    isMagazinePublished: false,
    updatedAt: new Date("2026-08-26"),
  };
  SchoolMagazineArticle.find.mockReturnValue(
    chainTo([writing], ["sort", "limit", "select", "populate"])
  );

  const response = await getPortfolio(
    new Request("http://localhost/api/parent/portfolio?studentId=student-1")
  );
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(SchoolMagazineArticle.find).toHaveBeenCalledWith({
    authorStudent: "student-1",
    isDeleted: { $ne: true },
  });
  expect(json.data.writings[0]).toMatchObject({
    title: "My Draft",
    status: "DRAFT",
    magazineSelected: true,
    magazinePublished: false,
    magazineIssue: { title: "August Magazine 1" },
  });
});

it("lets an authorised parent open a draft while retaining child ownership", async () => {
  SchoolMagazineArticle.findOne.mockReturnValue(
    chainTo(
      {
        _id: "writing-1",
        title: "My Draft",
        content: "Private draft text",
        status: "DRAFT",
        magazineIssue: null,
      },
      ["select", "populate"]
    )
  );

  const response = await getWriting(
    new Request(
      "http://localhost/api/parent/writings/writing-1?studentId=student-1"
    ),
    { params: Promise.resolve({ id: "writing-1" }) }
  );
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(SchoolMagazineArticle.findOne).toHaveBeenCalledWith({
    _id: "writing-1",
    authorStudent: "student-1",
    isDeleted: { $ne: true },
  });
  expect(json.data.writing).toMatchObject({
    status: "DRAFT",
    content: "Private draft text",
  });
});
