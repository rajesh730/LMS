import mongoose from "mongoose";

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

const AchievementSchema = new mongoose.Schema(
  {
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
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TalentSubmission",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Please provide an achievement title"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    level: {
      type: String,
      enum: ["SCHOOL", "INTER_SCHOOL", "PLATFORM"],
      default: "SCHOOL",
    },
    placement: {
      type: String,
      enum: [
        "PARTICIPANT",
        "MERIT",
        "THIRD_PLACE",
        "RUNNER_UP",
        "WINNER",
        "SPECIAL_MENTION",
      ],
      default: "PARTICIPANT",
    },
    certificateUrl: {
      type: String,
      default: "",
      trim: true,
    },
    certificateCode: {
      type: String,
      default: "",
      trim: true,
    },
    certificateIssuedAt: {
      type: Date,
      default: null,
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
    isPublic: {
      type: Boolean,
      default: true,
    },
    awardedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

AchievementSchema.index({ school: 1, awardedAt: -1 });
AchievementSchema.index(
  { certificateCode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      certificateCode: { $type: "string", $gt: "" },
    },
  }
);

export default mongoose.models.Achievement ||
  mongoose.model("Achievement", AchievementSchema);
