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
    // Basic Student Information
    firstName: {
      type: String,
      required: [true, "Please provide first name"],
    },
    middleName: {
      type: String,
    },
    lastName: {
      type: String,
      required: [true, "Please provide last name"],
    },
    name: {
      type: String,
      required: [true, "Please provide a name"],
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    
    // Login Credentials (Auto-generated)
    username: {
      type: String,
      required: [true, "Please provide username"],
      sparse: true, // Allow nulls for existing records
    },
    password: {
      type: String, // Hashed password
      required: [true, "Please provide password"],
    },
    
    // Student Details
    dateOfBirth: {
      type: Date,
      required: false,
    },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
      required: false,
    },
    phone: {
      type: String,
      sparse: true,
    },
    grade: {
      type: String,
      required: [true, "Please provide a grade"],
    },
    rollNumber: {
      type: String,
      required: [true, "Please provide a roll number"],
    },
    address: {
      type: String,
      sparse: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
      default: "",
    },
    
    // Parent/Guardian Information
    guardianRelationship: {
      type: String,
      enum: ["FATHER", "MOTHER", "GUARDIAN", "UNCLE", "AUNT", "SIBLING"],
      required: false,
    },
    parentName: {
      type: String,
      required: false,
    },
    parentContactNumber: {
      type: String,
      required: false,
    },
    parentEmail: {
      type: String,
      required: false,
    },
    parentAlternativeContact: {
      type: String,
      sparse: true,
    },
    
    // Legacy field - kept for backward compatibility
    visiblePassword: {
      type: String, // Stored for admin visibility as requested
    },
    
    // School Reference
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

// Create compound unique index for username per school
StudentSchema.index({ username: 1, school: 1 }, { unique: true, sparse: true });

// Compound index: Roll Number must be unique within a specific Grade in a specific School
StudentSchema.index({ school: 1, grade: 1, rollNumber: 1 }, { unique: true });

export default mongoose.models.Student ||
  mongoose.model("Student", StudentSchema);
