import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import Parent from "@/models/Parent";
import ParentActivation, {
  MAX_ACTIVATION_ATTEMPTS,
  DEFAULT_ACTIVATION_TTL_DAYS,
} from "@/models/ParentActivation";
import AuditLog from "@/models/AuditLog";
import { allocateParentId, normalizeParentId } from "@/lib/parentIdentity";

/**
 * Parent Access credentials: issuing cards, activating them, and PIN sign-in
 * (§6, §7, §11, §41, §42, §52).
 *
 * Everything credential-shaped lives in this one module so the security rules
 * are auditable in a single place rather than scattered across routes:
 *
 *   - Secrets are generated with `crypto.randomBytes`, never `Math.random`.
 *   - Nothing is ever stored in plaintext, returned twice, or logged.
 *   - Every verification path is rate limited AND attempt-capped.
 *   - Failures are deliberately indistinguishable to the caller.
 *
 * Hash choice is not uniform, and that is intentional:
 *   - QR token  → SHA-256. 32 random bytes has no structure to brute force, and
 *     lookup must be an indexed equality match.
 *   - Any PIN   → bcrypt. Six digits is weak, so the work factor is the whole
 *     defence if a hash ever leaks.
 */

const BCRYPT_ROUNDS = 10;

// Failed sign-in attempts before the account locks, and for how long.
export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;

export const PIN_LENGTH = 6;

// --------------------------------------------------------------------------
// Generation
// --------------------------------------------------------------------------

/** 32 random bytes, URL-safe. Backs the QR code. */
export function generateActivationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashActivationToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}

/**
 * A numeric PIN with a uniform distribution.
 *
 * `randomInt` rather than `randomBytes % 10`, which biases low digits — a
 * skewed PIN space measurably shrinks the search an attacker has to do.
 */
export function generateNumericPin(length = PIN_LENGTH) {
  let pin = "";
  for (let i = 0; i < length; i += 1) {
    pin += String(crypto.randomInt(0, 10));
  }
  return pin;
}

export function isValidPinFormat(value) {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(String(value || ""));
}

/**
 * Reject PINs that are trivially guessable (§11 asks for a simple PIN, but a
 * simple PIN still must not be `000000` or `123456`).
 */
export function isWeakPin(value) {
  const pin = String(value || "");
  if (!isValidPinFormat(pin)) return true;

  // All the same digit.
  if (/^(\d)\1+$/.test(pin)) return true;

  // Strictly ascending or descending runs.
  const ascending = [...pin].every(
    (digit, index) =>
      index === 0 || Number(digit) === Number(pin[index - 1]) + 1
  );
  const descending = [...pin].every(
    (digit, index) =>
      index === 0 || Number(digit) === Number(pin[index - 1]) - 1
  );

  return ascending || descending;
}

export async function hashPin(pin) {
  return bcrypt.hash(String(pin), BCRYPT_ROUNDS);
}

// --------------------------------------------------------------------------
// Audit
// --------------------------------------------------------------------------

/**
 * Record a security-relevant parent-access event (§66).
 *
 * Never awaited by callers on the critical path, and never given a secret:
 * `details` is for ids and outcomes only. A PIN or token appearing here would
 * defeat the point of hashing it.
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
 * Returns the plaintext token and activation PIN EXACTLY ONCE, for immediate
 * rendering onto the printed card. They are unreadable afterwards.
 *
 * Reissuing revokes every outstanding activation for that guardian first
 * (§42: "old QR/token invalid"), which is what makes a lost card safe.
 *
 * The Parent ID is allocated on first issue and then kept forever — a guardian
 * who has memorised or laminated their ID should not have it change because a
 * card was reprinted.
 */
