jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { findOneAndUpdate: jest.fn() },
}));
jest.mock("bcryptjs", () => ({ hash: jest.fn() }));
jest.mock("@/lib/passwordGenerator", () => ({
  generateStudentPassword: jest.fn(),
}));
jest.mock("@/lib/studentIdentity", () => ({
  generateUniqueStudentUsername: jest.fn(),
}));

import { getServerSession } from "next-auth";
import Student from "@/models/Student";
import {
  DELETE,
  PATCH,
  PUT,
} from "@/app/api/students/[id]/route";

const STUDENT_ID = "507f1f77bcf86cd799439011";

function context() {
  return { params: Promise.resolve({ id: STUDENT_ID }) };
}

describe("student administration school isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue({
      user: { id: "school-a", role: "SCHOOL_ADMIN" },
    });
  });

  it("scopes student edits to the authenticated school", async () => {
    Student.findOne.mockResolvedValue(null);

    const res = await PUT(
      new Request(`http://localhost/api/students/${STUDENT_ID}`, {
        method: "PUT",
        body: JSON.stringify({ name: "Changed" }),
      }),
      context()
    );

    expect(res.status).toBe(404);
    expect(Student.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: STUDENT_ID, school: "school-a" })
    );
    expect(Student.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("scopes archive mutations to the authenticated school", async () => {
    Student.findOneAndUpdate.mockResolvedValue(null);

    const res = await DELETE(
      new Request(`http://localhost/api/students/${STUDENT_ID}`, {
        method: "DELETE",
      }),
      context()
    );

    expect(res.status).toBe(404);
    expect(Student.findOneAndUpdate.mock.calls[0][0]).toEqual(
      expect.objectContaining({ _id: STUDENT_ID, school: "school-a" })
    );
  });

  it("does not let teachers reset student credentials", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "teacher-1", schoolId: "school-a", role: "TEACHER" },
    });

    const res = await PATCH(
      new Request(`http://localhost/api/students/${STUDENT_ID}`, {
        method: "PATCH",
      }),
      context()
    );

    expect(res.status).toBe(403);
    expect(Student.findOne).not.toHaveBeenCalled();
    expect(Student.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
