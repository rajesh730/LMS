import mongoose from "mongoose";

const PlatformChallengeSubmissionSchema = new mongoose.Schema(
  {
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformChallenge",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    status: {
      type: String,
      enum: ["SUBMITTED", "SELECTED", "REJECTED"],
      default: "SUBMITTED",
      index: true,
    },
    reviewNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    addedToSchoolMagazine: {
      type: Boolean,
      default: false,
    },
    schoolMagazineArticle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolMagazineArticle",
      default: null,
    },
  },
  { timestamps: true }
);

PlatformChallengeSubmissionSchema.index({
  challenge: 1,
  student: 1,
});
PlatformChallengeSubmissionSchema.index({
  isPublic: 1,
  publishedAt: -1,
});

export default mongoose.models.PlatformChallengeSubmission ||
  mongoose.model(
    "PlatformChallengeSubmission",
    PlatformChallengeSubmissionSchema
  );
