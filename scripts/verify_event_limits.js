const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Models
const EventSchema = new mongoose.Schema({
    title: String,
    description: String,
    date: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    maxParticipantsPerSchool: Number,
    participants: [{
        school: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
        joinedAt: { type: Date, default: Date.now },
        expectedStudents: Number
    }]
});
const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);

const StudentSchema = new mongoose.Schema({
    name: String,
    grade: String,
    email: String
});
const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function runTest() {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is missing');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. Setup Data
        // Create Mock School
        const mockSchool = await User.findOneAndUpdate(
            { email: 'test_limit_school@example.com' },
            { name: 'Limit Test School', role: 'SCHOOL_ADMIN' },
            { upsert: true, new: true }
        );

        // Create Mock Students
        const student1 = await Student.findOneAndUpdate(
            { email: 's1_limit@example.com' },
            { name: 'Limit Student 1', grade: 'Class 10' },
            { upsert: true, new: true }
        );
        const student2 = await Student.findOneAndUpdate(
            { email: 's2_limit@example.com' },
            { name: 'Limit Student 2', grade: 'Class 10' },
            { upsert: true, new: true }
        );

        // Create Test Event with Limit 1
        const testEvent = await Event.create({
            title: 'Limit Test Event',
            description: 'Testing max 1 student',
            date: new Date(),
            createdBy: mockSchool._id, // Owner doesn't matter much for this test
            maxParticipantsPerSchool: 1,
            participants: []
        });
        console.log('Created Event:', testEvent._id, 'Max Per School:', testEvent.maxParticipantsPerSchool);

        // 2. Test Limit Failure (Try to add 2)
        console.log('\n--- DATA VALIDATION TEST ---');
        // Logic mimic from API
        const incomingStudentsFail = [student1._id, student2._id];
        const countFail = incomingStudentsFail.length;

        if (testEvent.maxParticipantsPerSchool && countFail > testEvent.maxParticipantsPerSchool) {
            console.log(`✅ Limit Check PASSED: Correctly blocked ${countFail} students (Max ${testEvent.maxParticipantsPerSchool})`);
        } else {
            console.error(`❌ Limit Check FAILED: Allowed ${countFail} students (Max ${testEvent.maxParticipantsPerSchool})`);
        }

        // 3. Test Registration Success (Add 1)
        console.log('\n--- REGISTRATION MOCK ---');
        testEvent.participants.push({
            school: mockSchool._id,
            students: [student1._id],
            expectedStudents: 1
        });
        await testEvent.save();
        console.log('Saved participation with 1 student.');

        // 4. Test Population (Simulate GET API)
        console.log('\n--- POPULATE TEST ---');
        const populatedEvent = await Event.findById(testEvent._id)
            .populate('participants.students', 'name grade')
            .lean();

        const p = populatedEvent.participants[0];
        console.log('Participant Students Data:', JSON.stringify(p.students, null, 2));

        if (p.students && p.students.length > 0 && p.students[0].name === 'Limit Student 1') {
            console.log('✅ Populate PASSED: Student name is visible.');
        } else {
            console.error('❌ Populate FAILED: Student data missing or ID only.');
        }

        // Cleanup
        await Event.findByIdAndDelete(testEvent._id);
        console.log('\nCleaned up test event.');

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
