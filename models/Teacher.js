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
    qualification: {
        type: String,
    },
    gender: {
        type: String,
        enum: ["MALE", "FEMALE", "OTHER"],
    },
    address: {
        type: String,
    },
    dateOfJoining: {
        type: Date,
    },
    designation: {
        type: String,
    },
    experience: {
        type: Number,
    },
    bloodGroup: {
        type: String,
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
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
    employmentType: {
        type: String,
        enum: ["FULL_TIME", "PART_TIME", "CONTRACT"],
        default: "FULL_TIME",
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
