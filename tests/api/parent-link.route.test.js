jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/parentAccess", () => ({ requireParentSession: jest.fn() }));
jest.mock("@/lib/rateLimit", () => ({ applyRateLimit: jest.fn() }));
jest.mock("@/models/GuardianInvitation", () => {
  const actual = jest.requireActual("crypto");
  return {
    __esModule: true,
    default: { findOne: jest.fn() },
    hashInvitationCode: (code) =>
      actual
        .createHash("sha256")
        .update(String(code || "").trim().toUpperCase())
        .digest("hex"),
    MAX_INVITATION_ATTEMPTS: 10,
  };
});
jest.mock("@/models/ParentStudentLink", () => ({
  __esModule: true,
  default: { findOne: jest.fn(), create: jest.fn() },
  applyAccessLevelDefaults: jest.fn((d) => d),
}));
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

import { requireParentSession } from "@/lib/parentAccess";
import { applyRateLimit } from "@/lib/rateLimit";
import GuardianInvitation from "@/models/GuardianInvitation";
import ParentStudentLink from "@/models/ParentStudentLink";
import Student from "@/models/Student";
import { POST } from "@/app/api/parent/link/route";

/**
 * §26/§27: a parent can ONLY gain access to a child by redeeming a
 * school-issued invitation. These tests pin that door shut.
 */

const PARENT_A = "aaaaaaaaaaaaaaaaaaaaaaa1";
const AAYUSH = "1111111111111111111111a1";
const SCHOOL = "5555555555555555555555s1";

