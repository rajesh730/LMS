import mongoose from "mongoose";

// One row per school per academic session. The school's *current* session is its
// single ACTIVE row; promotion closes it (filling `summary`) and opens the next.
// The school settings history section lists these rows newest-first.

const academicYearSummarySchema = new mongoose.Schema(
  {
    admitted: { type: Number, default: 0, min: 0 },
    promoted: { type: Number, default: 0, min: 0 },
    retained: { type: Number, default: 0, min: 0 },
    graduated: { type: Number, default: 0, min: 0 },
    transferredIn: { type: Number, default: 0, min: 0 },
    transferredOut: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const AcademicYearSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Display label, e.g. "2025-26" (AD) or "2082/83" (BS).
    year: {
      type: String,
      required: true,
      trim: true,
    },
    // Canonical AD start year — the cross-calendar sort key.
    yearStart: {
      type: Number,
      required: true,
    },
    calendar: {
      type: String,
      enum: ["AD", "BS"],
      default: "AD",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "CLOSED"],
      default: "ACTIVE",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    summary: {
      type: academicYearSummarySchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

// A school may have only one row per session, and only one ACTIVE session.
AcademicYearSchema.index({ school: 1, yearStart: 1 }, { unique: true });
AcademicYearSchema.index(
  { school: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "ACTIVE" } }
);
AcademicYearSchema.index({ school: 1, yearStart: -1 });

export default mongoose.models.AcademicYear ||
  mongoose.model("AcademicYear", AcademicYearSchema);