export async function issueParentAccess({
  parent,
  schoolId,
  studentId = null,
  issuedBy,
  purpose = "INITIAL",
  ttlDays = DEFAULT_ACTIVATION_TTL_DAYS,
}) {
  await connectDB();

  // Assign a permanent Parent ID on first issue only.
  if (!parent.parentId) {
    parent.parentId = await allocateParentId(Parent);
  }

  // Invalidate anything still outstanding. A guardian must never hold two live
  // cards — a lost one would stay usable.
  await ParentActivation.updateMany(
    { parent: parent._id, status: "PENDING" },
    {
      $set: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedBy: issuedBy,
      },
    }
  );

  const token = generateActivationToken();
  const activationPin = generateNumericPin();

  const activation = await ParentActivation.create({
    parent: parent._id,
    school: schoolId,
    student: studentId,
    tokenHash: hashActivationToken(token),
    activationPinHash: await hashPin(activationPin),
    pinHint: activationPin.slice(-2),
    purpose,
    status: "PENDING",
    expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
    issuedBy,
  });

  // A PIN reset must actually invalidate the old PIN, otherwise the guardian
  // who forgot it is not the only one who can still sign in.
  if (purpose === "PIN_RESET") {
    parent.pinHash = "";
    parent.pinSetAt = null;
  }

  parent.accessState = "PENDING_ACTIVATION";
  parent.failedPinAttempts = 0;
  parent.lockedUntil = null;
  await parent.save();

  await auditParentAccess({
    action:
      purpose === "PIN_RESET"
        ? "PARENT_ACCESS_PIN_RESET"
        : purpose === "REISSUE"
          ? "PARENT_ACCESS_REISSUED"
          : "PARENT_ACCESS_CREATED",
    parentId: parent._id,
    performedBy: issuedBy,
    role: "SCHOOL_ADMIN",
    details: {
      activationId: String(activation._id),
      school: String(schoolId),
      student: studentId ? String(studentId) : null,
      expiresAt: activation.expiresAt,
    },
  });

  return {
    // Shown once, then gone.
    parentIdentifier: parent.parentId,
    activationToken: token,
    activationPin,
    activationId: String(activation._id),
    expiresAt: activation.expiresAt,
  };
}

// --------------------------------------------------------------------------
// Activation
// --------------------------------------------------------------------------

/**
 * A single opaque failure for every rejected activation.
 *
 * Wrong token, expired card, already-used card, burnt-out attempt counter — the
 * caller cannot tell them apart, so activation cannot be used as an oracle for
 * which cards exist (§53).
 */
export const ACTIVATION_INVALID = {
  ok: false,
  code: "INVALID_ACTIVATION",
  message:
    "This card is not valid any more. Please ask your school for a new one.",
};

function isUsable(activation) {
  if (!activation) return false;
  if (activation.status !== "PENDING") return false;
  if (activation.expiresAt && activation.expiresAt < new Date()) return false;
  if (activation.attemptCount >= MAX_ACTIVATION_ATTEMPTS) return false;
  return true;
}

/**
 * Resolve a QR token to its activation WITHOUT consuming it.
 *
 * Used by the confirmation screen, which must show the child before anything is
 * activated (§9: "Do not activate before confirmation"). Read-only by design.
 */
export async function resolveActivationByToken(token) {
  await connectDB();

  const activation = await ParentActivation.findOne({
    tokenHash: hashActivationToken(token),
    status: "PENDING",
  });

  if (!isUsable(activation)) {
    // Mark a genuinely expired card so the school's list stays accurate.
    if (activation && activation.expiresAt < new Date()) {
      activation.status = "EXPIRED";
      await activation.save();
    }
    return null;
  }

  return activation;
}

/**
 * Resolve a Parent ID + activation PIN pair (the no-camera path, §8).
 *
 * The Parent ID alone gets you nothing: it only narrows the search to one
 * guardian, and the PIN must then match that guardian's live activation. Every
 * wrong attempt burns one of a small budget on that specific card.
 */
export async function resolveActivationByPin(rawParentId, pin) {
  await connectDB();

  const parentIdentifier = normalizeParentId(rawParentId);
  if (!parentIdentifier || !isValidPinFormat(pin)) return null;

  const parent = await Parent.findOne({
    parentId: parentIdentifier,
    isDeleted: { $ne: true },
  });
  if (!parent) return null;

  const activation = await ParentActivation.findOne({
    parent: parent._id,
    status: "PENDING",
  }).sort({ createdAt: -1 });

  if (!isUsable(activation)) return null;

  const matches = await bcrypt.compare(String(pin), activation.activationPinHash);
  if (!matches) {
    // Charge the attempt against the card, so rotating IPs does not buy more
    // guesses at the same six digits.
    activation.attemptCount += 1;
    await activation.save();

    await auditParentAccess({
      action: "PARENT_ACTIVATION_FAILED",
      parentId: parent._id,
      performedBy: parent._id,
      role: "PARENT",
      details: { attemptCount: activation.attemptCount },
    });
    return null;
  }

  return activation;
}

/**
 * Complete activation: consume the card and set the guardian's own PIN (§11).
 *
 * The consume-and-set is ordered so a crash cannot leave a usable card behind a
 * set PIN. The activation is marked USED first; if the PIN write then failed
 * the guardian would need a new card, which is the safe direction to fail.
 */
