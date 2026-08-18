jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/parentCredentials", () => ({
  issueParentAccess: jest.fn(),
  revokeParentAccess: jest.fn(),
}));
jest.mock("@/models/Parent", () => ({
  __esModule: true,
  default: { findOne: jest.fn(), findById: jest.fn() },
}));
jest.mock("@/models/ParentStudentLink", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("@/models/ParentActivation", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock("@/models/Student", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/AuditLog", () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue({}) },
}));
jest.mock("@/models/User", () => ({
  __esModule: true,
  // The issue route looks up the school name so the card dialog can render a
  // complete card.
  default: { findById: jest.fn() },
}));
jest.mock("@/lib/parentJourney", () => ({ buildStudentJourney: jest.fn() }));

import { getServerSession } from "next-auth";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import ParentActivation from "@/models/ParentActivation";
import User from "@/models/User";
import {
  issueParentAccess,
  revokeParentAccess,
} from "@/lib/parentCredentials";
import {
  GET,
  POST,
  PATCH,
} from "@/app/api/school/guardians/access/route";

/**
 * §56 — multi-tenant school isolation. A School A admin must never be able to
 * touch a School B guardian's credentials. This is the single most damaging
 * class of bug in the feature, so it is tested from every verb.
 */

const SCHOOL_A = "aaaaaaaaaaaaaaaaaaaaaaa1";
const SCHOOL_B = "bbbbbbbbbbbbbbbbbbbbbbb2";
const LINK_ID = "1111111111111111111111L1";

function signedInAs(schoolId, role = "SCHOOL_ADMIN") {
  getServerSession.mockResolvedValue({
    user: { id: schoolId, role, schoolId },
  });
}

function linkAt(schoolId) {
  return {
    _id: LINK_ID,
    parent: "parent-1",
    student: "student-1",
    school: schoolId,
    status: "ACTIVE",
  };
}

function parentDoc(overrides = {}) {
  return {
    _id: "parent-1",
    name: "Sita Sharma",
    parentId: "PRV-P-X7K4Q9",
    accessState: "ACTIVATED",
    status: "ACTIVE",
    email: null,
    phone: null,
    lockedUntil: null,
    isHousehold: false,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function request(body = {}, method = "POST") {
  return new Request("http://localhost/api/school/guardians/access", {
    method,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  ParentActivation.findOne.mockReturnValue({
    sort: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
  });
  User.findById.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve({ schoolName: "Green Village" }) }),
  });
  issueParentAccess.mockResolvedValue({
    parentIdentifier: "PRV-P-X7K4Q9",
    rotated: false,
    purpose: "INITIAL",
  });
});

describe("tenant isolation (§56)", () => {
  it("School A cannot READ School B's guardian access", async () => {
    signedInAs(SCHOOL_A);
    ParentStudentLink.findById.mockResolvedValue(linkAt(SCHOOL_B));

    const res = await GET(
      new Request(
        `http://localhost/api/school/guardians/access?linkId=${LINK_ID}`
      )
    );

    // 404, not 403 — School B's links must not even be discoverable.
    expect(res.status).toBe(404);
  });

  it("School A cannot ISSUE a card for a School B guardian", async () => {
    signedInAs(SCHOOL_A);
    ParentStudentLink.findById.mockResolvedValue(linkAt(SCHOOL_B));

    const res = await POST(request({ linkId: LINK_ID }));

    expect(res.status).toBe(404);
    expect(issueParentAccess).not.toHaveBeenCalled();
  });

  it("School A cannot REVOKE a School B guardian", async () => {
    signedInAs(SCHOOL_A);
    ParentStudentLink.findById.mockResolvedValue(linkAt(SCHOOL_B));

    const res = await PATCH(
      request({ linkId: LINK_ID, action: "REVOKE_ACCESS" }, "PATCH")
    );

    expect(res.status).toBe(404);
    expect(revokeParentAccess).not.toHaveBeenCalled();
  });

  it("School A CAN manage its own guardian", async () => {
    signedInAs(SCHOOL_A);
    ParentStudentLink.findById.mockResolvedValue(linkAt(SCHOOL_A));
    Parent.findOne.mockResolvedValue(parentDoc({ accessState: "NOT_CREATED" }));

    const res = await POST(request({ linkId: LINK_ID }));

    expect(res.status).toBe(201);
    expect(issueParentAccess).toHaveBeenCalled();
  });

  it("SUPER_ADMIN crosses tenants deliberately", async () => {
    signedInAs("super", "SUPER_ADMIN");
    ParentStudentLink.findById.mockResolvedValue(linkAt(SCHOOL_B));
    Parent.findOne.mockResolvedValue(parentDoc({ accessState: "NOT_CREATED" }));

    const res = await POST(request({ linkId: LINK_ID }));
    expect(res.status).toBe(201);
  });

  it("teachers are excluded entirely — issuing credentials is administrative", async () => {
    signedInAs(SCHOOL_A, "TEACHER");
    const res = await POST(request({ linkId: LINK_ID }));
    expect(res.status).toBe(403);
  });

  it("parents cannot reach this route at all", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "parent-1", role: "PARENT" },
    });
    const res = await POST(request({ linkId: LINK_ID }));
    expect(res.status).toBe(403);
  });
});

