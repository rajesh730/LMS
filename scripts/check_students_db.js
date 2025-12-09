const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/egrantha';

const studentSchema = new mongoose.Schema({
    name: String,
    email: String,
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
    grade: String,
}, { strict: false });

const classroomSchema = new mongoose.Schema({
    name: String,
}, { strict: false });

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
const Classroom = mongoose.models.Classroom || mongoose.model('Classroom', classroomSchema);

async function checkStudents() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const classrooms = await Classroom.find({});
        console.log('Classrooms:', classrooms.map(c => ({ id: c._id, name: c.name })));

        const students = await Student.find({}).populate('classroom');
        console.log('Total Students:', students.length);

        const gradeCounts = {};
        students.forEach(s => {
            const g = s.grade || 'Unknown';
            gradeCounts[g] = (gradeCounts[g] || 0) + 1;
        });
        console.log('Students by Grade:', gradeCounts);

        if (students.length > 0) {
            console.log('Sample Students:');
            students.slice(0, 5).forEach(s => {
                console.log(`- Name: ${s.name}, Grade: ${s.grade}, Classroom: ${s.classroom ? s.classroom.name : 'None'} (${s.classroom ? s.classroom._id : 'N/A'})`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkStudents();
