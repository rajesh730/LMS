jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/rateLimit", () => ({ applyRateLimit: jest.fn() }));
jest.mock("@/lib/parentCredentials", () => ({
  resolveActivationByToken: jest.fn(),
  resolveActivationByPin: jest.fn(),
  completeActivation: jest.fn(),
  ACTIVATION_INVALID: {
    ok: false,
    code: "INVALID_ACTIVATION",
    message: "This card is not valid any more.",
  },
}));
jest.mock("@/models/Parent", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("@/models/ParentStudentLink", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("@/models/SchoolConfig", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

import { applyRateLimit } from "@/lib/rateLimit";
import {
  resolveActivationByToken,
  resolveActivationByPin,
  completeActivation,
} from "@/lib/parentCredentials";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import Student from "@/models/Student";
import User from "@/models/User";
import SchoolConfig from "@/models/SchoolConfig";
import { GET, POST } from "@/app/api/parent/activate/route";

/**
 * §9, §53, §54 — the activation endpoint is unauthenticated by necessity (the
 * guardian has no session yet), so the card credentials ARE the authentication.
 * These tests pin the confirmation-before-activation rule and the strict limits
 * on what an unauthenticated caller can learn.
 */

function selectLean(value) {
  return { select: () => ({ lean: () => Promise.resolve(value) }) };
}

function activation(overrides = {}) {
  return {
    _id: "activation-1",
    parent: "parent-1",
    school: "school-1",
    student: "student-1",
    ...overrides,
  };
}

function mockLookups({ photoUrl = "", photoAllowed = true } = {}) {
  Parent.findById.mockReturnValue(
    selectLean({
      _id: "parent-1",
      name: "Sita Sharma",
      parentId: "PRV-P-X7K4Q9",
      preferences: { language: "ne" },
    })
  );
  Student.findById.mockReturnValue(
    selectLean({
      _id: "student-1",
      name: "Aayush Sharma",
      grade: "Grade 8",
      photoUrl,
      school: "school-1",
    })
  );
  User.findById.mockReturnValue(
    selectLean({ _id: "school-1", schoolName: "Green Village Secondary" })
  );
  ParentStudentLink.findOne.mockReturnValue(
    selectLean({ relationshipType: "MOTHER" })
  );
  SchoolConfig.findOne.mockReturnValue(
    selectLean({ allowStudentPhotoInParentApp: photoAllowed })
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  applyRateLimit.mockResolvedValue({ ok: true });
});

describe("GET — resolve a card for confirmation", () => {
  it("returns the child WITHOUT activating (§9)", async () => {
    resolveActivationByToken.mockResolvedValue(activation());
    mockLookups();

    const res = await GET(
      new Request("http://localhost/api/parent/activate?t=tok")
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.child.name).toBe("Aayush Sharma");
    expect(json.data.guardianName).toBe("Sita Sharma");
    // Nothing was consumed.
    expect(completeActivation).not.toHaveBeenCalled();
  });

  it("returns only the minimum needed to confirm (§53)", async () => {
    resolveActivationByToken.mockResolvedValue(activation());
    mockLookups();

    const res = await GET(
      new Request("http://localhost/api/parent/activate?t=tok")
    );
    const json = await res.json();
    const body = JSON.stringify(json);

    // Name and grade only — nothing about the child's record or contacts.
    expect(Object.keys(json.data.child).sort()).toEqual([
      "grade",
      "name",
      "photoUrl",
    ]);
    expect(body).not.toMatch(/rollNumber|dateOfBirth|address|email|phone/i);
    // And never the Parent ID before the credential is verified.
    expect(body).not.toContain("PRV-P-X7K4Q9");
  });

  it("hides the child photo when the school's policy forbids it (§54)", async () => {
    resolveActivationByToken.mockResolvedValue(activation());
    mockLookups({ photoUrl: "https://x/y.jpg", photoAllowed: false });

    const res = await GET(
      new Request("http://localhost/api/parent/activate?t=tok")
    );
    const json = await res.json();

    expect(json.data.child.photoUrl).toBe("");
  });

  it("rejects an invalid, expired or used card with one generic message", async () => {
    resolveActivationByToken.mockResolvedValue(null);

    const res = await GET(
      new Request("http://localhost/api/parent/activate?t=bad")
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("INVALID_ACTIVATION");
  });

  it("rate limits card probing", async () => {
    applyRateLimit.mockResolvedValue({ ok: false, retryAfter: 300 });

    const res = await GET(
      new Request("http://localhost/api/parent/activate?t=tok")
    );

    expect(res.status).toBe(429);
    expect(resolveActivationByToken).not.toHaveBeenCalled();
  });
});

describe("POST — confirm then activate", () => {
  it("step CONFIRM resolves without consuming the card", async () => {
    resolveActivationByPin.mockResolvedValue(activation());
    mockLookups();

    const res = await POST(
      new Request("http://localhost/api/parent/activate", {
        method: "POST",
        body: JSON.stringify({
          step: "CONFIRM",
          parentId: "PRV-P-X7K4Q9",
          activationPin: "582914",
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(completeActivation).not.toHaveBeenCalled();
  });

  it("completes activation and sets the guardian's PIN", async () => {
    resolveActivationByToken.mockResolvedValue(activation());
    Parent.findById.mockResolvedValue({
      _id: "parent-1",
      parentId: "PRV-P-X7K4Q9",
      devicePreference: "PERSONAL",
    });
    completeActivation.mockResolvedValue({ ok: true });

    const res = await POST(
      new Request("http://localhost/api/parent/activate", {
        method: "POST",
        body: JSON.stringify({
          token: "tok",
          pin: "582914",
          language: "ne",
          devicePreference: "PERSONAL",
        }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.parentIdentifier).toBe("PRV-P-X7K4Q9");
    expect(completeActivation).toHaveBeenCalledWith(
      expect.objectContaining({ pin: "582914", language: "ne" })
    );
  });

  it("surfaces a weak-PIN rejection to the guardian", async () => {
    resolveActivationByToken.mockResolvedValue(activation());
    Parent.findById.mockResolvedValue({ _id: "parent-1" });
    completeActivation.mockResolvedValue({
      ok: false,
      code: "WEAK_PIN",
      message: "Please avoid 000000 or 123456.",
    });

    const res = await POST(
      new Request("http://localhost/api/parent/activate", {
        method: "POST",
        body: JSON.stringify({ token: "tok", pin: "123456" }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("WEAK_PIN");
  });

  it("refuses an invalid card before touching the parent record", async () => {
    resolveActivationByToken.mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/parent/activate", {
        method: "POST",
        body: JSON.stringify({ token: "bad", pin: "582914" }),
      })
    );

    expect(res.status).toBe(400);
    expect(Parent.findById).not.toHaveBeenCalled();
    expect(completeActivation).not.toHaveBeenCalled();
  });

  it("rate limits activation attempts", async () => {
    applyRateLimit.mockResolvedValue({ ok: false, retryAfter: 600 });

    const res = await POST(
      new Request("http://localhost/api/parent/activate", {
        method: "POST",
        body: JSON.stringify({ token: "tok", pin: "582914" }),
      })
    );

    expect(res.status).toBe(429);
    expect(resolveActivationByToken).not.toHaveBeenCalled();
  });
});
