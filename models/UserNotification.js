import mongoose from "mongoose";

const UserNotificationSchema = new mongoose.Schema(
  {
    targetRole: {
      type: String,
      enum: ["STUDENT", "SCHOOL_ADMIN", "PARENT"],
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
    // PARENT notifications only. `recipientStudent` is still set on these — it
    // is the child the notification is ABOUT, which is what lets the parent app
    // label every row "Aayush • Green Village" and filter by selected child
    // without ever mixing school context (§36).
    recipientParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
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
      enum: [
        "MAGAZINE",
        "ACHIEVEMENT",
        "TRANSFER",
        // Parent-facing categories (§17).
        "NOTICE",
        "CONSENT",
        "EVENT",
        "MESSAGE",
        "WRITING",
        "GENERAL",
      ],
      default: "MAGAZINE",
      index: true,
    },
    // Drives the parent notification's colour + icon + sort weight (§17).
    // URGENT → 🔴, ACTION → 🟡, POSITIVE → 🟢, INFO → 🔵.
    // Existing rows have no value; treat a missing priority as INFO.
    priority: {
      type: String,
      enum: ["URGENT", "ACTION", "POSITIVE", "INFO"],
      default: "INFO",
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
          enum: ["STUDENT", "SCHOOL_ADMIN", "PARENT"],
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
// Parent inbox, optionally narrowed to the selected child.
UserNotificationSchema.index({
  recipientParent: 1,
  isDeleted: 1,
  publishedAt: -1,
});
UserNotificationSchema.index({
  recipientParent: 1,
  recipientStudent: 1,
  isDeleted: 1,
  publishedAt: -1,
});

export default mongoose.models.UserNotification ||
  mongoose.model("UserNotification", UserNotificationSchema);
