import mongoose from "mongoose";

const PlatformChallengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    deadline: {
      type: Date,
      default: null,
    },
    targetGrades: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "CLOSED"],
      default: "DRAFT",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

PlatformChallengeSchema.index({ status: 1, deadline: 1, createdAt: -1 });

export default mongoose.models.PlatformChallenge ||
  mongoose.model("PlatformChallenge", PlatformChallengeSchema);
