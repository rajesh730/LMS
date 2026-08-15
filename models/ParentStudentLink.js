import mongoose from "mongoose";

/**
 * The authorisation edge between a guardian and a child.
 *
 * This is the ONLY thing that grants a parent access to a student. No parent
 * API may read a Student, Achievement, Notice, Event or Conversation without
 * first resolving an ACTIVE link here — see lib/parentAccess.js.
 *
 * Links are created by the SCHOOL (via GuardianInvitation) and can be revoked
 * by the school at any time. Parents can never create their own link, which is
 * what stops a parent attaching themselves to an arbitrary student (§26).
 *
 * Guardians of the same child do NOT necessarily have the same rights: a
 * non-custodial parent may be entitled to receive notices and view the
 * portfolio while not being able to give consent or register the child for
 * events (§20). Every permission is therefore an explicit boolean, defaulted
 * conservatively for anyone who is not the primary guardian.
 */

const RELATIONSHIP_TYPES = [
  "MOTHER",
  "FATHER",
  "GRANDPARENT",
  "LEGAL_GUARDIAN",
  "SIBLING",
  "UNCLE",
  "AUNT",
  "OTHER",
];

const ACCESS_LEVELS = [
  // Everything a guardian can do: portfolio, notices, consent, registration,
  // messaging. Typical for the primary custodial guardian.
  "FULL",
  // Sees the child's life and receives notices, but cannot act on the child's
  // behalf. Typical for a separated parent where the school has been told only
  // one guardian may consent.
  "VIEW_AND_NOTICES",
  // Portfolio only — no school communication. Typical for extended family.
  "VIEW_ONLY",
];

const ParentStudentLinkSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    // The school that authorised this link. Denormalised from the student so
    // access checks and school-scoped guardian lists do not need a second read.
    // On transfer the student's CURRENT school changes; this stays as the
    // authorising school, and `lib/parentAccess.js` re-resolves the live school
    // from the Student document.
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    relationshipType: {
      type: String,
      enum: RELATIONSHIP_TYPES,
      default: "OTHER",
    },
    accessLevel: {
      type: String,
      enum: ACCESS_LEVELS,
      default: "VIEW_AND_NOTICES",
    },

    // --- Granular permissions (§20) ---------------------------------------
    // accessLevel is a convenience preset the school UI writes; these booleans
    // are what the API actually enforces. applyAccessLevelDefaults() below
    // keeps them coherent when only the preset is supplied.
    canViewPortfolio: { type: Boolean, default: true },
    canReceiveNotices: { type: Boolean, default: true },
    canRegisterEvents: { type: Boolean, default: false },
    canGiveConsent: { type: Boolean, default: false },
    canMessageSchool: { type: Boolean, default: false },

    // Exactly one primary guardian per student is expected, but this is NOT
    // enforced by a unique index: during a guardianship change a school may
    // briefly have two, and blocking that would strand the record.
    isPrimaryGuardian: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "REVOKED"],
      default: "PENDING",
      index: true,
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    activatedAt: {
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
    revokedReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

/**
 * Fill the permission booleans from an access-level preset.
 *
 * Callers that set individual booleans explicitly should pass
 * `{ explicit: true }` so their choices are preserved — the school UI needs to
 * be able to say "view + notices, but ALSO allow consent" for a shared-custody
 * arrangement without the preset stomping it.
 */
export function applyAccessLevelDefaults(doc) {
  if (!doc) return doc;

  if (doc.accessLevel === "FULL") {
    doc.canViewPortfolio = true;
    doc.canReceiveNotices = true;
    doc.canRegisterEvents = true;
    doc.canGiveConsent = true;
    doc.canMessageSchool = true;
  } else if (doc.accessLevel === "VIEW_AND_NOTICES") {
    doc.canViewPortfolio = true;
    doc.canReceiveNotices = true;
    doc.canRegisterEvents = false;
    doc.canGiveConsent = false;
    doc.canMessageSchool = true;
  } else if (doc.accessLevel === "VIEW_ONLY") {
    doc.canViewPortfolio = true;
    doc.canReceiveNotices = false;
    doc.canRegisterEvents = false;
    doc.canGiveConsent = false;
    doc.canMessageSchool = false;
  }

  return doc;
}

// One link per parent+student pair. A re-invitation reuses the existing row
// (flipping REVOKED back to PENDING) rather than creating a duplicate.
ParentStudentLinkSchema.index({ parent: 1, student: 1 }, { unique: true });
// "Which children does this guardian have?" — the child switcher's query.
ParentStudentLinkSchema.index({ parent: 1, status: 1 });
// "Who are this child's guardians?" — notice fan-out and the school admin view.
ParentStudentLinkSchema.index({ student: 1, status: 1 });
// School-scoped guardian management.
ParentStudentLinkSchema.index({ school: 1, status: 1, createdAt: -1 });

export const PARENT_RELATIONSHIP_TYPES = RELATIONSHIP_TYPES;
export const PARENT_ACCESS_LEVELS = ACCESS_LEVELS;

export default mongoose.models.ParentStudentLink ||
  mongoose.model("ParentStudentLink", ParentStudentLinkSchema);
