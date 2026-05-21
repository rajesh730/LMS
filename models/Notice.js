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
      enum: ["GENERAL", "URGENT", "EVENT", "HOLIDAY", "SHOWCASE"],
      default: "GENERAL",
    },
    scope: {
      type: String,
      enum: ["SCHOOL", "PLATFORM"],
      default: "SCHOOL",
    },
    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL",
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED"],
      default: "PUBLISHED",
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    visibility: {
      type: String,
      enum: ["PRIVATE", "PUBLIC"],
      default: "PRIVATE",
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
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        userType: {
          type: String,
          enum: ["STUDENT", "TEACHER", "PARENT", "SCHOOL_ADMIN"],
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

noticeSchema.pre("validate", function () {
  if (this.type === "CLUB") {
    this.type = "GENERAL";
  }

  if (this.scope === "PLATFORM") {
    this.school = null;
  }

  if (this.visibility === "PUBLIC") {
    this.isActive = true;
  }

  if (this.status === "DRAFT") {
    this.publishedAt = null;
  } else if (!this.publishedAt) {
    this.publishedAt = new Date();
  }
});

// Index for better performance
noticeSchema.index({ school: 1, publishedAt: -1 });
noticeSchema.index({ school: 1, type: 1, isActive: 1 });
noticeSchema.index({ scope: 1, visibility: 1, publishedAt: -1 });
noticeSchema.index({ event: 1, publishedAt: -1 });
noticeSchema.index({ school: 1, "targetAudience.students": 1, isActive: 1 });
noticeSchema.index({ school: 1, "targetAudience.teachers": 1, isActive: 1 });
noticeSchema.index({ school: 1, "targetAudience.parents": 1, isActive: 1 });
noticeSchema.index({ expiryDate: 1, isActive: 1 });
noticeSchema.index({ scope: 1, isActive: 1, isDeleted: 1, publishedAt: -1 });
noticeSchema.index({
  school: 1,
  scope: 1,
  isActive: 1,
  isDeleted: 1,
  publishedAt: -1,
});
noticeSchema.index({
  school: 1,
  status: 1,
  isActive: 1,
  isDeleted: 1,
  publishedAt: -1,
});
noticeSchema.index({
  school: 1,
  "targetAudience.students": 1,
  isActive: 1,
  isDeleted: 1,
  publishedAt: -1,
});
noticeSchema.index({
  event: 1,
  isActive: 1,
  isDeleted: 1,
  publishedAt: -1,
});

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
