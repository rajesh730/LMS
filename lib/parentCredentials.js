import crypto from "crypto";
import connectDB from "@/lib/db";
import Parent from "@/models/Parent";
import ParentActivation from "@/models/ParentActivation";
import AuditLog from "@/models/AuditLog";
import { allocateParentId, normalizeParentId } from "@/lib/parentIdentity";

/**
 * Parent Access: issuing cards and signing guardians in.
 *
 * **The Parent ID is the credential.** There is no PIN and no password. A
 * guardian scans the QR on their Parent Access Card, or types the Parent ID
 * printed next to it, and they are in.
 *
 * This replaces an earlier design in which the ID was an identifier only and a
 * self-chosen 6-digit PIN did the authenticating. That design was correct on
 * paper and wrong in the field: it made a guardian invent, confirm and then
 * remember a secret before they could see their own child, and the guardians
 * this product exists for are exactly the ones for whom that is a wall. The
 * decision to trade the second factor for reach was made deliberately.
 *
 * What that trade means, stated plainly so nobody has to infer it:
 *
 *   - **Anyone holding the card — or the ID off it — can sign in.** The card is
 *     a key. It must be handed over like one.
 *   - **The Parent ID is therefore no longer safe to treat as public.** It is
 *     still shown to school staff (they issue it), but it must not be put in
 *     URLs that get shared, logs, or anything a non-staff reader can reach.
 *   - **A lost card is revoked by issuing a new one**, which ROTATES the Parent
 *     ID and invalidates every live session. That is the only thing that can
 *     make a leaked ID stop working, which is why `issueParentAccess` rotates
 *     rather than reprinting the same value.
 *
 * The two defences that remain are the ID's own entropy (32^6 ≈ 1.07 billion,
 * random and non-sequential, so the space stays sparse) and the IP rate limit
 * on the sign-in route, which callers MUST apply.
 */

// --------------------------------------------------------------------------
// Audit
// --------------------------------------------------------------------------

/**
 * Record a security-relevant parent-access event.
 *
 * Never given a secret: `details` is for ids and outcomes only. A Parent ID
 * appearing here would put a live credential into the audit log, so it never
 * does — the parent's ObjectId identifies the row.
 */
export async function auditParentAccess({
  action,
  parentId,
  performedBy,
  role = "",
  reason = "",
  details = null,
}) {
  try {
    await AuditLog.create({
      entityType: "ParentAccess",
      entityId: parentId,
      action,
      performedBy,
      role,
      reason,
      after: details,
    });
  } catch (err) {
    // Audit failure must never break the operation being audited.
    console.error("[parentCredentials] audit write failed:", err.message);
  }
}

// --------------------------------------------------------------------------
// Issuing a Parent Access Card
// --------------------------------------------------------------------------

/**
 * Issue (or reissue) Parent Access for a guardian.
 *
 * `INITIAL` — first card. Allocates the Parent ID if the guardian has none and
 * marks them as waiting to connect. Safe to call repeatedly: reprinting a card
 * for a guardian who has not lost it must not disturb them, and the card is
 * re-renderable from the database at any time because the Parent ID is stored
 * in readable form.
 *
 * `REISSUE` — the lost-card case. **Rotates the Parent ID** and bumps
 * `authVersion`, so the old card stops working immediately and any session
 * opened with it is dropped on its next request. Nothing else can achieve that
 * now the ID is the credential: reprinting the same ID would leave the lost
 * card just as usable as the new one.
 *
 * Returns the guardian's current Parent ID. Unlike the old flow there is
 * nothing "shown once" — the school can print this card again tomorrow.
 */
export async function issueParentAccess({
  parent,
  schoolId,
  studentId = null,
  issuedBy,
  purpose = "INITIAL",
}) {
  await connectDB();

  const previousIdentifier = parent.parentId || null;
  const rotating = purpose === "REISSUE" || purpose === "PIN_RESET";

  if (rotating || !parent.parentId) {
    parent.parentId = await allocateParentId(Parent);
  }

  if (rotating) {
    // Every card ever printed for this guardian is now dead. Legacy QR cards
    // resolve through ParentActivation, so they have to be closed off too.
    await ParentActivation.updateMany(
      { parent: parent._id, status: { $ne: "REVOKED" } },
      {
        $set: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedBy: issuedBy,
        },
      }
    );

    // Drops every JWT issued to this guardian, so a session opened with the
    // old card cannot outlive the card itself.
    parent.authVersion = (parent.authVersion || 0) + 1;
  }

  // "Waiting to connect" until they sign in with THIS card. A rotation always
  // resets that, because the ID they connected with no longer exists. A plain
  // reprint must not: demoting a guardian who is signed in right now would put
  // a lie on the school's roster and hide them from the "not connected yet"
  // follow-up list.
  if (rotating || parent.accessState !== "ACTIVATED") {
    parent.accessState = "PENDING_ACTIVATION";
  }
  await parent.save();

  await auditParentAccess({
    action: rotating ? "PARENT_ACCESS_REISSUED" : "PARENT_ACCESS_CREATED",
    parentId: parent._id,
    performedBy: issuedBy,
    role: "SCHOOL_ADMIN",
    details: {
      school: String(schoolId),
      student: studentId ? String(studentId) : null,
      // Whether the ID changed, never the ID itself.
      rotated: rotating && previousIdentifier !== parent.parentId,
    },
  });

  return {
    parentIdentifier: parent.parentId,
    rotated: rotating && previousIdentifier !== parent.parentId,
    purpose: rotating ? "REISSUE" : "INITIAL",
  };
}

// --------------------------------------------------------------------------
// Sign-in
// --------------------------------------------------------------------------

