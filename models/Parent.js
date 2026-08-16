import mongoose from "mongoose";
import { ensureParentId } from "@/lib/parentIdentity";

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

    // The human-readable handle printed on the Parent Access Card (§2), and —
    // since the guardian PIN was removed — the guardian's ONLY credential.
    //
    // Stable in normal use: it survives reprinting a card, adding a second
    // child, and a school revoking and restoring access. It is rotated in
    // exactly one case, `issueParentAccess({ purpose: "REISSUE" })`, because a
    // lost card can only be made harmless by changing the thing printed on it.
    //
    // Being a credential, it must not be exposed to anyone but school staff and
    // the guardian: no public pages, no URLs that get shared onward, no logs.
    parentId: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },

    // --- Contact: OPTIONAL, both of them (§3, §21) ------------------------
    // A guardian with neither a phone nor an email is a fully valid guardian.
    // These are CONTACT METHODS, not identity. Identity is the parentId.
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
    // --- DEAD FIELDS: the guardian PIN ------------------------------------
    // Kept declared, and only for that reason. Guardians sign in with their
    // Parent ID alone; nothing reads or writes any of these four any more.
    //
    // They stay because dropping fields from a schema does not remove them from
    // documents already in Atlas, and a half-migrated collection where some
    // guardians carry a stale `pinHash` and others do not is worse than four
    // inert columns. Declared here so a future reader finds them explained
    // rather than mysterious. Safe to drop in a deliberate migration.
    pinHash: {
      type: String,
      default: "",
      select: false,
    },
    pinSetAt: {
      type: Date,
      default: null,
    },
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
        "PENDING_ACTIVATION", // card issued, guardian has not signed in yet
        "ACTIVATED", // guardian has signed in at least once
        "LOCKED", // legacy: only ever set by the removed PIN lockout
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
 * Every guardian gets a Parent ID the moment their record exists.
 *
 * This lives on the MODEL rather than in each creation path on purpose: parents
 * are created from registration auto-linking, the retrospective backfill, the
 * school's "add guardian" form, and self-registration. A hook is the only place
 * that all four cannot forget.
 *
 * Note this hook only ever FILLS A MISSING value, which matters more than it
 * used to: the Parent ID is now the guardian's credential, so a hook that
 * regenerated one would silently sign a family out. Rotation is a deliberate
 * act and lives in `issueParentAccess`, not here.
 *
 * Assigning it at creation — before any card is printed — is still right. The
 * roster needs the column filled so staff can read a guardian their ID over the
 * phone, and an ID that exists but has never been printed is not reachable by
 * anyone: `accessState` gates sign-in independently.
 */
// Static import, and an async hook with NO `next` callback. An earlier version
// used a dynamic `import()` inside the hook and mixed it with `next()`: the
// module never resolved at runtime, every save rejected, and the Parent ID
// column stayed blank with the failure swallowed by the caller's try/catch.
// `lib/parentIdentity` imports nothing from models, so there is no cycle to
// avoid here.
ParentSchema.pre("save", async function assignParentId() {
  await ensureParentId(this, this.constructor);
});

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
