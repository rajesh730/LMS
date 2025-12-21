const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Define minimal schemas
const UserSchema = new mongoose.Schema({
    role: String,
    email: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const StudentSchema = new mongoose.Schema({
    name: String,
    grade: String,
    status: String,
    school: mongoose.Schema.Types.ObjectId
});
const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

const SchoolConfigSchema = new mongoose.Schema({
    school: mongoose.Schema.Types.ObjectId,
    grades: [String]
});
const SchoolConfig = mongoose.models.SchoolConfig || mongoose.model('SchoolConfig', SchoolConfigSchema);

async function diagnose() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("❌ No MONGODB_URI found in .env.local");
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to DB");

        // 1. Find ALL School Admins
        const admins = await User.find({ role: 'SCHOOL_ADMIN' });
        console.log(`\n👥 Found ${admins.length} School Admins.`);

        for (const admin of admins) {
            console.log(`\n--------------------------------------------------`);
            console.log(`👤 Checking Admin: ${admin.email} (ID: ${admin._id})`);
            
            const studentCount = await Student.countDocuments({ school: admin._id });
            console.log(`   📊 Total Students: ${studentCount}`);

            if (studentCount > 0) {
                const sample = await Student.findOne({ school: admin._id });
                console.log(`   📝 Sample Student: Name="${sample.name}", Grade="${sample.grade}", Status="${sample.status}"`);

                // Test the query for this admin
                const testGrade = sample.grade; // Use the student's actual grade to test
                const gradeNumber = testGrade.replace(/\D/g, "");
                
                const query = {
                    school: admin._id,
                    $and: []
                };

                // Status Check (Loose)
                query.$and.push({ status: { $regex: /ACTIVE/i } });

                // Grade Check
                if (gradeNumber) {
                    query.$and.push({
                        $or: [
                            { grade: testGrade },
                            { grade: { $regex: new RegExp(`^${testGrade}$`, 'i') } },
                            { grade: { $regex: new RegExp(`^Grade\\s*${gradeNumber}$`, 'i') } },
                            { grade: { $regex: new RegExp(`^Class\\s*${gradeNumber}$`, 'i') } },
                            { grade: gradeNumber }
                        ]
                    });
                } else {
                     query.$and.push({
                         $or: [
                            { grade: testGrade },
                            { grade: { $regex: new RegExp(`^${testGrade}$`, 'i') } }
                         ]
                     });
                }

                const matchCount = await Student.countDocuments(query);
                console.log(`   🔍 Query for grade "${testGrade}" matched: ${matchCount} students.`);
                
                if (matchCount === 0) {
                    console.log("   ❌ MATCH FAILED. The query logic is missing this student.");
                } else {
                    console.log("   ✅ MATCH SUCCESS. The backend logic works for this user.");
                }
            } else {
                console.log("   ⚠️ No students for this admin.");
            }
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

diagnose();
