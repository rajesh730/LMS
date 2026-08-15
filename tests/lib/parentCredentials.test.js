jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Parent", () => ({
  __esModule: true,
  default: { findOne: jest.fn(), exists: jest.fn() },
}));
jest.mock("@/models/ParentActivation", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findOne: jest.fn(),
    updateMany: jest.fn(),
  },
  MAX_ACTIVATION_ATTEMPTS: 6,
  DEFAULT_ACTIVATION_TTL_DAYS: 30,
}));
jest.mock("@/models/AuditLog", () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue({}) },
}));

import bcrypt from "bcryptjs";
import Parent from "@/models/Parent";
import ParentActivation from "@/models/ParentActivation";
import AuditLog from "@/models/AuditLog";
import {
  generateActivationToken,
  hashActivationToken,
  generateNumericPin,
  isValidPinFormat,
  isWeakPin,
  hashPin,
  issueParentAccess,
  resolveActivationByToken,
  resolveActivationByPin,
  completeActivation,
  verifyParentPin,
  revokeParentAccess,
  MAX_PIN_ATTEMPTS,
} from "@/lib/parentCredentials";

/**
 * §6, §7, §11, §41, §42, §52 — the credential rules. These are the tests that
 * matter most in this feature: a mistake here is an unauthorised person inside
 * a child's record.
 */

const PARENT_ID = "PRV-P-X7K4Q9";

function parentDoc(overrides = {}) {
  return {
    _id: "parent-1",
    name: "Sita Sharma",
    parentId: PARENT_ID,
    status: "ACTIVE",
    accessState: "ACTIVATED",
    pinHash: "",
    failedPinAttempts: 0,
    lockedUntil: null,
    authVersion: 0,
    preferences: {},
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function activationDoc(overrides = {}) {
  return {
    _id: "activation-1",
    parent: "parent-1",
    school: "school-1",
    student: "student-1",
    status: "PENDING",
    attemptCount: 0,
    expiresAt: new Date(Date.now() + 86400000),
    activationPinHash: "",
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  ParentActivation.updateMany.mockResolvedValue({});
  ParentActivation.create.mockImplementation(async (doc) => ({
    ...doc,
    _id: "activation-new",
  }));
  Parent.exists.mockResolvedValue(false);
});

describe("token generation and hashing", () => {
  it("produces a high-entropy, URL-safe token", () => {
    const token = generateActivationToken();
    // 32 bytes base64url.
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("never repeats", () => {
    const tokens = new Set();
    for (let i = 0; i < 200; i += 1) tokens.add(generateActivationToken());
    expect(tokens.size).toBe(200);
  });

  it("hashes deterministically and irreversibly", () => {
    const token = generateActivationToken();
    const hash = hashActivationToken(token);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashActivationToken(token));
    // The plaintext must not be recoverable from, or present in, the hash.
    expect(hash).not.toContain(token);
  });
});

describe("PIN rules", () => {
  it("generates six digits", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(generateNumericPin()).toMatch(/^\d{6}$/);
    }
  });

  it("uses every digit — no modulo bias toward low numbers", () => {
    const seen = new Set();
    for (let i = 0; i < 400; i += 1) {
      [...generateNumericPin()].forEach((d) => seen.add(d));
    }
    expect(seen.size).toBe(10);
  });

  it("validates format", () => {
    expect(isValidPinFormat("123456")).toBe(true);
    expect(isValidPinFormat("12345")).toBe(false);
    expect(isValidPinFormat("1234567")).toBe(false);
    expect(isValidPinFormat("12a456")).toBe(false);
    expect(isValidPinFormat("")).toBe(false);
  });

  it("rejects trivially guessable PINs", () => {
    expect(isWeakPin("000000")).toBe(true);
    expect(isWeakPin("111111")).toBe(true);
    expect(isWeakPin("123456")).toBe(true);
    expect(isWeakPin("654321")).toBe(true);
    expect(isWeakPin("582914")).toBe(false);
  });

  it("hashes with bcrypt, not plaintext", async () => {
    const hash = await hashPin("582914");
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toContain("582914");
    expect(await bcrypt.compare("582914", hash)).toBe(true);
  });
});

describe("issuing a card", () => {
  it("returns the secrets exactly once and stores only hashes", async () => {
    const parent = parentDoc({ parentId: null, accessState: "NOT_CREATED" });

    const issued = await issueParentAccess({
      parent,
      schoolId: "school-1",
      studentId: "student-1",
      issuedBy: "admin-1",
    });

    expect(issued.activationPin).toMatch(/^\d{6}$/);
    expect(issued.activationToken).toBeTruthy();

    const stored = ParentActivation.create.mock.calls[0][0];
    // Neither secret is persisted in readable form.
    expect(stored.activationPinHash).not.toBe(issued.activationPin);
    expect(stored.tokenHash).not.toBe(issued.activationToken);
    expect(stored.tokenHash).toBe(hashActivationToken(issued.activationToken));
    expect(await bcrypt.compare(issued.activationPin, stored.activationPinHash)).toBe(
      true
    );
    // Only the last two digits are kept as a hint for the school.
    expect(stored.pinHint).toBe(issued.activationPin.slice(-2));
  });

  it("allocates a Parent ID on first issue", async () => {
    const parent = parentDoc({ parentId: null, accessState: "NOT_CREATED" });
    await issueParentAccess({ parent, schoolId: "s", issuedBy: "a" });
    expect(parent.parentId).toMatch(/^PRV-P-[A-Z0-9]{6}$/);
  });

  it("KEEPS the existing Parent ID on reissue (§6)", async () => {
    const parent = parentDoc({ accessState: "PENDING_ACTIVATION" });
    await issueParentAccess({
      parent,
      schoolId: "s",
      issuedBy: "a",
      purpose: "REISSUE",
    });
    // A guardian who has memorised or laminated their ID must not lose it.
    expect(parent.parentId).toBe(PARENT_ID);
  });

  it("revokes every outstanding card first, so a lost card dies (§42)", async () => {
    const parent = parentDoc();
    await issueParentAccess({
      parent,
      schoolId: "s",
      issuedBy: "a",
      purpose: "REISSUE",
    });

    expect(ParentActivation.updateMany).toHaveBeenCalledWith(
      { parent: parent._id, status: "PENDING" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "REVOKED" }),
      })
    );
  });

  it("a PIN reset actually clears the old PIN (§41)", async () => {
    const parent = parentDoc({ pinHash: "$2a$10$oldhash" });

    await issueParentAccess({
      parent,
      schoolId: "s",
      issuedBy: "a",
      purpose: "PIN_RESET",
    });

    // Otherwise the forgotten PIN would still work.
    expect(parent.pinHash).toBe("");
    expect(parent.accessState).toBe("PENDING_ACTIVATION");
  });

  it("audits the issue without recording any secret (§66)", async () => {
    const parent = parentDoc({ parentId: null, accessState: "NOT_CREATED" });
    const issued = await issueParentAccess({
      parent,
      schoolId: "s",
      issuedBy: "admin-1",
    });

    const entry = AuditLog.create.mock.calls[0][0];
    expect(entry.action).toBe("PARENT_ACCESS_CREATED");
    const serialised = JSON.stringify(entry);
    expect(serialised).not.toContain(issued.activationPin);
    expect(serialised).not.toContain(issued.activationToken);
  });
});

