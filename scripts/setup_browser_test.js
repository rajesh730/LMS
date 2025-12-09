const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Models
const UserSchema = new mongoose.Schema({
    name: String, email: String, password: String, role: String, status: String, schoolName: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const StudentSchema = new mongoose.Schema({
    name: String, grade: String, email: String, schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rollNumber: String,
    guardianName: String,
    guardianPhone: String
});
const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

async function setup() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected DB');

        // Create Test School
        const hashedPassword = await bcrypt.hash('school123', 10);
        const school = await User.findOneAndUpdate(
            { email: 'browser_school@test.com' },
            {
                name: 'Browser Test School',
                password: hashedPassword,
                role: 'SCHOOL_ADMIN',
                status: 'APPROVED',
                schoolName: 'Browser High'
            },
            { upsert: true, new: true }
        );
        console.log('School Created:', school.email);

        // Create Students
        await Student.deleteMany({ schoolId: school._id });

        const s1 = await Student.create({
            name: 'Browser Student 1 (Class 9)',
            grade: 'Class 9',
            email: 'bs1@test.com',
            schoolId: school._id,
            rollNumber: 'B001', guardianName: 'G1', guardianPhone: '111'
        });
        const s2 = await Student.create({
            name: 'Browser Student 2 (Class 10)',
            grade: 'Class 10',
            email: 'bs2@test.com',
            schoolId: school._id,
            rollNumber: 'B002', guardianName: 'G2', guardianPhone: '222'
        });
        const s3 = await Student.create({
            name: 'Browser Student 3 (Class 10)',
            grade: 'Class 10',
            email: 'bs3@test.com',
            schoolId: school._id,
            rollNumber: 'B003', guardianName: 'G3', guardianPhone: '333'
        });

        console.log('Students Created:', [s1.grade, s2.grade, s3.grade]);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

setup();
