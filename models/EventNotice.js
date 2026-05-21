import mongoose from "mongoose";

const EventNoticeSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    round: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventRound",
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxLength: 3000,
    },
    type: {
      type: String,
      enum: [
        "GENERAL",
        "REGISTRATION",
        "ROUND_INSTRUCTIONS",
        "SCHEDULE_UPDATE",
        "SHORTLIST",
        "POSTPONEMENT",
        "CANCELLATION",
        "FINAL_RESULT",
      ],
      default: "GENERAL",
    },
    targetAudience: {
      type: String,
      enum: [
        "REGISTERED_SCHOOLS",
        "SHORTLISTED_SCHOOLS",
        "FINALIST_SCHOOLS",
        "ALL_SCHOOLS",
        "PUBLIC",
      ],
      default: "REGISTERED_SCHOOLS",
    },
    visibility: {
      type: String,
      enum: ["PRIVATE", "PUBLIC"],
      default: "PRIVATE",
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "UNPUBLISHED"],
      default: "DRAFT",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        userType: {
          type: String,
          enum: ["SCHOOL_ADMIN", "SUPER_ADMIN", "TEACHER"],
          default: "SCHOOL_ADMIN",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

EventNoticeSchema.pre("validate", function () {
  if (this.visibility === "PUBLIC") {
    this.targetAudience = "PUBLIC";
  }
  if (this.status === "PUBLISHED" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

EventNoticeSchema.index({ event: 1, round: 1, createdAt: -1 });
EventNoticeSchema.index({ event: 1, status: 1, visibility: 1, publishedAt: -1 });
EventNoticeSchema.index({ event: 1, round: 1, isDeleted: 1, createdAt: -1 });
EventNoticeSchema.index({
  event: 1,
  status: 1,
  visibility: 1,
  isDeleted: 1,
  publishedAt: -1,
});
EventNoticeSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

export default mongoose.models.EventNotice ||
  mongoose.model("EventNotice", EventNoticeSchema);
