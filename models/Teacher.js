import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
    },
    phone: {
        type: String,
    },
    visiblePassword: {
        type: String, // Stored for admin visibility as requested
    },
    subject: {
        type: String,
        required: [true, 'Please provide a subject'],
    },
    roles: {
        type: [String],
        default: ['SUBJECT_TEACHER'],
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.Teacher || mongoose.model('Teacher', TeacherSchema);
