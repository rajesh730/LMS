const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    schoolName: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved"],
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    replies: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        authorName: String,
        authorRole: String, // "SCHOOL_ADMIN" or "SUPER_ADMIN"
        message: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    internalNotes: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        authorName: String,
        note: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
supportTicketSchema.index({ school: 1, status: 1 });
supportTicketSchema.index({ school: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

supportTicketSchema.set("toJSON", { virtuals: true });

const SupportTicket =
  mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", supportTicketSchema);

module.exports = SupportTicket;
