
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const StudentSchema = new mongoose.Schema({
  name: String,
  grade: mongoose.Schema.Types.Mixed,
  status: String,
  school: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  academicYear: mongoose.Schema.Types.ObjectId // Check if this exists
}, { strict: false });

const Student = mongoose.model('Student', StudentSchema);

async function compare() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    // Fetch all students
    const students = await Student.find({});
    
    console.log(`\nTotal Students: ${students.length}`);
    
    // Group by "New" (created today) vs "Old" (created before today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newStudents = students.filter(s => s.createdAt >= today);
    const oldStudents = students.filter(s => s.createdAt < today);
    
    console.log(`New Students: ${newStudents.length}`);
    console.log(`Old Students: ${oldStudents.length}`);
    
    if (newStudents.length > 0) {
        console.log("\n--- Sample NEW Student ---");
        console.log(JSON.stringify(newStudents[0], null, 2));
    }
    
    if (oldStudents.length > 0) {
        console.log("\n--- Sample OLD Student ---");
        console.log(JSON.stringify(oldStudents[0], null, 2));
    }

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

compare();
