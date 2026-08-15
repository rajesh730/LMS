import mongoose from "mongoose";

/**
 * Per-guardian, per-child delivery + read + consent record for a notice (§11).
 *
 * Why this is a separate collection rather than Notice.readBy[]:
 *   - readBy is a single embedded array keyed on a User ref. Parents are not
 *     Users, guardians differ per child, and a notice sent to a whole grade
 *     would grow that array without bound.
 *   - A parent's read state is (parent × student × notice), not (user ×
 *     notice): the mother may have opened Aayush's meeting notice while the
 *     father has not, and the same notice may reach the same parent for two
 *     different children.
 *   - Consent decisions need their own audit fields, and embedding them in the
 *     notice would let a school edit the notice and silently alter the record.
 *
 * CRITICAL RULE (§11): a receipt row existing means DELIVERED, not read.
 * `openedAt` is written ONLY by the notice-detail endpoint, never by the list
 * endpoint. Listing notices must never mark anything read.
 */

const NoticeReceiptSchema = new mongoose.Schema(
  {
    notice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notice",
      required: true,
      index: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      required: true,
      index: true,
    },
    // Which child this delivery is about. The same notice reaching a parent for
    // two children produces two receipts, so "read for Aayush" never silently
    // marks it read for Aarya.
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

    deliveredAt: {
      type: Date,
      default: Date.now,
    },

    // Per-channel delivery attempts (§27, §39, §40).
    //
    // An array because ONE notice legitimately reaches ONE guardian through
    // several paths — in-app, plus an email, plus a printed copy handed over at
    // the gate. Collapsing that to a single field would lose the fact that the
    // school also chased it on paper, which is exactly what the offline
    // follow-up workflow needs to know.
    //
    // Status vocabulary is deliberately honest: nothing here ever claims
    // "delivered" or "read" unless the channel genuinely knows (§40).
    deliveries: [
      {
        channel: {
          type: String,
          enum: ["IN_APP", "EMAIL", "SMS", "OFFLINE", "PAPER"],
          required: true,
        },
        status: {
          type: String,
          enum: ["QUEUED", "SENT", "FAILED", "HANDED_OVER"],
          default: "QUEUED",
        },
        attemptedAt: {
          type: Date,
          default: Date.now,
        },
        // PAPER only: who physically handed it over (§39).
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        note: {
          type: String,
          default: "",
          trim: true,
        },
      },
    ],

    // How the guardian confirmed they understood, when it did not happen in the
    // app — e.g. they told the class teacher at the gate (§39). Kept separate
    // from `acknowledgedAt` so an in-person confirmation is never mistaken for
    // the guardian having tapped the button themselves.
    acknowledgementMethod: {
      type: String,
      enum: ["IN_APP", "IN_PERSON", "PHONE", ""],
      default: "",
    },
    acknowledgementRecordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Set once, on first successful open of the notice DETAIL view.
    openedAt: {
      type: Date,
      default: null,
    },
    // Set when the parent presses "I Understand" on an acknowledgement notice.
    acknowledgedAt: {
      type: Date,
      default: null,
    },

    // --- Consent (permission notices) -------------------------------------
    consentDecision: {
      type: String,
      enum: ["PENDING", "YES", "NO"],
      default: "PENDING",
    },
    consentDecidedAt: {
      type: Date,
      default: null,
    },
    // Snapshot of who decided and in what capacity, kept even if the link is
    // later revoked or the relationship changes — a consent record must remain
    // interpretable after the fact.
    consentGuardianName: {
      type: String,
      default: "",
      trim: true,
    },
    consentRelationship: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// One receipt per (notice, parent, student). Upserted on delivery.
NoticeReceiptSchema.index(
  { notice: 1, parent: 1, student: 1 },
  { unique: true }
);
// The parent notice centre: "my unread notices for this child, newest first".
NoticeReceiptSchema.index({ parent: 1, student: 1, openedAt: 1, createdAt: -1 });
// School side: "who has read / consented to this notice?"
NoticeReceiptSchema.index({ notice: 1, openedAt: 1 });
NoticeReceiptSchema.index({ notice: 1, consentDecision: 1 });
// Offline follow-up: "who on this notice still needs chasing?"
NoticeReceiptSchema.index({ notice: 1, "deliveries.channel": 1 });

export default mongoose.models.NoticeReceipt ||
  mongoose.model("NoticeReceipt", NoticeReceiptSchema);
