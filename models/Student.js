import mongoose from "mongoose";

/**
 * Student Schema
 * Represents a student as a persistent person across their whole journey.
 *
 * Identity is student-scoped, not school-scoped: the SAME document is reused when
 * a student transfers schools, so all achievements/writings/results stay linked.
 * Top-level `school` / `grade` / `rollNumber` are the CURRENT enrollment; the
 * `enrollments[]` array is the full school + grade + academic-year history.
 * See docs/ACADEMIC_YEAR_AND_PORTFOLIO.md.
 *
 * Status Management:
 * - ACTIVE: Currently enrolled and attending classes
 * - SUSPENDED: Temporarily inactive (disciplinary action)
 * - INACTIVE: No longer enrolled (transferred out, dropped out)
 * - ALUMNI / GRADUATED: passed out of the school's highest grade
 *
 * Soft Delete: Uses status instead of hard delete to preserve data
 */

// One entry per school + grade + academic session a student has been part of.
const studentEnrollmentSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    schoolNameSnapshot: {
      type: String,
      default: "",
      trim: true,
    },
    grade: {
      type: String,
      default: "",
      trim: true,
    },
    rollNumber: {
      type: String,
      default: "",
      trim: true,
    },
    academicYear: {
      type: String,
      default: "",
      trim: true,
    },
    // Canonical AD start year — cross-calendar sort key.
    academicYearStart: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["CURRENT", "PROMOTED", "RETAINED", "TRANSFERRED", "GRADUATED"],
      default: "CURRENT",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);
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
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    platformStudentId: {
      type: String,
      trim: true,
    },
    
    // Login Credentials (Auto-generated)
    username: {
      type: String,
      required: [true, "Please provide username"],
      trim: true,
      lowercase: true,
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
      set: function(name) {
        if (!name) return name;
        const lower = name.toLowerCase().trim();
        
        // Word map
        const wordMap = {
            'one': 1, 'first': 1, 'two': 2, 'second': 2, 'three': 3, 'third': 3,
            'four': 4, 'fourth': 4, 'five': 5, 'fifth': 5, 'six': 6, 'sixth': 6,
            'seven': 7, 'seventh': 7, 'eight': 8, 'eighth': 8, 'nine': 9, 'ninth': 9,
            'ten': 10, 'tenth': 10, 'eleven': 11, 'twelve': 12
        };
        
        for (const [word, num] of Object.entries(wordMap)) {
            if (lower.includes(word)) return `Grade ${num}`;
        }

        const match = name.match(/\d+/);
        if (match) return `Grade ${parseInt(match[0], 10)}`;
        
        return name;
      }
    },
    rollNumber: {
      type: String,
      required: [true, "Please provide a roll number"],
      trim: true,
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
      trim: true,
      lowercase: true,
    },
    parentAlternativeContact: {
      type: String,
      sparse: true,
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
      enum: ["ACTIVE", "SUSPENDED", "INACTIVE", "ALUMNI", "GRADUATED"],
      default: "ACTIVE",
    },

    // Full school + grade + academic-year history. The CURRENT enrollment mirrors
    // the top-level school/grade/rollNumber.
    enrollments: {
      type: [studentEnrollmentSchema],
      default: [],
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
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
StudentSchema.index({ platformStudentId: 1 }, { unique: true, sparse: true });
StudentSchema.index({ school: 1, isDeleted: 1, status: 1 });
StudentSchema.index({ school: 1, isDeleted: 1, status: 1, createdAt: -1 });
StudentSchema.index({
  school: 1,
  isDeleted: 1,
  status: 1,
  grade: 1,
  createdAt: -1,
});
StudentSchema.index({ school: 1, isDeleted: 1, username: 1 });
StudentSchema.index({ school: 1, isDeleted: 1, platformStudentId: 1 });
StudentSchema.index({ school: 1, isDeleted: 1, rollNumber: 1 });

// Roll number is unique within a grade + school, but ONLY among students who are
// currently on the active roster. Graduated, transferred-out, or inactive
// students release their roll number so the next promoted batch can reuse it
// (e.g. last year's Grade 10 roll 1 graduates, this year a Grade 9 promotes into
// Grade 10 roll 1). See docs/ACADEMIC_YEAR_AND_PORTFOLIO.md.
StudentSchema.index(
  { school: 1, grade: 1, rollNumber: 1 },
  { unique: true, partialFilterExpression: { status: "ACTIVE" } }
);

// Find every student who has ever been enrolled at a school (e.g. an origin
// school's "transferred out / past students" view).
StudentSchema.index({ "enrollments.school": 1, "enrollments.academicYearStart": -1 });

export default mongoose.models.Student ||
  mongoose.model("Student", StudentSchema);
