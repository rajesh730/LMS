import mongoose from "mongoose";

const CommunicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["ABSENT_NOTE", "FEEDBACK", "COMPLAINT", "OTHER"],
      required: true,
    },
    subject: {
      type: String,
      required: [true, "Please provide a subject"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Please provide a message"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACKNOWLEDGED", "RESOLVED"],
      default: "PENDING",
    },
    // Optional: If the school replies
    adminReply: {
      type: String,
    },
    repliedAt: {
      type: Date,
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // For absent notes
    absentDate: {
      type: Date,
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Communication ||
  mongoose.model("Communication", CommunicationSchema);
