import mongoose from "mongoose";

const SchoolWebsiteApiKeySchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    keyHash: { type: String, required: true, unique: true, select: false },
    prefix: { type: String, required: true },
    lastFour: { type: String, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

SchoolWebsiteApiKeySchema.index({ school: 1, revokedAt: 1, createdAt: -1 });

export default mongoose.models.SchoolWebsiteApiKey ||
  mongoose.model("SchoolWebsiteApiKey", SchoolWebsiteApiKeySchema);
