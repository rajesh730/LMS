import mongoose from "mongoose";

const StudentAcademicRecordSchema = new mongoose.Schema(
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
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    grade: {
      type: String,
      required: true,
    },
    section: {
      type: String,
    },
    rollNumber: {
      type: String,
    },
    finalStatus: {
      type: String,
      enum: ["PROMOTED", "DEMOTED", "RETAINED", "GRADUATED", "LEFT"],
      required: true,
    },
    promotedToGrade: {
      type: String, // The grade they were moved to (or null if graduated/left)
    },
    
    // Future-proofing for the "Student Profile" feature
    achievements: [String], // e.g., "1st Place in Science Fair"
    attendancePercentage: Number,
    finalGPA: String,
    remarks: String,
  },
  { timestamps: true }
);

// Index for quick lookups by year and school
StudentAcademicRecordSchema.index({ school: 1, academicYear: 1 });
StudentAcademicRecordSchema.index({ student: 1 });

export default mongoose.models.StudentAcademicRecord ||
  mongoose.model("StudentAcademicRecord", StudentAcademicRecordSchema);
