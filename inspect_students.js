
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

// Define minimal schemas to avoid importing the whole app structure if possible, 
// but since we have the files, let's try to use the models if we can, or just raw mongoose.
// Using raw mongoose schemas here to be self-contained and avoid import issues.

const StudentSchema = new mongoose.Schema({
  name: String,
  grade: mongoose.Schema.Types.Mixed, // Use Mixed to see if it's number or string
  status: String,
  school: mongoose.Schema.Types.ObjectId,
  createdAt: Date
}, { strict: false }); // strict: false to see all fields

const UserSchema = new mongoose.Schema({
  email: String,
  role: String
});

const Student = mongoose.model('Student', StudentSchema);
const User = mongoose.model('User', UserSchema);

async function inspect() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("MONGODB_URI is missing in .env.local");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    // 1. Get the School Admin User (assuming the user is 'info@orbitschool.com' based on previous context, or we list all admins)
    const admins = await User.find({ role: 'SCHOOL_ADMIN' });
    console.log("\n--- School Admins ---");
    admins.forEach(a => {
        console.log(`ID: ${a._id}, Email: ${a.email}`);
    });

    // 2. Get All Students and group by School
    const students = await Student.find({});
    console.log(`\n--- Total Students Found: ${students.length} ---`);

    const studentsBySchool = {};
    
    students.forEach(s => {
        const schoolId = s.school ? s.school.toString() : 'undefined';
        if (!studentsBySchool[schoolId]) {
            studentsBySchool[schoolId] = [];
        }
        studentsBySchool[schoolId].push(s);
    });

    for (const [schoolId, list] of Object.entries(studentsBySchool)) {
        console.log(`\nSchool ID: ${schoolId} (Count: ${list.length})`);
        
        // Check if this school ID matches any admin
        const admin = admins.find(a => a._id.toString() === schoolId);
        if (admin) {
            console.log(`Matches Admin: ${admin.email}`);
        } else {
            console.log(`WARNING: No Admin found for this School ID!`);
        }

        // Print sample students (first 3 and last 3)
        const samples = [...list.slice(0, 3), ...list.slice(-3)];
        // Deduplicate if list is small
        const uniqueSamples = [...new Set(samples)];

        uniqueSamples.forEach(s => {
            console.log(`  - Name: "${s.name}", Grade: "${s.grade}" (Type: ${typeof s.grade}), Status: "${s.status}", Created: ${s.createdAt}`);
        });
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

inspect();
