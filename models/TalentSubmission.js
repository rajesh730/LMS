import mongoose from "mongoose";

const submissionAssetSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "LINK"],
      default: "LINK",
    },
    label: {
      type: String,
      default: "",
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const scorecardEntrySchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    maxScore: {
      type: Number,
      default: 10,
      min: 1,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    comment: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const TalentSubmissionSchema = new mongoose.Schema(
  {
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
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    talentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TalentProfile",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Please provide a submission title"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    submissionType: {
      type: String,
      enum: ["SOLO", "TEAM", "SCHOOL_SHOWCASE"],
      default: "SOLO",
    },
    assets: {
      type: [submissionAssetSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "SHORTLISTED", "REJECTED", "PUBLISHED"],
      default: "SUBMITTED",
    },
    reviewNotes: {
      type: String,
      default: "",
      trim: true,
    },
    reviewedByName: {
      type: String,
      default: "",
      trim: true,
    },
    reviewedByRole: {
      type: String,
      enum: ["SCHOOL_ADMIN", "TEACHER", ""],
      default: "",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    resultPlacement: {
      type: String,
      enum: [
        "",
        "PARTICIPANT",
        "MERIT",
        "THIRD_PLACE",
        "RUNNER_UP",
        "WINNER",
        "SPECIAL_MENTION",
      ],
      default: "",
    },
    resultNote: {
      type: String,
      default: "",
      trim: true,
    },
    scorecard: {
      type: [scorecardEntrySchema],
      default: [],
    },
    totalScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    scorePercentage: {
      type: Number,
      default: 0,
      min: 0,
    },
    scorecardReviewedAt: {
      type: Date,
      default: null,
    },
    resultPublishedAt: {
      type: Date,
      default: null,
    },
    certificateUrl: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

TalentSubmissionSchema.index({ event: 1, school: 1, student: 1 });

export default mongoose.models.TalentSubmission ||
  mongoose.model("TalentSubmission", TalentSubmissionSchema);
