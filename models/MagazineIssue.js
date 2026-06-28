import mongoose from "mongoose";

const MagazineIssueSchema = new mongoose.Schema(
  {
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
    },
    weekStart: {
      type: Date,
      required: true,
      index: true,
    },
    weekEnd: {
      type: Date,
      required: true,
    },
    weekNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 53,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED"],
      default: "PUBLISHED",
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    showOnHome: {
      type: Boolean,
      default: false,
      index: true,
    },
    homeShownAt: {
      type: Date,
      default: null,
    },
    articles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SchoolMagazineArticle",
      },
    ],
  },
  { timestamps: true }
);

MagazineIssueSchema.index({ school: 1, year: -1, month: -1, weekNumber: -1 });
MagazineIssueSchema.index({
  status: 1,
  showOnHome: 1,
  homeShownAt: -1,
  publishedAt: -1,
  weekStart: -1,
  createdAt: -1,
});

export default mongoose.models.MagazineIssue ||
  mongoose.model("MagazineIssue", MagazineIssueSchema);
