import mongoose from "mongoose";

const SchoolShowcaseProfileSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    tagline: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },
    summary: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },
    coverImageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    websiteUrl: {
      type: String,
      default: "",
      trim: true,
    },
    visibility: {
      type: String,
      enum: ["PRIVATE", "PUBLIC"],
      default: "PUBLIC",
    },
    highlightMetrics: {
      eventsHosted: {
        type: Number,
        default: 0,
      },
      eventsParticipated: {
        type: Number,
        default: 0,
      },
      awardsCount: {
        type: Number,
        default: 0,
      },
      studentParticipationRate: {
        type: Number,
        default: 0,
      },
    },
    featuredEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    publicHighlights: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.SchoolShowcaseProfile ||
  mongoose.model("SchoolShowcaseProfile", SchoolShowcaseProfileSchema);
