import mongoose from 'mongoose';

/**
 * GradeSubject Schema - Subject Activation and Usage Layer
 * 
 * This model manages:
 * - Which subjects are active for each grade
 * - Whether a subject is compulsory or optional for a grade
 * - Grading parameters (full marks, pass marks, credit hours)
 * - Teacher assignment to subjects
 * - Academic calendar for the subject-grade combo
 * 
 * Soft deletion: status field allows deactivation without data loss
 */
const GradeSubjectSchema = new mongoose.Schema(
    {
        // References
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            required: [true, 'Please provide a subject'],
        },
        grade: {
            type: String,
            required: [true, 'Please provide a grade'],
            // e.g., "Grade 9", "Grade 10"
            set: function(name) {
                if (!name) return name;
                const lower = name.toLowerCase().trim();
                
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
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Please provide a school'],
        },

        // Assignment Properties
        isCompulsory: {
            type: Boolean,
            default: true,
            // true = mandatory for all students, false = optional (elective)
        },

        // Status Management (Soft Disable)
        status: {
            type: String,
            enum: ['ACTIVE', 'INACTIVE'],
            default: 'ACTIVE',
            // Can deactivate without deleting historical data
        },

        // Grading Parameters (Per Grade)
        fullMarks: {
            type: Number,
            required: [true, 'Please provide full marks'],
            min: 1,
            max: 1000,
            // e.g., 100 for most subjects
        },
        passMarks: {
            type: Number,
            required: [true, 'Please provide pass marks'],
            min: 0,
            validate: {
                validator: function () {
                    return this.passMarks <= this.fullMarks;
                },
                message: 'Pass marks cannot exceed full marks',
            },
            // e.g., 40 for most subjects
        },
        creditHours: {
            type: Number,
            default: 3,
            // Used in GPA calculation
        },

        // Teacher Assignment
        assignedTeacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Teacher',
            default: null,
            // One subject per grade can have one primary teacher
        },

        // Academic Calendar
        startDate: {
            type: Date,
        },
        endDate: {
            type: Date,
        },

        // Assessment Pattern (Optional, for future use)
        assessmentPattern: {
            unitTests: {
                count: { type: Number, default: 0 },
                marksPerTest: { type: Number, default: 0 },
            },
            assignments: {
                count: { type: Number, default: 0 },
                marksPerAssignment: { type: Number, default: 0 },
            },
            practicals: {
                count: { type: Number, default: 0 },
                marksPerPractical: { type: Number, default: 0 },
            },
            finalExam: {
                marks: { type: Number, default: 0 },
                duration: { type: Number, default: 0 }, // in minutes
            },
            classParticipation: {
                marks: { type: Number, default: 0 },
            },
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

        // Notes
        remarks: {
            type: String,
            // e.g., "New curriculum", "Updated grading scheme"
        },
    },
    { timestamps: true }
);

// Compound unique index: one subject can be activated only once per grade per school
GradeSubjectSchema.index({ subject: 1, grade: 1, school: 1 }, { unique: true });

// Index for efficient queries
GradeSubjectSchema.index({ school: 1, grade: 1, status: 1 });
GradeSubjectSchema.index({ subject: 1, status: 1 });
GradeSubjectSchema.index({ assignedTeacher: 1 });

export default mongoose.models.GradeSubject || mongoose.model('GradeSubject', GradeSubjectSchema);
