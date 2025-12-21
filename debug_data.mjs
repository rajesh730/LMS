const mongoose = require("mongoose");
const User = require("./models/User");
const Grade = require("./models/Grade");
const Student = require("./models/Student");
const connectDB = require("./lib/db");

// Mock environment variables if needed, or rely on .env file
require("dotenv").config({ path: ".env.local" });

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const schools = await User.find({ role: "SCHOOL_ADMIN" });
    console.log(`Found ${schools.length} schools`);

    for (const school of schools) {
      console.log(`School: ${school.email} (${school._id})`);
      
      const grades = await Grade.find({ school: school._id });
      console.log(`  Grades: ${grades.length}`);
      grades.forEach(g => console.log(`    - ${g.name} (ID: ${g._id})`));

      const students = await Student.find({ school: school._id });
      console.log(`  Students: ${students.length}`);
      students.forEach(s => console.log(`    - ${s.name} (Grade: ${s.grade})`));
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkData();
