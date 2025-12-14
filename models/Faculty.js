import mongoose from 'mongoose';

/**
 * Faculty Schema - School-Specific Faculty/Stream Management
 * 
 * Purpose: Master faculty list per school
 * - Each school defines its own faculties (Science, Commerce, etc.)
 * - Used across entire system for consistency
 * - Single source of truth for faculty names
 * - Corrections cascade to all related records
 * 
 * Example:
 * {
 *   name: "Science",
 *   school: schoolId,
 *   educationLevels: ["HigherSecondary", "Bachelor"],
 *   status: "ACTIVE"
 * }
 */
const FacultySchema = new mongoose.Schema(
  {
    // Faculty Name (unique per school)
    name: {
      type: String,
      required: [true, 'Faculty name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    // Normalized name (lowercase, no extra spaces) for case-insensitive matching
    normalizedName: {
      type: String,
      lowercase: true,
      trim: true,
      // Used for finding duplicates with different casings
    },

    // School Reference (each school has its own faculties)
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'School reference is required'],
      // Faculty belongs to specific school
    },

    // Which education levels this faculty applies to
    educationLevels: {
      type: [String],
      enum: ['School', 'HigherSecondary', 'Bachelor'],
      default: [],
      // e.g., ["HigherSecondary", "Bachelor"] for Science
      // Empty = applies to all levels
    },

    // Status Management (Soft Delete)
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      // Can deactivate without deleting (preserves historical data)
    },

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // Who created this faculty (SUPER_ADMIN or SCHOOL_ADMIN)
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // Who last updated this faculty
    },

    // Merge Reference (if this faculty was merged into another)
    mergedInto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      default: null,
      // If this faculty was corrected/merged, point to the new one
    },
  },
  { timestamps: true }
);

// Unique constraint: Faculty name is unique per school (case-insensitive)
FacultySchema.index(
  { normalizedName: 1, school: 1 },
  { unique: true, sparse: true }
);

// Index for queries by school
FacultySchema.index({ school: 1, status: 1 });

// Index for queries by education level
FacultySchema.index({ educationLevels: 1, school: 1, status: 1 });

// Middleware: Auto-generate normalized name before save
FacultySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.normalizedName = this.name.toLowerCase().trim().replace(/\s+/g, ' ');
  }
  next();
});

export default mongoose.models.Faculty || mongoose.model('Faculty', FacultySchema);
