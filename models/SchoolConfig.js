import mongoose from 'mongoose';

const SchoolConfigSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    teacherRoles: {
        type: [String],
        default: ['Principal', 'Vice Principal', 'Coordinator', 'Class Teacher', 'Subject Teacher', 'Sports Teacher', 'Music Teacher', 'Lab Assistant'],
    },
    grades: {
        type: [String],
        default: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    },
    subjects: {
        type: [String],
        default: ['Mathematics', 'Science', 'English', 'Social Studies', 'Computer Science'],
    },
}, { timestamps: true });

export default mongoose.models.SchoolConfig || mongoose.model('SchoolConfig', SchoolConfigSchema);
