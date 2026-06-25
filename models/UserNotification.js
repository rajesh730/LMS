import mongoose from "mongoose";

const UserNotificationSchema = new mongoose.Schema(
  {
    targetRole: {
      type: String,
      enum: ["STUDENT", "SCHOOL_ADMIN"],
      required: true,
      index: true,
    },
    recipientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    recipientStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
      index: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["MAGAZINE", "ACHIEVEMENT", "TRANSFER"],
      default: "MAGAZINE",
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    href: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        userType: {
          type: String,
          enum: ["STUDENT", "SCHOOL_ADMIN"],
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

UserNotificationSchema.index({
  targetRole: 1,
  school: 1,
  isDeleted: 1,
  publishedAt: -1,
});
UserNotificationSchema.index({
  targetRole: 1,
  recipientStudent: 1,
  isDeleted: 1,
  publishedAt: -1,
});

export default mongoose.models.UserNotification ||
  mongoose.model("UserNotification", UserNotificationSchema);
