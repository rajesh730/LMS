jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Parent", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock("@/models/ParentStudentLink", () => ({
  __esModule: true,
  default: { find: jest.fn(), findOne: jest.fn() },
}));
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { find: jest.fn(), findOne: jest.fn() },
}));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { find: jest.fn(), findById: jest.fn() },
}));

import { getServerSession } from "next-auth";
import Parent from "@/models/Parent";
import {
  requireParentSession,
  SHARED_DEVICE_IDLE_MS,
} from "@/lib/parentAccess";

/**
 * §12 and §44 — session policy enforced SERVER-SIDE.
 *
 * Both rules here would be trivially bypassable if they lived in the client:
 * a shared-device timeout implemented in JavaScript is defeated by not running
 * the JavaScript, and a revoked guardian holding a valid cookie would keep
 * working until the token expired.
 */

const PARENT_A = "aaaaaaaaaaaaaaaaaaaaaaa1";

function leanOnce(value) {
  return { select: () => ({ lean: () => Promise.resolve(value) }) };
}

function session(overrides = {}) {
  getServerSession.mockResolvedValue({
    user: {
      id: PARENT_A,
      role: "PARENT",
      deviceMode: "PERSONAL",
      signedInAt: Date.now(),
      ...overrides,
    },
  });
}

function activeParent(overrides = {}) {
  Parent.findOne.mockReturnValue(
    leanOnce({
      _id: PARENT_A,
      name: "Sita Sharma",
      status: "ACTIVE",
      accessState: "ACTIVATED",
      preferences: {},
      ...overrides,
    })
  );
}

beforeEach(() => jest.clearAllMocks());

describe("personal device (§12)", () => {
  it("stays signed in indefinitely", async () => {
    session({
      deviceMode: "PERSONAL",
      // Signed in a long time ago — irrelevant for a personal device.
      signedInAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    });
    activeParent();

    const result = await requireParentSession();
    expect(result.error).toBeUndefined();
    expect(result.parent.name).toBe("Sita Sharma");
  });
});

describe("shared device (§12)", () => {
  it("works inside the idle window", async () => {
    session({
      deviceMode: "SHARED",
      signedInAt: Date.now() - (SHARED_DEVICE_IDLE_MS - 60_000),
    });
    activeParent();

    const result = await requireParentSession();
    expect(result.error).toBeUndefined();
  });

  it("ends the session once idle", async () => {
    session({
      deviceMode: "SHARED",
      signedInAt: Date.now() - (SHARED_DEVICE_IDLE_MS + 60_000),
    });
    activeParent();

    const { error } = await requireParentSession();
    const json = await error.json();

    expect(error.status).toBe(401);
    // A distinct code so the app can explain WHY they were signed out. There
    // is no PIN to challenge for any more — the guardian re-enters the Parent
    // ID from their card, which is a smaller ask than the screen it replaced.
    expect(json.code).toBe("SESSION_EXPIRED");
  });

  it("ends the session when the timestamp is missing entirely", async () => {
    session({ deviceMode: "SHARED", signedInAt: null });
    activeParent();

    const { error } = await requireParentSession();
    const json = await error.json();
    expect(json.code).toBe("SESSION_EXPIRED");
  });
});

describe("revoked access (§44)", () => {
  it("rejects a guardian whose access was revoked, despite a valid cookie", async () => {
    session();
    activeParent({ accessState: "REVOKED" });

    const { error } = await requireParentSession();
    const json = await error.json();

    expect(error.status).toBe(401);
    expect(json.code).toBe("ACCESS_REVOKED");
  });

  it("rejects a suspended account", async () => {
    session();
    // The query filters on status ACTIVE, so a suspended parent returns null.
    Parent.findOne.mockReturnValue(leanOnce(null));

    const { error } = await requireParentSession();
    expect(error.status).toBe(401);
  });
});

describe("role gating", () => {
  it("rejects a non-parent session outright", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "teacher-1", role: "TEACHER" },
    });

    const { error } = await requireParentSession();
    expect(error.status).toBe(401);
    expect(Parent.findOne).not.toHaveBeenCalled();
  });
});
