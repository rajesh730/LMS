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

import Parent from "@/models/Parent";
import ParentActivation from "@/models/ParentActivation";
import AuditLog from "@/models/AuditLog";
import {
  hashActivationToken,
  issueParentAccess,
  verifyParentId,
  verifyParentCardToken,
  revokeParentAccess,
} from "@/lib/parentCredentials";

/**
 * The credential rules. These are the tests that matter most in this feature:
 * a mistake here is an unauthorised person inside a child's record.
 *
 * The Parent ID is the whole credential now, so the burden sits on two
 * properties: the account checks that decide whether an ID signs anyone in, and
 * the rotation that makes a lost card stop working.
 */

const PARENT_ID = "PRV-P-X7K4Q9";

function parentDoc(overrides = {}) {
  return {
    _id: "parent-1",
    name: "Sita Sharma",
    parentId: PARENT_ID,
    status: "ACTIVE",
    accessState: "ACTIVATED",
    activatedAt: new Date("2026-01-01"),
    authVersion: 0,
    preferences: {},
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

/** Parent.findOne(...) resolving to `doc`. */
function foundParent(doc) {
  Parent.findOne.mockResolvedValue(doc);
}

beforeEach(() => {
  jest.clearAllMocks();
  ParentActivation.updateMany.mockResolvedValue({});
  Parent.exists.mockResolvedValue(false);
});

describe("issuing a card", () => {
  it("allocates a Parent ID on first issue and marks the guardian as waiting", async () => {
    const parent = parentDoc({ parentId: null, accessState: "NOT_CREATED" });

    const issued = await issueParentAccess({
      parent,
      schoolId: "school-1",
      studentId: "student-1",
      issuedBy: "admin-1",
      purpose: "INITIAL",
    });

    expect(issued.parentIdentifier).toMatch(/^PRV-P-[A-Z2-9]{6}$/);
    expect(parent.accessState).toBe("PENDING_ACTIVATION");
    expect(parent.save).toHaveBeenCalled();
  });

  it("does NOT rotate an existing Parent ID on a reprint", async () => {
    // The load-bearing property of a reprint: the school can hand out another
    // copy without cutting off the guardian who still has the first one.
    const parent = parentDoc({ accessState: "ACTIVATED" });

    const issued = await issueParentAccess({
      parent,
      schoolId: "school-1",
      issuedBy: "admin-1",
      purpose: "INITIAL",
    });

    expect(issued.parentIdentifier).toBe(PARENT_ID);
    expect(issued.rotated).toBe(false);
    expect(parent.authVersion).toBe(0);
    // And it does not demote them on the roster — they are still connected.
    expect(parent.accessState).toBe("ACTIVATED");
  });

  it("sends a guardian back to waiting when their ID rotates", async () => {
    const parent = parentDoc({ accessState: "ACTIVATED" });

    await issueParentAccess({
      parent,
      schoolId: "school-1",
      issuedBy: "admin-1",
      purpose: "REISSUE",
    });

    // They cannot be "connected" against an ID that no longer exists.
    expect(parent.accessState).toBe("PENDING_ACTIVATION");
  });

  it("rotates the Parent ID on REISSUE, so a lost card stops working", async () => {
    const parent = parentDoc();

    const issued = await issueParentAccess({
      parent,
      schoolId: "school-1",
      issuedBy: "admin-1",
      purpose: "REISSUE",
    });

    expect(issued.parentIdentifier).not.toBe(PARENT_ID);
    expect(issued.rotated).toBe(true);
    expect(parent.parentId).toBe(issued.parentIdentifier);
    // Every live session opened with the old card is dropped too — otherwise
    // whoever found it stays signed in after the replacement is issued.
    expect(parent.authVersion).toBe(1);
  });

  it("revokes legacy QR cards when the ID rotates", async () => {
    await issueParentAccess({
      parent: parentDoc(),
      schoolId: "school-1",
      issuedBy: "admin-1",
      purpose: "REISSUE",
    });

    expect(ParentActivation.updateMany).toHaveBeenCalledWith(
      { parent: "parent-1", status: { $ne: "REVOKED" } },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "REVOKED" }),
      })
    );
  });

  it("never writes a Parent ID into the audit log", async () => {
    const parent = parentDoc();
    await issueParentAccess({
      parent,
      schoolId: "school-1",
      issuedBy: "admin-1",
      purpose: "REISSUE",
    });

    // The ID is now a live credential; an audit trail full of them would be a
    // standing list of working logins.
    const serialised = JSON.stringify(AuditLog.create.mock.calls);
    expect(serialised).not.toContain(PARENT_ID);
    expect(serialised).not.toContain(parent.parentId);
  });
});