describe("QR activation", () => {
  it("resolves a valid pending card", async () => {
    const activation = activationDoc();
    ParentActivation.findOne.mockResolvedValue(activation);

    const result = await resolveActivationByToken("tok");
    expect(result).toBe(activation);
  });

  it("refuses a card already used", async () => {
    // The query filters status PENDING, so a USED row simply does not match.
    ParentActivation.findOne.mockResolvedValue(null);
    expect(await resolveActivationByToken("tok")).toBeNull();
  });

  it("refuses and marks an EXPIRED card", async () => {
    const activation = activationDoc({
      expiresAt: new Date(Date.now() - 1000),
    });
    ParentActivation.findOne.mockResolvedValue(activation);

    expect(await resolveActivationByToken("tok")).toBeNull();
    expect(activation.status).toBe("EXPIRED");
    expect(activation.save).toHaveBeenCalled();
  });

  it("refuses a card whose attempt budget is exhausted", async () => {
    ParentActivation.findOne.mockResolvedValue(
      activationDoc({ attemptCount: 6 })
    );
    expect(await resolveActivationByToken("tok")).toBeNull();
  });

  it("looks up by hash, never by the raw token", async () => {
    ParentActivation.findOne.mockResolvedValue(activationDoc());
    await resolveActivationByToken("secret-token");

    const [query] = ParentActivation.findOne.mock.calls[0];
    expect(query.tokenHash).toBe(hashActivationToken("secret-token"));
    expect(JSON.stringify(query)).not.toContain("secret-token");
  });
});

describe("Parent ID + activation PIN (no camera)", () => {
  it("accepts the correct pair", async () => {
    const pinHash = await hashPin("582914");
    Parent.findOne.mockResolvedValue(parentDoc());
    ParentActivation.findOne.mockReturnValue({
      sort: () => Promise.resolve(activationDoc({ activationPinHash: pinHash })),
    });

    const result = await resolveActivationByPin(PARENT_ID, "582914");
    expect(result).toBeTruthy();
  });

  it("burns an attempt on a wrong PIN, so rotating IPs does not help", async () => {
    const pinHash = await hashPin("582914");
    const activation = activationDoc({ activationPinHash: pinHash });
    Parent.findOne.mockResolvedValue(parentDoc());
    ParentActivation.findOne.mockReturnValue({
      sort: () => Promise.resolve(activation),
    });

    expect(await resolveActivationByPin(PARENT_ID, "000001")).toBeNull();
    expect(activation.attemptCount).toBe(1);
    expect(activation.save).toHaveBeenCalled();
  });

  it("returns null for an unknown Parent ID without touching activations", async () => {
    Parent.findOne.mockResolvedValue(null);
    expect(await resolveActivationByPin(PARENT_ID, "582914")).toBeNull();
    expect(ParentActivation.findOne).not.toHaveBeenCalled();
  });

  it("rejects a malformed Parent ID before any query", async () => {
    expect(await resolveActivationByPin("nonsense", "582914")).toBeNull();
    expect(Parent.findOne).not.toHaveBeenCalled();
  });
});

