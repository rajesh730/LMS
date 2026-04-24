import mongoose from "mongoose";

const EventSchoolInvitationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "DISAPPROVED", "WITHDRAWN"],
      default: "PENDING",
    },
    notifiedAt: {
      type: Date,
      default: Date.now,
    },
    readAt: {
      type: Date,
      default: null,
    },
    decisionAt: {
      type: Date,
      default: null,
    },
    decisionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    targetGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    eventTitleSnapshot: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

EventSchoolInvitationSchema.index({ event: 1, school: 1 }, { unique: true });
EventSchoolInvitationSchema.index({ school: 1, status: 1, notifiedAt: -1 });
EventSchoolInvitationSchema.index({ event: 1, status: 1 });

export default mongoose.models.EventSchoolInvitation ||
  mongoose.model("EventSchoolInvitation", EventSchoolInvitationSchema);
