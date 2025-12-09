import mongoose from "mongoose";

/**
 * Student Schema
 * Represents a student enrolled in a school
 *
 * Status Management:
 * - ACTIVE: Currently enrolled and attending classes
 * - SUSPENDED: Temporarily inactive (disciplinary action)
 * - INACTIVE: No longer enrolled (transferred, dropped out)
 *
 * Soft Delete: Uses status instead of hard delete to preserve data
 */
const StudentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
    },
    grade: {
      type: String,
      required: [true, "Please provide a grade"],
    },
    parentEmail: {
      type: String,
      required: [true, "Please provide a parent email"],
    },
    rollNumber: {
      type: String,
      required: [true, "Please provide a roll number"],
    },
    visiblePassword: {
      type: String, // Stored for admin visibility as requested
    },
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Student status management
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "INACTIVE"],
      default: "ACTIVE",
    },
    // Track when status was changed and by whom
    statusChangedAt: {
      type: Date,
    },
    statusChangedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Reason for suspension/inactive status
    statusReason: {
      type: String,
    },
    // For soft delete - marked as deleted but not removed
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Student ||
  mongoose.model("Student", StudentSchema);
