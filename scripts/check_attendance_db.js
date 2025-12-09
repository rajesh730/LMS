const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/egrantha';

const attendanceSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    date: Date,
    status: String,
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { strict: false });

const studentSchema = new mongoose.Schema({
    name: String,
    grade: String,
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' }
}, { strict: false });

const classroomSchema = new mongoose.Schema({
    name: String
}, { strict: false });

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
const Classroom = mongoose.models.Classroom || mongoose.model('Classroom', classroomSchema);

async function checkAttendance() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        // 1. Find Grade 10 Classroom
        const grade10 = await Classroom.findOne({ name: '10' });
        if (!grade10) {
            console.log('Grade 10 classroom not found');
            process.exit(1);
        }
        console.log('Grade 10 ID:', grade10._id);

        // 2. Find Students in Grade 10
        const students = await Student.find({ classroom: grade10._id });
        console.log(`Found ${students.length} students in Grade 10`);
        if (students.length === 0) {
            // Fallback check by grade string if classroom link is missing
            const studentsByGrade = await Student.find({ grade: '10' });
            console.log(`Found ${studentsByGrade.length} students with grade='10' string`);
        }

        // 3. Check Attendance for Today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Note: The API uses string date YYYY-MM-DD. 
        // Let's check what's actually in the DB.
        const attendance = await Attendance.find({
            // date: { $gte: today } 
        }).populate('student');

        console.log(`Total Attendance Records: ${attendance.length}`);

        const grade10Attendance = attendance.filter(a => {
            return a.student && (
                (a.student.classroom && a.student.classroom.toString() === grade10._id.toString()) ||
                a.student.grade === '10'
            );
        });

        console.log(`Attendance for Grade 10: ${grade10Attendance.length}`);
        if (grade10Attendance.length > 0) {
            console.log('Sample Record:', grade10Attendance[0]);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAttendance();
