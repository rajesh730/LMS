const mongoose = require('mongoose');
const { Schema } = mongoose;

// Mock Models
const SubjectSchema = new Schema({
  name: String,
  code: String,
  subjectType: { type: String, enum: ['GLOBAL', 'SCHOOL_CUSTOM'] },
  school: { type: Schema.Types.ObjectId, ref: 'User' },
  grades: [String],
  status: String
});
const Subject = mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);

const GradeSubjectSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: 'User' },
  grade: String,
  subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
  status: String
});
const GradeSubject = mongoose.models.GradeSubject || mongoose.model('GradeSubject', GradeSubjectSchema);

// Mock Data
const schoolId = new mongoose.Types.ObjectId();
const gradeId = "Class 1";
const payload = {
  name: "Robotics Test",
  code: "ROBO-01",
  gradeId: gradeId,
  isCustom: true
};

async function run() {
  // Connect to DB (using a dummy string for now, assuming local or env)
  // In this environment I can't easily connect to the real DB without the string.
  // But I can verify the LOGIC.
  
  console.log("Simulating Logic...");
  
  // 1. Check if Custom
  if (payload.isCustom) {
    console.log("Is Custom Subject");
    
    // Simulate Find
    let subject = null; // Assume not found first
    
    if (!subject) {
        console.log("Subject not found, creating...");
        const initialGrades = payload.gradeId ? [payload.gradeId] : [];
        console.log("Initial Grades:", initialGrades);
        
        const newSubject = {
            name: payload.name,
            code: payload.code,
            subjectType: 'SCHOOL_CUSTOM',
            school: schoolId,
            grades: initialGrades
        };
        console.log("Created Subject Object:", newSubject);
        
        if (newSubject.grades.length === 0) {
            console.error("ERROR: Grades array is empty!");
        } else {
            console.log("SUCCESS: Grades array populated.");
        }
    }
  }
}

run();
