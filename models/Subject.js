import mongoose from 'mongoose';

/**
 * Subject Schema - Unified Global and School-Specific Subjects
 * 
 * Design:
 * - Global subjects: subjectType = "GLOBAL", school = null
 * - School custom subjects: subjectType = "SCHOOL_CUSTOM", school = schoolId
 * 
 * Subject creation is separate from usage. Subjects are activated for grades
 * through the GradeSubject model.
 */
const SubjectSchema = new mongoose.Schema(
    {
        // Basic Information
        name: {
            type: String,
            required: [true, 'Please provide a subject name'],
            trim: true,
        },
        code: {
            type: String,
            required: [true, 'Please provide a subject code'],
            uppercase: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },

        // Subject Classification
        subjectType: {
            type: String,
            enum: ['GLOBAL', 'SCHOOL_CUSTOM'],
            required: [true, 'Please specify subject type'],
            default: 'SCHOOL_CUSTOM',
        },

        // School Ownership (null for global, schoolId for custom)
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            // Sparse index allows multiple nulls (one per school for non-global)
            sparse: true,
        },

        // Academic Classification
        academicType: {
            type: String,
            enum: ['CORE', 'ELECTIVE', 'EXTRA_CURRICULAR'],
            default: 'CORE',
        },

        // Status Management (Soft Delete)
        status: {
            type: String,
            enum: ['ACTIVE', 'INACTIVE'],
            default: 'ACTIVE',
        },

        // Metadata
        color: {
            type: String,
            default: '#3b82f6', // Blue
        },
        icon: {
            type: String,
            default: 'book', // Icon reference
        },
        syllabus: {
            type: String, // URL to syllabus document
        },

        // Audit Trail
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);

// Unique compound index: code unique per school
// For global subjects (school: null), code must be unique across all globals
// For school subjects, code must be unique within that school
SubjectSchema.index({ code: 1, school: 1 }, { unique: true });

// Index for queries by school
SubjectSchema.index({ school: 1, status: 1 });

// Index for queries by subject type
SubjectSchema.index({ subjectType: 1, status: 1 });

export default mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