describe("signing in with a Parent ID", () => {
  it("accepts an activated guardian", async () => {
    const parent = parentDoc();
    foundParent(parent);

    const result = await verifyParentId(PARENT_ID);

    expect(result.ok).toBe(true);
    expect(result.parent).toBe(parent);
    expect(result.firstSignIn).toBe(false);
    expect(parent.lastLoginAt).toBeInstanceOf(Date);
  });

  it("normalises what the guardian typed", async () => {
    const parent = parentDoc();
    foundParent(parent);

    // Lower case, hyphens missing — read off a card by someone not confident
    // with Latin characters.
    const result = await verifyParentId("prvpx7k4q9");

    expect(result.ok).toBe(true);
    expect(Parent.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: PARENT_ID })
    );
  });

  it("activates on the first sign-in, with no separate activation step", async () => {
    const parent = parentDoc({
      accessState: "PENDING_ACTIVATION",
      activatedAt: null,
    });
    foundParent(parent);

    const result = await verifyParentId(PARENT_ID);

    expect(result.ok).toBe(true);
    expect(result.firstSignIn).toBe(true);
    expect(parent.accessState).toBe("ACTIVATED");
    expect(parent.activatedAt).toBeInstanceOf(Date);
  });

  it("records the language chosen on the sign-in screen", async () => {
    const parent = parentDoc();
    foundParent(parent);

    await verifyParentId(PARENT_ID, { language: "ne" });

    expect(parent.preferences.language).toBe("ne");
  });

  it("ignores a language it does not support", async () => {
    const parent = parentDoc({ preferences: { language: "en" } });
    foundParent(parent);

    await verifyParentId(PARENT_ID, { language: "fr" });

    expect(parent.preferences.language).toBe("en");
  });

  it("rejects an unknown Parent ID", async () => {
    foundParent(null);
    const result = await verifyParentId(PARENT_ID);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects a malformed Parent ID without touching the database", async () => {
    const result = await verifyParentId("not-an-id");
    expect(result.ok).toBe(false);
    expect(Parent.findOne).not.toHaveBeenCalled();
  });

  it("rejects a revoked guardian", async () => {
    foundParent(parentDoc({ accessState: "REVOKED" }));
    expect((await verifyParentId(PARENT_ID)).ok).toBe(false);
  });

  it("rejects a suspended account", async () => {
    foundParent(parentDoc({ status: "SUSPENDED" }));
    expect((await verifyParentId(PARENT_ID)).ok).toBe(false);
  });

  it("rejects a guardian who was never issued a card", async () => {
    // Parent rows are created by registration auto-linking and by the backfill,
    // and all of them carry a Parent ID from the model hook. Those must not be
    // live logins just because the ID exists.
    foundParent(parentDoc({ accessState: "NOT_CREATED" }));
    expect((await verifyParentId(PARENT_ID)).ok).toBe(false);
  });

  it("gives the same answer for every rejection", async () => {
    foundParent(null);
    const unknown = await verifyParentId(PARENT_ID);

    foundParent(parentDoc({ accessState: "REVOKED" }));
    const revoked = await verifyParentId(PARENT_ID);

    foundParent(parentDoc({ status: "SUSPENDED" }));
    const suspended = await verifyParentId(PARENT_ID);

    // An attacker must not be able to learn which Parent IDs are real.
    expect(unknown).toEqual(revoked);
    expect(revoked).toEqual(suspended);
  });
});

describe("signing in by scanning a legacy card", () => {
  function foundActivation(value) {
    ParentActivation.findOne.mockReturnValue({
      sort: () => ({ lean: () => Promise.resolve(value) }),
    });
  }

  it("resolves an old QR token to its guardian", async () => {
    foundActivation({ _id: "activation-1", parent: "parent-1" });
    const parent = parentDoc();
    foundParent(parent);

    const result = await verifyParentCardToken("legacy-token");

    expect(result.ok).toBe(true);
    expect(result.parent).toBe(parent);
  });

  it("looks the token up by hash, never in plaintext", async () => {
    foundActivation(null);
    await verifyParentCardToken("secret-token");

    const [query] = ParentActivation.findOne.mock.calls[0];
    expect(query.tokenHash).toBe(hashActivationToken("secret-token"));
    expect(JSON.stringify(query)).not.toContain("secret-token");
  });

  it("accepts a card that expired or was already used", async () => {
    // Expiry bounded a one-time activation window that no longer exists.
    // Letting a card lapse in a drawer would strand the guardians this flow is
    // for; the account checks are what gate access now.
    foundActivation({
      _id: "activation-1",
      parent: "parent-1",
      status: "USED",
      expiresAt: new Date("2020-01-01"),
    });
    foundParent(parentDoc());

    expect((await verifyParentCardToken("legacy-token")).ok).toBe(true);
  });

  it("refuses a REVOKED card", async () => {
    // The query itself excludes them, which is what makes "New card" and
    // "Revoke access" actually kill an old QR.
    foundActivation(null);
    expect((await verifyParentCardToken("legacy-token")).ok).toBe(false);

    const [query] = ParentActivation.findOne.mock.calls[0];
    expect(query.status).toEqual({ $ne: "REVOKED" });
  });

  it("refuses an empty token without querying", async () => {
    expect((await verifyParentCardToken("")).ok).toBe(false);
    expect(ParentActivation.findOne).not.toHaveBeenCalled();
  });
});

describe("revoking access", () => {
  it("suspends sign-in and drops every live session", async () => {
    const parent = parentDoc();

    await revokeParentAccess({ parent, performedBy: "admin-1", reason: "left" });

    expect(parent.accessState).toBe("REVOKED");
    expect(parent.authVersion).toBe(1);
  });

  it("kills outstanding legacy cards too", async () => {
    await revokeParentAccess({ parent: parentDoc(), performedBy: "admin-1" });

    expect(ParentActivation.updateMany).toHaveBeenCalledWith(
      { parent: "parent-1", status: { $ne: "REVOKED" } },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "REVOKED" }),
      })
    );
  });

  it("leaves the Parent ID alone, so restoring access restores the card", async () => {
    const parent = parentDoc();
    await revokeParentAccess({ parent, performedBy: "admin-1" });
    expect(parent.parentId).toBe(PARENT_ID);
  });
});
