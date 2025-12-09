import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Linking to the User record of the student
            required: true,
        },
        question: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question',
            required: true,
        },
        answer: {
            type: String,
            required: true,
        },
        isCorrect: {
            type: Boolean,
            default: false,
        },
        awardedPoints: {
            type: Number,
            default: 0,
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

export default mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);
