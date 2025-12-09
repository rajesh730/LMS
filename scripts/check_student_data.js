const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Define minimal schemas if models are not easily loadable, or require them
const StudentSchema = new mongoose.Schema({
    name: String,
    email: String,
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const UserSchema = new mongoose.Schema({
    email: String,
    role: String,
    name: String
});

const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function checkData() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log('\n--- Admin Check ---');
        const admin = await User.findOne({ role: 'SCHOOL_ADMIN' });
        if (!admin) {
            console.log('No School Admin found. Cannot fix data.');
            return;
        }
        console.log(`Using Admin: ${admin.name} (${admin._id}) for repairs.`);

        console.log('\n--- Fixing Orphans ---');
        const result = await Student.updateMany(
            { school: { $exists: false } },
            { $set: { school: admin._id } }
        );
        console.log(`Fixed ${result.modifiedCount} students with missing school ID.`);

        // Also fix those with null school if any
        const resultNull = await Student.updateMany(
            { school: null },
            { $set: { school: admin._id } }
        );
        console.log(`Fixed ${resultNull.modifiedCount} students with NULL school ID.`);

        console.log('\n--- Verification ---');
        const students = await Student.find({ school: { $exists: false } }); // Should be 0
        console.log(`Remaining Orphans: ${students.length}`);

        const nullStudents = await Student.find({ school: null }); // Should be 0
        console.log(`Remaining Null Schools: ${nullStudents.length}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDone.');
    }
}

checkData();
