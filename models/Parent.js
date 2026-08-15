import mongoose from "mongoose";

/**
 * Parent / Guardian account.
 *
 * Parents live in their OWN collection, exactly like Teacher and Student, rather
 * than as a `User` role. Three reasons:
 *   1. A guardian is not scoped to one school — they may have children in
 *      several Pravyo schools at once, so the `User.schoolName` shape does not
 *      fit (see docs/PARENT_APP.md).
 *   2. Guardian records are created by invitation, never by open registration,
 *      so they must never be reachable by the school-registration flow.
 *   3. It keeps the existing admin/teacher/student auth branches untouched.
 *
 * A parent NEVER stores which children they can see. That lives exclusively in
 * ParentStudentLink, which the school controls. See lib/parentAccess.js — the
 * single gate every parent API must pass through.
 */

// Per-guardian app preferences. Embedded rather than a separate
// ParentPreference collection: it is a strict 1:1 with the parent, is always
// read together with the parent, and is tiny.
const parentPreferenceSchema = new mongoose.Schema(
  {
    // "Simple Parent Mode" — larger type, fewer cards, one CTA per card.
    simpleMode: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      enum: ["en", "ne"],
      default: "en",
    },
    calendarPreference: {
      type: String,
      enum: ["AD", "BS"],
      default: "BS",
    },
    // Channel opt-ins. Only in-app push is wired today; sms/email are recorded
    // now so the delivery layer can be added later without a migration (§21).
    notifications: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
    },
    // Autoplay-off / thumbnail-only browsing for metered mobile data (§22).
    dataSaver: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const ParentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },

    // The permanent, human-readable handle printed on the Parent Access Card
    // (§2). Identifies the account; never authenticates it. Assigned at
    // creation and never rotated — a reissued card keeps the same Parent ID
    // (§6: "Do not unnecessarily expire the permanent Parent ID").
    parentId: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },

    // --- Contact: OPTIONAL, both of them (§3, §21) ------------------------
    // A guardian with neither a phone nor an email is a fully valid guardian.
    // These are CONTACT METHODS, not identity. Identity is parentId + PIN.
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
    },

    // --- Credentials -------------------------------------------------------
    // Legacy email/password credential. OPTIONAL now: guardians created through
    // the Parent Access Card flow never have one, and requiring it would make
    // a phone-less, email-less guardian impossible to create (§3, §57 keeps
    // existing password accounts working).
    password: {
      type: String,
      required: false,
    },
    // bcrypt hash of the guardian's 6-digit Pravyo PIN (§11). Never plaintext,
    // never returned by any API, never logged.
    pinHash: {
      type: String,
      default: "",
      select: false,
    },
    pinSetAt: {
      type: Date,
      default: null,
    },
    // Brute-force protection (§7, §52). Reset on a successful sign-in.
    failedPinAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },

    // Lifecycle of the guardian's ACCESS, distinct from `status` (the account)
    // and from ParentStudentLink.status (the relationship) — §59 requires all
    // three to stay separate.
    accessState: {
      type: String,
      enum: [
        "NOT_CREATED", // no access card has ever been issued
        "PENDING_ACTIVATION", // card issued, not yet activated
        "ACTIVATED", // PIN set, guardian can sign in
        "LOCKED", // too many failed PIN attempts
        "REVOKED", // school withdrew access
      ],
      default: "NOT_CREATED",
      index: true,
    },
    activatedAt: {
      type: Date,
      default: null,
    },

    // --- Household mode (§20) ---------------------------------------------
    // Some families deliberately share one account and one device. When this is
    // set, actions are attributed to the household ("Sharma Family opened
    // notice"), NOT to an individual guardian — and consent is withheld unless
    // the school explicitly grants it on the link, because a shared account
    // cannot evidence who actually decided.
    isHousehold: {
      type: Boolean,
      default: false,
    },
    householdName: {
      type: String,
      default: "",
      trim: true,
    },

    // Whether the guardian told us this is their own device (§12). Drives
    // session length only; the authoritative session lives in the JWT cookie.
    devicePreference: {
      type: String,
      enum: ["PERSONAL", "SHARED", "UNKNOWN"],
      default: "UNKNOWN",
    },
    photoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    preferences: {
      type: parentPreferenceSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "INACTIVE"],
      default: "ACTIVE",
    },
    // Bumped to force every existing session for this parent to be re-checked.
    // Mirrors User.authVersion so the same revocation pattern works.
    authVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

/**
 * The display name to attribute an action to.
 *
 * Household accounts must never have an action recorded against an individual
 * guardian who may not have performed it (§20).
 */
ParentSchema.methods.attributionName = function attributionName() {
  if (this.isHousehold) {
    return this.householdName || `${this.name} (Household)`;
  }
  return this.name;
};

// `parentId`, `email` (unique+sparse) and `phone` (sparse) already declare
// their indexes through the field options above — repeating them here made
// Mongoose warn about duplicate index definitions.
ParentSchema.index({ status: 1, isDeleted: 1 });
ParentSchema.index({ accessState: 1, isDeleted: 1 });

export default mongoose.models.Parent || mongoose.model("Parent", ParentSchema);
