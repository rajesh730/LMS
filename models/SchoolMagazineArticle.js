import mongoose from "mongoose";
import { ALL_WRITING_CATEGORIES } from "@/lib/writingCategories";

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
      enum: ALL_WRITING_CATEGORIES,
      default: "BLOG_ARTICLE",
    },
    submissionSource: {
      type: String,
      enum: ["FREE_WRITE"],
      default: "FREE_WRITE",
      index: true,
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
    firstSubmittedAt: {
      type: Date,
      default: null,
    },
    lastResubmittedAt: {
      type: Date,
      default: null,
    },
    revisionCount: {
      type: Number,
      default: 0,
      min: 0,
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
    isMagazinePublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    magazineIssue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MagazineIssue",
      default: null,
      index: true,
    },
    magazineIssueAssignedAt: {
      type: Date,
      default: null,
    },
    magazinePublishedAt: {
      type: Date,
      default: null,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    showOnSchoolWall: {
      type: Boolean,
      default: true,
      index: true,
    },
    isGlobalWallPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
  },
  { timestamps: true }
);

SchoolMagazineArticleSchema.index({
  school: 1,
  status: 1,
  isDeleted: 1,
  updatedAt: -1,
});
SchoolMagazineArticleSchema.index({
  authorStudent: 1,
  updatedAt: -1,
});
SchoolMagazineArticleSchema.index({
  school: 1,
  isDeleted: 1,
  status: 1,
  submittedAt: -1,
  updatedAt: -1,
});
SchoolMagazineArticleSchema.index({
  school: 1,
  isDeleted: 1,
  showOnSchoolWall: 1,
  updatedAt: -1,
});
SchoolMagazineArticleSchema.index({
  isDeleted: 1,
  isGlobalWallPublished: 1,
  updatedAt: -1,
});
SchoolMagazineArticleSchema.index({
  school: 1,
  isDeleted: 1,
  isPublished: 1,
  publishedAt: -1,
});
SchoolMagazineArticleSchema.index({
  challenge: 1,
  isDeleted: 1,
  status: 1,
  createdAt: -1,
});

export default mongoose.models.SchoolMagazineArticle ||
  mongoose.model("SchoolMagazineArticle", SchoolMagazineArticleSchema);
