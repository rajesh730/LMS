const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxLength: 2000,
    },
    type: {
      type: String,
      enum: ["GENERAL", "URGENT", "ACADEMIC", "EVENT", "HOLIDAY", "EXAM"],
      default: "GENERAL",
    },
    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL",
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetAudience: {
      students: {
        type: Boolean,
        default: false,
      },
      teachers: {
        type: Boolean,
        default: false,
      },
      parents: {
        type: Boolean,
        default: false,
      },
    },
    grades: [
      {
        type: String,
        trim: true,
      },
    ], // Specific grades (empty means all grades)
    expiryDate: {
      type: Date,
      default: null,
    },
    attachments: [
      {
        name: String,
        url: String,
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        userType: {
          type: String,
          enum: ["STUDENT", "TEACHER", "PARENT"],
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
    },
  },
  {
    timestamps: true,
  }
);

// Index for better performance
noticeSchema.index({ school: 1, publishedAt: -1 });
noticeSchema.index({ school: 1, type: 1, isActive: 1 });
noticeSchema.index({ school: 1, "targetAudience.students": 1, isActive: 1 });
noticeSchema.index({ school: 1, "targetAudience.teachers": 1, isActive: 1 });
noticeSchema.index({ school: 1, "targetAudience.parents": 1, isActive: 1 });
noticeSchema.index({ expiryDate: 1, isActive: 1 });

// Virtual for read count
noticeSchema.virtual("readCount", {
  ref: "Notice",
  localField: "_id",
  foreignField: "readBy",
  count: true,
});

// Check if notice is expired
noticeSchema.virtual("isExpired").get(function () {
  return this.expiryDate && new Date() > this.expiryDate;
});

// Ensure virtual fields are serialized
noticeSchema.set("toJSON", { virtuals: true });

const Notice = mongoose.models.Notice || mongoose.model("Notice", noticeSchema);

module.exports = Notice;
