jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

jest.mock("@/lib/db", () => jest.fn());

jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock("@/models/PlatformChallenge", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock("@/models/PlatformChallengeSubmission", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

import { getServerSession } from "next-auth";
import Student from "@/models/Student";
import PlatformChallenge from "@/models/PlatformChallenge";
import PlatformChallengeSubmission from "@/models/PlatformChallengeSubmission";
import { GET } from "@/app/api/student/challenges/route";

function createQuery(result) {
  return {
    select() {
      return {
        lean: async () => result,
      };
    },
    sort() {
      return {
        lean: async () => result,
      };
    },
  };
}

describe("GET /api/student/challenges", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("matches challenge target grades using normalized grade values", async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: "student-user-1",
        email: "student@example.com",
        role: "STUDENT",
      },
    });
    Student.findOne.mockReturnValue(
      createQuery({
        _id: "student-1",
        school: "school-1",
        name: "Student One",
        grade: "5",
        rollNumber: "12",
      })
    );
    PlatformChallenge.find.mockReturnValue(
      createQuery([
        {
          _id: "challenge-1",
          title: "Nepali Events",
          prompt: "research on nepali culture and history",
          deadline: new Date(Date.now() + 86400000),
          targetGrades: ["Grade 5"],
        },
        {
          _id: "challenge-2",
          title: "Senior Essay",
          prompt: "advanced topic",
          deadline: new Date(Date.now() + 86400000),
          targetGrades: ["Grade 9"],
        },
      ])
    );
    PlatformChallengeSubmission.find.mockReturnValue(createQuery([]));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.challenges).toEqual([
      expect.objectContaining({
        id: "challenge-1",
        title: "Nepali Events",
        targetGrades: ["Grade 5"],
        response: null,
      }),
    ]);
  });
});
