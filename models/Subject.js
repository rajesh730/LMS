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

        // Education Level Applicability (for smart filtering)
        // Specifies which education levels this subject applies to
        // Values: "School" (1-10)
        educationLevel: {
            type: [String],
            enum: ['School'],
            default: [],
        },

        // Specific Grades (e.g., "Grade 1", "Grade 10")
        // Allows more granular filtering than educationLevel
        grades: {
            type: [String],
            default: [],
            set: function(grades) {
                if (!grades || !Array.isArray(grades)) return [];
                
                const standardize = (name) => {
                    if (!name) return name;
                    const lower = name.toString().toLowerCase().trim();
                    
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

                    // Number extraction
                    const match = name.toString().match(/\d+/);
                    if (match) return `Grade ${parseInt(match[0], 10)}`;
                    
                    return name;
                };

                return [...new Set(grades.map(standardize))];
            }
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

// Index for queries by education level (for filtering)
SubjectSchema.index({ educationLevel: 1 });

export default mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
