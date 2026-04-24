import mongoose from "mongoose";

const mediaItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "LINK"],
      default: "LINK",
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    url: {
      type: String,
      default: "",
      trim: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const TalentProfileSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    headline: {
      type: String,
      default: "",
      trim: true,
      maxlength: 140,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    clubs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Club",
      },
    ],
    skillLevel: {
      type: String,
      enum: ["BEGINNER", "EMERGING", "INTERMEDIATE", "ADVANCED", "EXPERT"],
      default: "BEGINNER",
    },
    visibility: {
      type: String,
      enum: ["PRIVATE", "SCHOOL_ONLY", "PUBLIC"],
      default: "SCHOOL_ONLY",
    },
    isPubliclyFeatured: {
      type: Boolean,
      default: false,
    },
    stats: {
      eventsParticipated: {
        type: Number,
        default: 0,
      },
      submissionsCount: {
        type: Number,
        default: 0,
      },
      awardsCount: {
        type: Number,
        default: 0,
      },
    },
    media: {
      type: [mediaItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

TalentProfileSchema.index({ school: 1, visibility: 1 });

export default mongoose.models.TalentProfile ||
  mongoose.model("TalentProfile", TalentProfileSchema);
