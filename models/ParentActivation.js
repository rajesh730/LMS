import mongoose from "mongoose";

/**
 * LEGACY — a one-time Parent Access activation. **Read-only; nothing creates
 * these any more.**
 *
 * Under the original design a Parent Access Card carried a one-time QR token
 * and a one-time activation PIN, which a guardian exchanged for a self-chosen
 * 6-digit PIN. That whole journey was removed: the Parent ID printed on the
 * card is now the credential and signing in is a single step. See
 * lib/parentCredentials.js for what replaced this and why.
 *
 * The collection survives for one reason: **cards printed under the old flow
 * are in school bags right now.** Their QR encodes `/parent/activate?t=<token>`,
 * and `verifyParentCardToken` resolves that token through these rows so those
 * cards keep working instead of turning into paper overnight.
 *
 * Consequently only two things still read or write here:
 *   - `verifyParentCardToken` — look up a scanned legacy token.
 *   - `issueParentAccess` / `revokeParentAccess` — mark rows REVOKED, which is
 *     what stops an old card when a guardian is given a new Parent ID.
 *
 * `activationPinHash`, `expiresAt`, `attemptCount` and `pinHint` are inert.
 * Once no legacy cards remain in circulation this collection can be dropped.
 */

const ParentActivationSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      required: true,
      index: true,
    },
    // The school that issued this card. Used for tenant isolation (§56) — a
    // School A admin must never be able to reset or reissue a School B
    // activation, even for a guardian they legitimately share.
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // The child this card was printed for. A guardian with children at two
    // schools gets a card from each; the card names the child so the guardian
    // can tell them apart.
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },

    // SHA-256 of the QR token. Not bcrypt: the token is 32 random bytes, so it
    // has no guessable structure to slow down, and lookup must be an indexed
    // equality match rather than a scan-and-compare across every row.
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    // bcrypt of the 6-digit activation PIN. Bcrypt here BECAUSE it is weak and
    // low-entropy — the work factor is what makes an offline attack on a
    // leaked hash impractical.
    activationPinHash: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      enum: ["INITIAL", "REISSUE", "PIN_RESET"],
      default: "INITIAL",
    },

    status: {
      type: String,
      enum: ["PENDING", "USED", "EXPIRED", "REVOKED"],
      default: "PENDING",
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Wrong-PIN counter for this specific card. Complements the IP/account rate
    // limits: an attacker who knows a Parent ID still only gets a handful of
    // guesses at its six-digit PIN before the card is dead.
    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Last 2 digits of the activation PIN, so a school with two cards on the
    // desk can tell them apart without being able to reconstruct either.
    pinHint: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// Lookup paths.
ParentActivationSchema.index({ tokenHash: 1, status: 1 });
ParentActivationSchema.index({ parent: 1, status: 1, createdAt: -1 });
ParentActivationSchema.index({ school: 1, status: 1, createdAt: -1 });

export const MAX_ACTIVATION_ATTEMPTS = 6;
export const DEFAULT_ACTIVATION_TTL_DAYS = 30;

export default mongoose.models.ParentActivation ||
  mongoose.model("ParentActivation", ParentActivationSchema);
