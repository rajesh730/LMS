const mongoose = require("mongoose");

// Standardization Helper
const standardizeGradeName = (name) => {
  if (!name) return name;
  
  const lower = name.toLowerCase().trim();
  
  // 1. Handle word numbers
  const wordMap = {
    'one': 1, 'first': 1, 'two': 2, 'second': 2, 'three': 3, 'third': 3,
    'four': 4, 'fourth': 4, 'five': 5, 'fifth': 5, 'six': 6, 'sixth': 6,
    'seven': 7, 'seventh': 7, 'eight': 8, 'eighth': 8, 'nine': 9, 'ninth': 9,
    'ten': 10, 'tenth': 10, 'eleven': 11, 'twelve': 12
  };
  
  // Check for word matches in the string
  for (const [word, num] of Object.entries(wordMap)) {
    // Matches: "one", "grade one", "class one", "first"
    if (lower.includes(word)) {
       return `Grade ${num}`;
    }
  }

  // 2. Extract any number sequence
  const match = name.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return `Grade ${num}`;
  }
  
  return name;
};

const gradeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      set: standardizeGradeName // Apply standardization on set
    },
    level: {
      type: String,
      enum: ["SCHOOL"],
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
