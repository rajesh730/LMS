const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/egrantha';

// Define all schemas needed
const UserSchema = new mongoose.Schema({
    email: String,
    schoolName: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const ClassroomSchema = new mongoose.Schema({
    name: String,
    capacity: Number,
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const Classroom = mongoose.models.Classroom || mongoose.model('Classroom', ClassroomSchema);

const StudentSchema = new mongoose.Schema({
    name: String,
    email: String,
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    parentEmail: String
});
const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

async function checkStudents() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB\n');

        // Get all students
        const students = await Student.find({}).populate('classroom').populate('school', 'email schoolName');
        console.log(`Total students in DB: ${students.length}`);

        if (students.length > 0) {
            students.forEach((s, i) => {
                console.log(`\n${i + 1}. ${s.name}`);
                console.log(`   Email: ${s.email}`);
                console.log(`   Classroom ID: ${s.classroom?._id || 'Not assigned'}`);
                console.log(`   Classroom Name: ${s.classroom?.name || 'Not assigned'}`);
                console.log(`   School: ${s.school?.schoolName || s.school?.email || 'Unknown'}`);
            });
        } else {
            console.log('No students found in database!');
        }

        // Get all classrooms
        console.log('\n--- Classrooms ---');
        const classrooms = await Classroom.find({}).populate('school', 'email schoolName');
        console.log(`Total classrooms: ${classrooms.length}`);
        classrooms.forEach((c, i) => {
            console.log(`${i + 1}. ${c.name} (ID: ${c._id}) - School: ${c.school?.schoolName || c.school?.email}`);
        });

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
checkStudents();
