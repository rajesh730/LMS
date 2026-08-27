import mongoose from "mongoose";

const MediaAssetSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    ownerStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
      index: true,
    },
    writing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolMagazineArticle",
      default: null,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["SCHOOL_LOGO", "SCHOOL_COVER", "WRITING_IMAGE"],
      required: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: ["PRIVATE", "PUBLIC"],
      default: "PRIVATE",
      index: true,
    },
    storageKey: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    originalName: { type: String, default: "", maxlength: 255 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: {
      type: String,
      enum: ["READY", "DELETED"],
      default: "READY",
      index: true,
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MediaAssetSchema.index({ ownerStudent: 1, purpose: 1, createdAt: -1 });

export default mongoose.models.MediaAsset ||
  mongoose.model("MediaAsset", MediaAssetSchema);
