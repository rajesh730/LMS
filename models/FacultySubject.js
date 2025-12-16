import mongoose from 'mongoose';

/**
 * FacultySubject Schema - Junction Table
 * Maps faculties to subjects for each school
 */
const FacultySubjectSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  faculty: {
    type: String,
    required: true,
    trim: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE',
  },
  year: {
    type: Number,
    default: 1
  },
  semester: {
    type: Number,
    default: 1
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

FacultySubjectSchema.index({ school: 1, faculty: 1, subject: 1 }, { unique: true });
FacultySubjectSchema.index({ school: 1, faculty: 1, status: 1 });
FacultySubjectSchema.index({ subject: 1 });

export default mongoose.models.FacultySubject || mongoose.model('FacultySubject', FacultySubjectSchema);
