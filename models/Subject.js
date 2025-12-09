import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a subject name'],
        },
        code: {
            type: String,
            required: [true, 'Please provide a subject code'],
        },
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Classroom',
            required: true,
        },
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Teacher',
        },
        description: {
            type: String,
        },
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
