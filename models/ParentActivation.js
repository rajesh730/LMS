import mongoose from "mongoose";

/**
 * A one-time Parent Access activation (§6, §7).
 *
 * Issued by the school when it prints (or reprints) a Parent Access Card, and
 * consumed exactly once when the guardian activates. Separate from `Parent`
 * because a guardian accrues MANY activations over their lifetime — first
 * issue, lost card, forgotten PIN, suspected compromise — and each one needs
 * its own expiry, attempt counter and audit trail.
 *
 * Two credentials are issued together, for two different situations:
 *
 *  - `tokenHash` — backs the QR code. High entropy, embedded in a URL, scanned.
 *  - `activationPinHash` — backs manual entry. Six digits, typed alongside the
 *    Parent ID by anyone who cannot scan (no camera, broken lens, printed card
 *    photocopied badly).
 *
 * BOTH are stored only as hashes. Neither is ever readable again after the
 * card is generated — §52 forbids exposing credentials in API responses after
 * creation, and a readable activation credential sitting in the database would
 * be a standing route into a child's record.
 *
 * NOTE the deliberate asymmetry with the QR token: the six-digit activation PIN
 * is weak on its own (10^6), so it is ONLY accepted together with the correct
 * Parent ID, and only under a strict attempt cap. The QR token is strong enough
 * to stand alone.
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
