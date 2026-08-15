import mongoose from "mongoose";
import crypto from "crypto";

/**
 * A school's invitation for a guardian to link to a student (§27).
 *
 * Flow:
 *   1. School creates an invitation for a student + contact (email/phone),
 *      choosing the relationship and permissions up front.
 *   2. Parent receives the code (email today; SMS later — §21).
 *   3. Parent signs up / signs in, submits the code.
 *   4. A ParentStudentLink is created (or a REVOKED one reactivated) as ACTIVE.
 *
 * The code is what makes linking authorised. It is stored HASHED: an invitation
 * grants access to a child's record, so a leaked database dump must not be
 * directly replayable. The plaintext is returned exactly once, at creation, for
 * the school to deliver.
 */

const GuardianInvitationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Short, human-readable, case-insensitive code the parent types in.
    // Stored as a SHA-256 hash; see hashInvitationCode below.
    codeHash: {
      type: String,
      required: true,
      index: true,
    },
    // Last 4 characters of the plaintext, so the school can tell two
    // outstanding invitations apart in its list without being able to replay
    // either of them.
    codeHint: {
      type: String,
      default: "",
      trim: true,
    },
    guardianName: {
      type: String,
      default: "",
      trim: true,
    },
    // At least one contact is required so the school can actually deliver the
    // code — enforced in the API, not the schema, so a school can create a
    // walk-in invitation and read the code off the screen.
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    relationshipType: {
      type: String,
      default: "OTHER",
      trim: true,
    },
    accessLevel: {
      type: String,
      default: "VIEW_AND_NOTICES",
      trim: true,
    },
    permissions: {
      canViewPortfolio: { type: Boolean, default: true },
      canReceiveNotices: { type: Boolean, default: true },
      canRegisterEvents: { type: Boolean, default: false },
      canGiveConsent: { type: Boolean, default: false },
      canMessageSchool: { type: Boolean, default: false },
    },
    isPrimaryGuardian: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // Wrong-code attempts. Caps replay guessing against a short code even
    // when the caller rotates IPs past the rate limiter.
    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Unambiguous alphabet: no O/0, I/1, so a code read off paper or over the
// phone by a parent cannot be mistyped into a different valid code.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInvitationCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export function hashInvitationCode(code) {
  return crypto
    .createHash("sha256")
    .update(String(code || "").trim().toUpperCase())
    .digest("hex");
}

// Lookup path when a parent submits a code.
GuardianInvitationSchema.index({ codeHash: 1, status: 1 });
GuardianInvitationSchema.index({ school: 1, status: 1, createdAt: -1 });
GuardianInvitationSchema.index({ student: 1, status: 1 });

export const MAX_INVITATION_ATTEMPTS = 10;

export default mongoose.models.GuardianInvitation ||
  mongoose.model("GuardianInvitation", GuardianInvitationSchema);
