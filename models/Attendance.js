import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
        },
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Teacher',
        },
        date: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'],
            default: 'PRESENT',
        },
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

// Compound index to ensure one record per person per day
AttendanceSchema.index({ student: 1, date: 1 }, { unique: true, partialFilterExpression: { student: { $exists: true } } });
AttendanceSchema.index({ teacher: 1, date: 1 }, { unique: true, partialFilterExpression: { teacher: { $exists: true } } });

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
