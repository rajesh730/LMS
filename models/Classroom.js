import mongoose from 'mongoose';

const ClassroomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a class name'],
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    classTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
    },
    subjectTeachers: [{
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Teacher',
        },
        subject: String,
    }],
    subjects: [{
        name: { type: String, required: true },
        code: String,
    }],
    capacity: {
        type: Number,
        default: 30,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.Classroom || mongoose.model('Classroom', ClassroomSchema);
