const mongoose = require('mongoose');
const Student = require('./models/Student');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-management';

async function checkStudents() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const students = await Student.find({});
        console.log(`Total Students in DB: ${students.length}`);

        if (students.length > 0) {
            console.log('Sample Students:', students.slice(0, 3).map(s => ({ name: s.name, email: s.email, school: s.school })));
        }

        const users = await User.find({});
        console.log(`Total Users (Schools): ${users.length}`);
        users.forEach(u => console.log(`User: ${u.name} (${u._id})`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkStudents();
