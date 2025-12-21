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
        default: ['Principal', 'Vice Principal', 'Coordinator', 'Subject Teacher', 'Sports Teacher', 'Music Teacher', 'Lab Assistant'],
    },
    grades: {
        type: [String],
        default: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
    },
    subjects: {
        type: [String],
        default: ['Mathematics', 'Science', 'English', 'Social Studies', 'Computer Science'],
    },
    currentAcademicYear: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear',
    },
}, { timestamps: true });

export default mongoose.models.SchoolConfig || mongoose.model('SchoolConfig', SchoolConfigSchema);
