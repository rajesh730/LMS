import mongoose from "mongoose";

const EventRoundSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    roundNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    roundType: {
      type: String,
      enum: ["REGULAR", "FINAL"],
      default: "REGULAR",
      index: true,
    },
    isFinal: {
      type: Boolean,
      default: false,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    mode: {
      type: String,
      enum: ["ONLINE_SUBMISSION", "OFFLINE_VENUE", "LIVE_ONLINE"],
      default: "ONLINE_SUBMISSION",
    },
    date: {
      type: Date,
      default: null,
    },
    startTime: {
      type: String,
      default: "",
      trim: true,
    },
    endTime: {
      type: String,
      default: "",
      trim: true,
    },
    venue: {
      type: String,
      default: "",
      trim: true,
    },
    meetingLink: {
      type: String,
      default: "",
      trim: true,
    },
    submissionDeadline: {
      type: Date,
      default: null,
    },
    instructions: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "SCHEDULED",
        "OPEN_FOR_SUBMISSION",
        "IN_PROGRESS",
        "JUDGING",
        "SHORTLIST_PUBLISHED",
        "COMPLETED",
        "POSTPONED",
        "CANCELLED",
      ],
      default: "DRAFT",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

EventRoundSchema.pre("validate", function () {
  this.roundType = this.roundType === "FINAL" ? "FINAL" : "REGULAR";
  this.isFinal = this.roundType === "FINAL";
});

EventRoundSchema.index({ event: 1, roundNumber: 1 }, { unique: true });

export default mongoose.models.EventRound ||
  mongoose.model("EventRound", EventRoundSchema);