describe("access status never leaks secrets (§52)", () => {
  it("returns the guardian's state and Parent ID, never a hash", async () => {
    signedInAs(SCHOOL_A);
    ParentStudentLink.findById.mockResolvedValue(linkAt(SCHOOL_A));
    Parent.findOne.mockResolvedValue(parentDoc());

    const res = await GET(
      new Request(
        `http://localhost/api/school/guardians/access?linkId=${LINK_ID}`
      )
    );
    const json = await res.json();
    const body = JSON.stringify(json);

    expect(json.data.accessState).toBe("ACTIVATED");
    // The Parent ID IS the credential now, so this endpoint hands one out. That
    // is deliberate — staff read it back to a guardian who mislaid their card —
    // and it is why every branch above proves the route is staff-only and
    // same-school. Nothing hashed or internal may ride along with it.
    expect(json.data.parentIdentifier).toBe("PRV-P-X7K4Q9");
    expect(body).not.toMatch(/pinHash|tokenHash|activationPinHash/);
  });
});

describe("revocation semantics (§44)", () => {
  it("REVOKE_ACCESS disables the whole account, not one child", async () => {
    signedInAs(SCHOOL_A);
    ParentStudentLink.findById.mockResolvedValue(linkAt(SCHOOL_A));
    Parent.findOne.mockResolvedValue(parentDoc());

    const res = await PATCH(
      request({ linkId: LINK_ID, action: "REVOKE_ACCESS" }, "PATCH")
    );

    expect(res.status).toBe(200);
    expect(revokeParentAccess).toHaveBeenCalled();
  });

  it("refuses to issue a new card to a revoked guardian", async () => {
    signedInAs(SCHOOL_A);
    ParentStudentLink.findById.mockResolvedValue(linkAt(SCHOOL_A));
    Parent.findOne.mockResolvedValue(parentDoc({ accessState: "REVOKED" }));

    const res = await POST(request({ linkId: LINK_ID }));

    // Otherwise reissuing would silently undo a deliberate revocation.
    expect(res.status).toBe(409);
    expect(issueParentAccess).not.toHaveBeenCalled();
  });

  it("RESTORE_ACCESS puts a connected guardian straight back to ACTIVATED", async () => {
    signedInAs(SCHOOL_A);
    ParentStudentLink.findById.mockResolvedValue(linkAt(SCHOOL_A));
    const parent = parentDoc({
      accessState: "REVOKED",
      activatedAt: new Date("2026-02-01"),
    });
    Parent.findOne.mockResolvedValue(parent);

    const res = await PATCH(
      request({ linkId: LINK_ID, action: "RESTORE_ACCESS" }, "PATCH")
    );

    // Revocation suspends sign-in but never rotates the Parent ID, so the card
    // the guardian already holds starts working again — no reprint needed.
    expect(res.status).toBe(200);
    expect(parent.accessState).toBe("ACTIVATED");
    expect(issueParentAccess).not.toHaveBeenCalled();
  });

  it("RESTORE_ACCESS returns a never-connected guardian to waiting", async () => {
    signedInAs(SCHOOL_A);
    ParentStudentLink.findById.mockResolvedValue(linkAt(SCHOOL_A));
    const parent = parentDoc({ accessState: "REVOKED", activatedAt: null });
    Parent.findOne.mockResolvedValue(parent);

    await PATCH(request({ linkId: LINK_ID, action: "RESTORE_ACCESS" }, "PATCH"));

    expect(parent.accessState).toBe("PENDING_ACTIVATION");
  });
});

describe("optional contact details (§3, §50)", () => {
  it("accepts adding an email later without requiring one up front", async () => {
    signedInAs(SCHOOL_A);
    ParentStudentLink.findById.mockResolvedValue(linkAt(SCHOOL_A));
    const parent = parentDoc();
    Parent.findOne.mockResolvedValue(parent);

    const res = await PATCH(
      request(
        { linkId: LINK_ID, action: "SET_CONTACT", email: "sita@example.com" },
        "PATCH"
      )
    );

    expect(res.status).toBe(200);
    expect(parent.email).toBe("sita@example.com");
  });

  it("allows clearing a contact back to nothing", async () => {
    signedInAs(SCHOOL_A);
    ParentStudentLink.findById.mockResolvedValue(linkAt(SCHOOL_A));
    const parent = parentDoc({ email: "old@example.com" });
    Parent.findOne.mockResolvedValue(parent);

    await PATCH(
      request({ linkId: LINK_ID, action: "SET_CONTACT", email: "" }, "PATCH")
    );

    // A guardian is allowed to have no email at all.
    expect(parent.email).toBeUndefined();
  });
});