describe("completing activation", () => {
  it("consumes the card and sets the guardian's own PIN", async () => {
    const activation = activationDoc();
    const parent = parentDoc({ accessState: "PENDING_ACTIVATION" });

    const result = await completeActivation({
      activation,
      parent,
      pin: "582914",
      language: "ne",
      devicePreference: "SHARED",
    });

    expect(result.ok).toBe(true);
    expect(activation.status).toBe("USED");
    expect(parent.accessState).toBe("ACTIVATED");
    expect(await bcrypt.compare("582914", parent.pinHash)).toBe(true);
    expect(parent.preferences.language).toBe("ne");
    expect(parent.devicePreference).toBe("SHARED");
  });

  it("refuses a weak PIN", async () => {
    const result = await completeActivation({
      activation: activationDoc(),
      parent: parentDoc(),
      pin: "123456",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("WEAK_PIN");
  });

  it("refuses a malformed PIN", async () => {
    const result = await completeActivation({
      activation: activationDoc(),
      parent: parentDoc(),
      pin: "12ab",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_PIN");
  });
});

describe("PIN sign-in", () => {
  function mockParentWithPin(hash, overrides = {}) {
    const parent = parentDoc({ pinHash: hash, ...overrides });
    Parent.findOne.mockReturnValue({ select: () => Promise.resolve(parent) });
    return parent;
  }

  it("accepts the correct PIN and clears the failure counter", async () => {
    const parent = mockParentWithPin(await hashPin("582914"), {
      failedPinAttempts: 3,
    });

    const result = await verifyParentPin(PARENT_ID, "582914");

    expect(result.ok).toBe(true);
    expect(parent.failedPinAttempts).toBe(0);
    expect(parent.lastLoginAt).toBeInstanceOf(Date);
  });

  it("accepts a lower-case, hyphen-less Parent ID", async () => {
    mockParentWithPin(await hashPin("582914"));
    const result = await verifyParentPin("prvpx7k4q9", "582914");
    expect(result.ok).toBe(true);
  });

  it("rejects a wrong PIN and counts the attempt", async () => {
    const parent = mockParentWithPin(await hashPin("582914"));

    const result = await verifyParentPin(PARENT_ID, "111222");

    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_CREDENTIALS");
    expect(parent.failedPinAttempts).toBe(1);
  });

  it("locks the account after repeated failures (§7)", async () => {
    const parent = mockParentWithPin(await hashPin("582914"), {
      failedPinAttempts: MAX_PIN_ATTEMPTS - 1,
    });

    const result = await verifyParentPin(PARENT_ID, "111222");

    expect(result.code).toBe("LOCKED");
    expect(parent.accessState).toBe("LOCKED");
    expect(parent.lockedUntil).toBeInstanceOf(Date);
  });

  it("refuses while locked, even with the RIGHT PIN", async () => {
    mockParentWithPin(await hashPin("582914"), {
      lockedUntil: new Date(Date.now() + 60000),
    });

    const result = await verifyParentPin(PARENT_ID, "582914");
    expect(result.code).toBe("LOCKED");
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("gives the SAME answer for an unknown Parent ID as for a wrong PIN (§53)", async () => {
    Parent.findOne.mockReturnValue({ select: () => Promise.resolve(null) });
    const unknown = await verifyParentPin(PARENT_ID, "582914");

    mockParentWithPin(await hashPin("582914"));
    const wrongPin = await verifyParentPin(PARENT_ID, "999999");

    // Enumeration must not be possible.
    expect(unknown.code).toBe(wrongPin.code);
    expect(unknown.code).toBe("INVALID_CREDENTIALS");
  });

  it("refuses a revoked guardian", async () => {
    mockParentWithPin(await hashPin("582914"), { accessState: "REVOKED" });
    const result = await verifyParentPin(PARENT_ID, "582914");
    expect(result.ok).toBe(false);
  });

  it("reports NOT_ACTIVATED when a card was issued but never used", async () => {
    mockParentWithPin("", { accessState: "PENDING_ACTIVATION" });
    const result = await verifyParentPin(PARENT_ID, "582914");
    expect(result.code).toBe("NOT_ACTIVATED");
  });
});

describe("revoking access", () => {
  it("kills outstanding cards and invalidates live sessions", async () => {
    const parent = parentDoc({ authVersion: 4 });

    await revokeParentAccess({ parent, performedBy: "admin-1", reason: "left" });

    expect(parent.accessState).toBe("REVOKED");
    // Bumping authVersion is what makes existing JWTs stop working.
    expect(parent.authVersion).toBe(5);
    expect(ParentActivation.updateMany).toHaveBeenCalledWith(
      { parent: parent._id, status: "PENDING" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "REVOKED" }),
      })
    );
  });
});
