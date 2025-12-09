// Test script to manually save teacher attendance
import connectDB from './lib/db.js';
import Attendance from './models/Attendance.js';
import Teacher from './models/Teacher.js';
import mongoose from 'mongoose';

async function testTeacherAttendance() {
    try {
        await connectDB();

        // Find a teacher
        const teacher = await Teacher.findOne();
        if (!teacher) {
            console.log('No teachers found');
            return;
        }

        console.log('Found teacher:', teacher.name, teacher._id);

        // Try to create attendance record
        const record = {
            teacher: teacher._id,
            date: new Date(),
            status: 'ABSENT',
            school: teacher.school
        };

        console.log('Creating record:', record);

        const saved = await Attendance.create(record);
        console.log('✅ Saved successfully:', saved);

        // Try to find it
        const found = await Attendance.findOne({ teacher: teacher._id });
        console.log('Found record:', found);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

testTeacherAttendance();
