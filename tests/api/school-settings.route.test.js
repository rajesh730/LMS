jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/settingsAudit", () => ({
  recordSettingsAudit: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));
jest.mock("@/models/SchoolConfig", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));
jest.mock("@/models/Teacher", () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));

import { getServerSession } from "next-auth";
import User from "@/models/User";
import SchoolConfig from "@/models/SchoolConfig";
import { PUT } from "@/app/api/school/settings/route";

function request(body) {
  return new Request("http://localhost/api/school/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockExistingRecords() {
  User.findById.mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: "school-1",
      schoolName: "Old School",
      email: "old@school.test",
    }),
  });
  SchoolConfig.findOne.mockResolvedValue({ schoolCode: "OLD" });
}

describe("school settings credentials and persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue({
      user: { id: "school-1", role: "SCHOOL_ADMIN" },
    });
    mockExistingRecords();
  });

  it("normalizes the login email and returns the persisted settings", async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
    User.findByIdAndUpdate.mockResolvedValue({
      schoolName: "New School",
      email: "admin@newschool.test",
      establishedYear: null,
    });
    SchoolConfig.findOneAndUpdate.mockResolvedValue({
      schoolCode: "NS-1",
      city: "Kathmandu",
      teacherRoles: ["Mentor"],
    });

    const response = await PUT(
      request({
        identity: {
          schoolName: " New School ",
          email: " Admin@NewSchool.Test ",
          establishedYear: "",
        },
        config: {
          schoolCode: " NS-1 ",
          city: " Kathmandu ",
          teacherRoles: ["Mentor"],
        },
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "school-1",
      expect.objectContaining({
        schoolName: "New School",
        email: "admin@newschool.test",
        establishedYear: null,
      }),
      expect.objectContaining({ new: true, runValidators: true })
    );
    expect(json.data.identity.email).toBe("admin@newschool.test");
    expect(json.data.config.city).toBe("Kathmandu");
  });

  it("rejects an email already owned by another account", async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: "school-2" }),
    });

    const response = await PUT(
      request({
        identity: {
          schoolName: "Old School",
          email: "taken@school.test",
        },
      })
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.message).toMatch(/already in use/i);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("does not allow the school to erase its login email", async () => {
    const response = await PUT(
      request({ identity: { schoolName: "Old School", email: "  " } })
    );

    expect(response.status).toBe(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("updates only email when the request contains only email", async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
    User.findByIdAndUpdate.mockResolvedValue({
      schoolName: "Old School",
      email: "new@school.test",
      schoolPhone: "9800000000",
      establishedYear: 1995,
    });

    const response = await PUT(
      request({ identity: { email: " New@School.Test " } })
    );

    expect(response.status).toBe(200);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "school-1",
      { email: "new@school.test" },
      expect.objectContaining({ new: true, runValidators: true })
    );
    expect(SchoolConfig.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects invalid profile values even when client validation is bypassed", async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const response = await PUT(
      request({
        identity: {
          schoolName: "Old School",
          email: "admin@school.test",
          website: "javascript:alert(1)",
          establishedYear: "not-a-year",
        },
      })
    );

    expect(response.status).toBe(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
