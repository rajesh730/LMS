import mongoose from "mongoose";

const SchoolMagazineArticleSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    authorStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12000,
    },
    category: {
      type: String,
      enum: ["ESSAY", "POEM", "REPORT", "OPINION", "STORY", "OTHER"],
      default: "ESSAY",
    },
    submissionSource: {
      type: String,
      enum: ["FREE_WRITE", "PLATFORM_CHALLENGE"],
      default: "FREE_WRITE",
      index: true,
    },
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformChallenge",
      default: null,
      index: true,
    },
    challengeTitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: 180,
    },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
      default: "DRAFT",
      index: true,
    },
    reviewNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    publicationScope: {
      type: String,
      enum: ["SCHOOL_ONLY", "REGISTERED_SCHOOLS"],
      default: "SCHOOL_ONLY",
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

SchoolMagazineArticleSchema.index({ school: 1, status: 1, updatedAt: -1 });
SchoolMagazineArticleSchema.index({
  authorStudent: 1,
  updatedAt: -1,
});
SchoolMagazineArticleSchema.index({
  authorStudent: 1,
  challenge: 1,
});

export default mongoose.models.SchoolMagazineArticle ||
  mongoose.model("SchoolMagazineArticle", SchoolMagazineArticleSchema);
