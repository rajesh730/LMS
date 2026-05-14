import mongoose from "mongoose";

const RoundSubmissionSchema = new mongoose.Schema(
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
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    submissionType: {
      type: String,
      enum: ["VIDEO_LINK", "AUDIO_LINK", "DOCUMENT_LINK", "OTHER_LINK"],
      default: "VIDEO_LINK",
    },
    submissionUrl: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["SUBMITTED", "ACCEPTED", "INVALID_SUBMISSION", "REPLACED"],
      default: "SUBMITTED",
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

RoundSubmissionSchema.index({ round: 1, student: 1 }, { unique: true });

export default mongoose.models.RoundSubmission ||
  mongoose.model("RoundSubmission", RoundSubmissionSchema);
