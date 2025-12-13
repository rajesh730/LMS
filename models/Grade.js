const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      enum: ["SCHOOL", "HIGH_SCHOOL", "BACHELOR"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number,
      default: 50,
      min: 1,
      max: 200,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],
    teachers: [
      {
        teacher: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["CLASS_TEACHER", "SUBJECT_TEACHER"],
          default: "SUBJECT_TEACHER",
        },
        subjects: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
          },
        ],
      },
    ],
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better performance
gradeSchema.index({ school: 1, name: 1 });
gradeSchema.index({ school: 1, level: 1 });
gradeSchema.index({ school: 1, isActive: 1 });

// Virtual for student count
gradeSchema.virtual("studentCount", {
  ref: "Student",
  localField: "_id",
  foreignField: "grade",
  count: true,
});

// Ensure virtual fields are serialized
gradeSchema.set("toJSON", { virtuals: true });

const Grade = mongoose.models.Grade || mongoose.model("Grade", gradeSchema);

module.exports = Grade;