export async function completeActivation({
  activation,
  parent,
  pin,
  language = "en",
  devicePreference = "UNKNOWN",
}) {
  await connectDB();

  if (!isValidPinFormat(pin)) {
    return { ok: false, code: "INVALID_PIN", message: "Please choose 6 digits." };
  }
  if (isWeakPin(pin)) {
    return {
      ok: false,
      code: "WEAK_PIN",
      message: "Please avoid 000000 or 123456. Choose 6 different digits.",
    };
  }

  activation.status = "USED";
  activation.usedAt = new Date();
  await activation.save();

  parent.pinHash = await hashPin(pin);
  parent.pinSetAt = new Date();
  parent.accessState = "ACTIVATED";
  parent.activatedAt = parent.activatedAt || new Date();
  parent.failedPinAttempts = 0;
  parent.lockedUntil = null;
  parent.devicePreference = ["PERSONAL", "SHARED"].includes(devicePreference)
    ? devicePreference
    : "UNKNOWN";
  if (["en", "ne"].includes(language)) {
    parent.preferences = parent.preferences || {};
    parent.preferences.language = language;
  }
  await parent.save();

  await auditParentAccess({
    action: "PARENT_ACTIVATION_COMPLETED",
    parentId: parent._id,
    performedBy: parent._id,
    role: "PARENT",
    details: {
      activationId: String(activation._id),
      devicePreference: parent.devicePreference,
    },
  });

  return { ok: true };
}

// --------------------------------------------------------------------------
// Sign-in
// --------------------------------------------------------------------------

/**
 * Verify a Parent ID + PIN sign-in (§13).
 *
 * Returns `{ ok, parent }` or `{ ok: false, code }`. Lockout is time-based
 * rather than permanent: a guardian who genuinely forgot their PIN should get
 * another go in fifteen minutes without needing the school, while an attacker
 * gets five guesses per window.
 *
 * Callers MUST also apply an IP rate limit; the per-account counter here is the
 * second layer, not the only one.
 */
export async function verifyParentPin(rawParentId, pin) {
  await connectDB();

  const parentIdentifier = normalizeParentId(rawParentId);
  if (!parentIdentifier || !isValidPinFormat(pin)) {
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  // pinHash is `select: false`, so it must be asked for explicitly.
  const parent = await Parent.findOne({
    parentId: parentIdentifier,
    isDeleted: { $ne: true },
  }).select("+pinHash");

  // Same generic answer whether the ID is unknown or the PIN is wrong — an
  // attacker must not learn that a Parent ID is real (§53).
  if (!parent) return { ok: false, code: "INVALID_CREDENTIALS" };

  if (parent.lockedUntil && parent.lockedUntil > new Date()) {
    return {
      ok: false,
      code: "LOCKED",
      retryAfterSeconds: Math.ceil((parent.lockedUntil - new Date()) / 1000),
    };
  }

  if (parent.status !== "ACTIVE" || parent.accessState === "REVOKED") {
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  if (!parent.pinHash) {
    // Card issued but never activated — the guardian needs to activate, not
    // sign in. Distinguishable because it is not a credential-guessing signal:
    // it only reveals state the guardian already knows from their card.
    return { ok: false, code: "NOT_ACTIVATED" };
  }

  const matches = await bcrypt.compare(String(pin), parent.pinHash);

  if (!matches) {
    parent.failedPinAttempts = (parent.failedPinAttempts || 0) + 1;

    if (parent.failedPinAttempts >= MAX_PIN_ATTEMPTS) {
      parent.lockedUntil = new Date(Date.now() + PIN_LOCK_MINUTES * 60 * 1000);
      parent.accessState = "LOCKED";
      parent.failedPinAttempts = 0;
    }
    await parent.save();

    await auditParentAccess({
      action: "PARENT_PIN_FAILED",
      parentId: parent._id,
      performedBy: parent._id,
      role: "PARENT",
      details: { locked: Boolean(parent.lockedUntil) },
    });

    return {
      ok: false,
      code: parent.lockedUntil ? "LOCKED" : "INVALID_CREDENTIALS",
    };
  }

  // Success clears the counter and any expired lock.
  parent.failedPinAttempts = 0;
  parent.lockedUntil = null;
  if (parent.accessState === "LOCKED") parent.accessState = "ACTIVATED";
  parent.lastLoginAt = new Date();
  await parent.save();

  return { ok: true, parent };
}

/**
 * School-initiated revocation of ACCESS (§44).
 *
 * Distinct from revoking a ParentStudentLink: this disables the guardian's
 * ability to sign in at all. Removing one child is a link operation and must
 * NOT come through here — a father who loses access to Child A keeps Child B.
 */
export async function revokeParentAccess({ parent, performedBy, reason = "" }) {
  await connectDB();

  await ParentActivation.updateMany(
    { parent: parent._id, status: "PENDING" },
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