/**
 * The single opaque failure for every rejected sign-in.
 *
 * An unknown Parent ID, a suspended account and a revoked one are deliberately
 * indistinguishable, so the sign-in form cannot be used to discover which IDs
 * are real.
 */
const INVALID = { ok: false, code: "INVALID_CREDENTIALS" };

/**
 * Shared tail of every sign-in path: check the account, then record the visit.
 *
 * The first successful sign-in is what "activates" a guardian — there is no
 * separate activation step any more, because there is nothing left for one to
 * do. The card was the invitation; using it is the acceptance.
 */
async function completeSignIn(parent, { language } = {}) {
  if (!parent) return INVALID;
  if (parent.status !== "ACTIVE") return INVALID;
  if (parent.accessState === "REVOKED") return INVALID;

  // NOT_CREATED means no card has ever been issued for this guardian. Parent
  // rows are created by registration auto-linking and by the retrospective
  // backfill as well as by the school, so plenty of them exist that no guardian
  // was ever given access to — and every one carries a Parent ID from the
  // model's pre-save hook. Requiring a deliberate "create access card" before
  // that ID means anything is what keeps those rows from being live logins.
  if (parent.accessState === "NOT_CREATED") return INVALID;

  const firstSignIn = parent.accessState !== "ACTIVATED";

  if (firstSignIn) {
    parent.accessState = "ACTIVATED";
    parent.activatedAt = parent.activatedAt || new Date();

    // Close off the legacy one-time activations this guardian may still hold;
    // they have connected, so an outstanding card serves no purpose.
    await ParentActivation.updateMany(
      { parent: parent._id, status: "PENDING" },
      { $set: { status: "USED", usedAt: new Date() } }
    );
  }

  // The guardian picked a language on the sign-in screen. Honour it — it is an
  // explicit choice by the person holding the card, and asking again inside the
  // app would be one more step in front of the child they came to see.
  if (["en", "ne"].includes(language)) {
    parent.preferences = parent.preferences || {};
    parent.preferences.language = language;
  }

  parent.lastLoginAt = new Date();
  await parent.save();

  if (firstSignIn) {
    await auditParentAccess({
      action: "PARENT_ACCESS_ACTIVATED",
      parentId: parent._id,
      performedBy: parent._id,
      role: "PARENT",
    });
  }

  return { ok: true, parent, firstSignIn };
}

/**
 * Sign in with a typed Parent ID.
 *
 * Case- and hyphen-insensitive via `normalizeParentId`, because this gets read
 * off a printed card and sometimes aloud down a phone line.
 *
 * Callers MUST also apply an IP rate limit. With no second factor it is the
 * only thing standing between the ID space and a brute-force sweep.
 */
export async function verifyParentId(rawParentId, options = {}) {
  await connectDB();

  const parentIdentifier = normalizeParentId(rawParentId);
  if (!parentIdentifier) return INVALID;

  const parent = await Parent.findOne({
    parentId: parentIdentifier,
    isDeleted: { $ne: true },
  });

  return completeSignIn(parent, options);
}

/**
 * SHA-256 of a legacy QR token. Kept only to look up cards printed under the
 * old activation flow; nothing issues new ones.
 */
export function hashActivationToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}

/**
 * Sign in by scanning a card printed under the OLD activation flow.
 *
 * Those cards encode `/parent/activate?t=<token>` and there are printed copies
 * in circulation, so they keep working: the token resolves to its guardian and
 * the account checks then run exactly as they do for a typed Parent ID.
 *
 * A REVOKED activation is refused — that is what "issue a new card" and "revoke
 * access" set — but an expired or already-used one is accepted. Expiry existed
 * to bound a one-time activation window; there is no such window now, and
 * letting a card lapse into uselessness in a drawer would strand exactly the
 * guardians this flow is for.
 */
export async function verifyParentCardToken(token) {
  await connectDB();

  const raw = String(token || "").trim();
  if (!raw) return INVALID;

  const activation = await ParentActivation.findOne({
    tokenHash: hashActivationToken(raw),
    status: { $ne: "REVOKED" },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!activation) return INVALID;

  const parent = await Parent.findOne({
    _id: activation.parent,
    isDeleted: { $ne: true },
  });

  return completeSignIn(parent);
}

// --------------------------------------------------------------------------
// Revocation
// --------------------------------------------------------------------------

/**
 * School-initiated revocation of ACCESS.
 *
 * Distinct from revoking a ParentStudentLink: this disables the guardian's
 * ability to sign in at all. Removing one child is a link operation and must
 * NOT come through here — a father who loses access to Child A keeps Child B.
 *
 * Note this does not rotate the Parent ID. Revocation is reversible by design
 * (a school suspending a guardian during a dispute expects to restore them),
 * and `accessState: "REVOKED"` is checked on every sign-in. Use `issueParentAccess`
 * with `REISSUE` for the irreversible case: a card that is actually lost.
 */
export async function revokeParentAccess({ parent, performedBy, reason = "" }) {
  await connectDB();

  await ParentActivation.updateMany(
    { parent: parent._id, status: { $ne: "REVOKED" } },
    { $set: { status: "REVOKED", revokedAt: new Date(), revokedBy: performedBy } }
  );

  parent.accessState = "REVOKED";
  // Bumping authVersion invalidates every existing JWT for this guardian, so
  // revocation takes effect on their next request rather than at token expiry.
  parent.authVersion = (parent.authVersion || 0) + 1;
  await parent.save();

  await auditParentAccess({
    action: "PARENT_ACCESS_REVOKED",
    parentId: parent._id,
    performedBy,
    role: "SCHOOL_ADMIN",
    reason,
  });
}
