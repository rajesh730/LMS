import mongoose from "mongoose";

const ClubSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Please provide a club name"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Please provide a club slug"],
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    clubType: {
      type: String,
      enum: [
        "PERFORMING_ARTS",
        "VISUAL_ARTS",
        "STEM",
        "LANGUAGE",
        "LEADERSHIP",
        "SERVICE",
        "SPORTS",
        "GENERAL",
      ],
      default: "GENERAL",
    },
    coordinators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
      },
    ],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
    visibility: {
      type: String,
      enum: ["PRIVATE", "SCHOOL_ONLY", "PUBLIC"],
      default: "SCHOOL_ONLY",
    },
    isPubliclyListed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
    },
    foundedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

ClubSchema.index({ school: 1, slug: 1 }, { unique: true });

export default mongoose.models.Club || mongoose.model("Club", ClubSchema);
