import mongoose from "mongoose";

const AcademicYearSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name (e.g., 2081, 2024-2025)"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Changed to false to allow Global Academic Years
    },
    status: {
      type: String,
      enum: ["UPCOMING", "ACTIVE", "COMPLETED", "ARCHIVED"],
      default: "UPCOMING",
    },
    isPublished: {
      type: Boolean,
      default: false, // Draft by default
    }
  },
  { timestamps: true }
);

// Ensure a school can only have one "ACTIVE" year at a time
// Note: This validation is best handled in the application logic to avoid race conditions, 
// but a unique compound index can help if we strictly enforce one active year.
// For now, we'll handle the toggle logic in the API.

export default mongoose.models.AcademicYear || mongoose.model("AcademicYear", AcademicYearSchema);