function request(code) {
  return new Request("http://localhost/api/parent/link", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

function signedIn() {
  requireParentSession.mockResolvedValue({
    parent: { _id: PARENT_A, name: "Sita Sharma" },
    session: { user: { id: PARENT_A, role: "PARENT" } },
  });
}

function invitation(overrides = {}) {
  return {
    _id: "inv-1",
    student: AAYUSH,
    school: SCHOOL,
    status: "PENDING",
    attemptCount: 0,
    expiresAt: new Date(Date.now() + 86400000),
    relationshipType: "MOTHER",
    accessLevel: "FULL",
    permissions: {
      canViewPortfolio: true,
      canReceiveNotices: true,
      canRegisterEvents: true,
      canGiveConsent: true,
      canMessageSchool: true,
    },
    isPrimaryGuardian: true,
    createdBy: "admin-1",
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  signedIn();
  applyRateLimit.mockResolvedValue({ ok: true });
  ParentStudentLink.findOne.mockResolvedValue(null);
  ParentStudentLink.create.mockResolvedValue({ _id: "link-1" });
  Student.findOne.mockReturnValue({
    select: () => ({
      lean: () =>
        Promise.resolve({
          _id: AAYUSH,
          name: "Aayush Sharma",
          grade: "Grade 8",
          school: SCHOOL,
        }),
    }),
  });
});

describe("redeeming a guardian invitation", () => {
  it("creates an ACTIVE link with the school's chosen permissions", async () => {
    GuardianInvitation.findOne.mockResolvedValue(invitation());

    const res = await POST(request("ABCD2345"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.child.name).toBe("Aayush Sharma");
    expect(ParentStudentLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: PARENT_A,
        student: AAYUSH,
        status: "ACTIVE",
        canGiveConsent: true,
      })
    );
  });

  it("looks the invitation up by HASH, never by plaintext", async () => {
    GuardianInvitation.findOne.mockResolvedValue(invitation());

    await POST(request("ABCD2345"));

    const [query] = GuardianInvitation.findOne.mock.calls[0];
    expect(query.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(query).not.toHaveProperty("code");
  });

  it("is case-insensitive about the typed code", async () => {
    GuardianInvitation.findOne.mockResolvedValue(invitation());

    await POST(request("abcd2345"));
    const lower = GuardianInvitation.findOne.mock.calls[0][0].codeHash;

    jest.clearAllMocks();
    signedIn();
    applyRateLimit.mockResolvedValue({ ok: true });
    GuardianInvitation.findOne.mockResolvedValue(invitation());
    await POST(request("ABCD2345"));
    const upper = GuardianInvitation.findOne.mock.calls[0][0].codeHash;

    expect(lower).toBe(upper);
  });

  it("marks the invitation ACCEPTED so it cannot be reused", async () => {
    const inv = invitation();
    GuardianInvitation.findOne.mockResolvedValue(inv);

    await POST(request("ABCD2345"));

    expect(inv.status).toBe("ACCEPTED");
    expect(inv.acceptedBy).toBe(PARENT_A);
    expect(inv.save).toHaveBeenCalled();
  });

  it("reactivates a previously REVOKED link instead of duplicating it", async () => {
    GuardianInvitation.findOne.mockResolvedValue(invitation());
    const existing = { status: "REVOKED", save: jest.fn() };
    ParentStudentLink.findOne.mockResolvedValue(existing);

    await POST(request("ABCD2345"));

    // A second create would violate the unique (parent, student) index.
    expect(ParentStudentLink.create).not.toHaveBeenCalled();
    expect(existing.status).toBe("ACTIVE");
    expect(existing.save).toHaveBeenCalled();
  });
});

describe("invitation cannot be brute-forced or bypassed", () => {
  it("gives an identical message for an unknown code", async () => {
    GuardianInvitation.findOne.mockResolvedValue(null);

    const res = await POST(request("WRONGCOD"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/not valid/i);
    expect(ParentStudentLink.create).not.toHaveBeenCalled();
  });

  it("expires an out-of-date invitation and refuses it", async () => {
    const inv = invitation({ expiresAt: new Date(Date.now() - 1000) });
    GuardianInvitation.findOne.mockResolvedValue(inv);

    const res = await POST(request("ABCD2345"));

    expect(res.status).toBe(400);
    expect(inv.status).toBe("EXPIRED");
    expect(ParentStudentLink.create).not.toHaveBeenCalled();
  });

  it("refuses an invitation probed past the attempt cap", async () => {
    GuardianInvitation.findOne.mockResolvedValue(
      invitation({ attemptCount: 10 })
    );

    const res = await POST(request("ABCD2345"));

    expect(res.status).toBe(400);
    expect(ParentStudentLink.create).not.toHaveBeenCalled();
  });

  it("burns an attempt when the code is right but the student is gone", async () => {
    const inv = invitation();
    GuardianInvitation.findOne.mockResolvedValue(inv);
    Student.findOne.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(null) }),
    });

    const res = await POST(request("ABCD2345"));

    expect(res.status).toBe(400);
    expect(inv.attemptCount).toBe(1);
    expect(inv.save).toHaveBeenCalled();
  });

  it("enforces BOTH the per-IP and per-account rate limits", async () => {
    applyRateLimit.mockResolvedValue({ ok: true });
    GuardianInvitation.findOne.mockResolvedValue(invitation());

    await POST(request("ABCD2345"));

    const keys = applyRateLimit.mock.calls.map(([args]) => args.key);
    expect(keys.some((k) => k.startsWith("parent-link-ip:"))).toBe(true);
    // The account limit is the one an IP-rotating attacker cannot escape.
    expect(keys.some((k) => k === `parent-link-account:${PARENT_A}`)).toBe(true);
  });

  it("429s when a limit trips, without touching the database", async () => {
    applyRateLimit.mockResolvedValue({ ok: false, retryAfter: 300 });

    const res = await POST(request("ABCD2345"));

    expect(res.status).toBe(429);
    expect(GuardianInvitation.findOne).not.toHaveBeenCalled();
  });

  it("rejects an anonymous caller before any lookup", async () => {
    requireParentSession.mockResolvedValue({
      error: new Response(null, { status: 401 }),
    });

    const res = await POST(request("ABCD2345"));

    expect(res.status).toBe(401);
    expect(GuardianInvitation.findOne).not.toHaveBeenCalled();
  });

  it("requires a code — there is no student search path", async () => {
    const res = await POST(request(""));

    expect(res.status).toBe(400);
    expect(GuardianInvitation.findOne).not.toHaveBeenCalled();
  });
});
