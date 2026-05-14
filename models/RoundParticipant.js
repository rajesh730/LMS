import mongoose from "mongoose";

export const ROUND_PARTICIPANT_STATUSES = [
  "PARTICIPATED",
  "SELECTED",
  "DISQUALIFIED",
  "NOT_ATTEMPTED",
  "WINNER",
  "RUNNER_UP",
  "FINALIST",
];

const RoundParticipantSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    round: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventRound",
      required: true,
      index: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teamName: {
      type: String,
      default: "",
      trim: true,
    },
    captainStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    roundNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ROUND_PARTICIPANT_STATUSES,
      default: "PARTICIPATED",
    },
    shortlisted: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sourceRound: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventRound",
      default: null,
    },
    sourceRoundNumber: {
      type: Number,
      default: null,
      min: 1,
    },
    advancedToRound: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventRound",
      default: null,
    },
    advancedToRoundNumber: {
      type: Number,
      default: null,
      min: 1,
    },
    advancedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

RoundParticipantSchema.pre("validate", function () {
  this.shortlisted = ["SELECTED"].includes(this.status);
});

RoundParticipantSchema.index({ round: 1, student: 1 }, { unique: true });
RoundParticipantSchema.index({ event: 1, roundNumber: 1, school: 1 });

export default mongoose.models.RoundParticipant ||
  mongoose.model("RoundParticipant", RoundParticipantSchema);
