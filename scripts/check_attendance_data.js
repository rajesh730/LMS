const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment');
    process.exit(1);
}

const AttendanceSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    date: { type: Date, required: true },
    status: { type: String, enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'], default: 'PRESENT' },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);

const StudentSchema = new mongoose.Schema({
    name: String,
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
    grade: String,
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

async function checkAttendance() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Check ALL attendance records
        const allAttendance = await Attendance.find({})
            .populate('student', 'name classroom grade')
            .populate('school', 'email')
            .sort({ date: -1 })
            .limit(50);

        console.log(`📊 Total attendance records in DB: ${await Attendance.countDocuments()}`);
        console.log(`📊 Showing last 50 records:\n`);

        if (allAttendance.length === 0) {
            console.log('⚠️  NO ATTENDANCE RECORDS FOUND IN DATABASE!');
            console.log('This means attendance is being saved appears to be failing.\n');
        } else {
            allAttendance.forEach((record, idx) => {
                console.log(`${idx + 1}. ${record.student?.name || 'Teacher'}`);
                console.log(`   Status: ${record.status}`);
                console.log(`   Student ID: ${record.student?._id}`);
                console.log(`   Classroom: ${record.student?.classroom}`);
                console.log(`   Date: ${record.date.toISOString()}`);
                console.log(`   School ID: ${record.school?._id || record.school}`);
                console.log('');
            });
        }

        // Check students in classroom
        const studentsWithClassroom = await Student.find({}).select('name classroom grade').limit(10);
        console.log(`\n👨‍🎓 Sample students (first 10):`);
        studentsWithClassroom.forEach(s => {
            console.log(`- ${s.name}: classroom=${s.classroom}, grade=${s.grade}`);
        });

        await mongoose.connection.close();
        console.log('\n✅ Done');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAttendance();
