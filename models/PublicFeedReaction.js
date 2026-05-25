import mongoose from "mongoose";

const PublicFeedReactionSchema = new mongoose.Schema(
  {
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformChallengeSubmission",
      required: true,
      index: true,
    },
    actorKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

PublicFeedReactionSchema.index({ submission: 1, actorKey: 1 }, { unique: true });
PublicFeedReactionSchema.index({ submission: 1, createdAt: -1 });

export default mongoose.models.PublicFeedReaction ||
  mongoose.model("PublicFeedReaction", PublicFeedReactionSchema);

