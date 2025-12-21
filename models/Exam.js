import mongoose from "mongoose";

const ExamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // e.g., "First Term Examination 2024"
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    term: {
      type: String,
      enum: ["FIRST_TERM", "SECOND_TERM", "THIRD_TERM", "FINAL_TERM", "UNIT_TEST"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["UPCOMING", "ONGOING", "COMPLETED", "PUBLISHED"],
      default: "UPCOMING",
    },
    description: {
      type: String,
    },
    // Configuration for report cards
    weightage: {
      type: Number,
      default: 100, // Percentage contribution to final year grade
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

// Prevent duplicate exam names in the same academic year for a school
ExamSchema.index({ school: 1, academicYear: 1, name: 1 }, { unique: true });

export default mongoose.models.Exam || mongoose.model("Exam", ExamSchema);
