import mongoose from "mongoose";

const ParticipationRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN", "ENROLLED"],
      default: "PENDING",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectableUntil: {
      type: Date,
      default: null,
    },
    enrollmentConfirmedAt: {
      type: Date,
      default: null,
    },
    studentNotifiedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    // Force enrollment override tracking
    forceEnrolled: {
      type: Boolean,
      default: false,
    },
    // Track validation errors if force enrolled
    validationErrors: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

// Ensure unique request per student per event per school
ParticipationRequestSchema.index(
  { student: 1, event: 1, school: 1 },
  { unique: true }
);

export default mongoose.models.ParticipationRequest ||
  mongoose.model("ParticipationRequest", ParticipationRequestSchema);
