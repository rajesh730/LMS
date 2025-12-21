import mongoose from "mongoose";
import User from "./models/User.js";
import Student from "./models/Student.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function checkStudents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    // 1. Get all School Admins
    const schools = await User.find({ role: "SCHOOL_ADMIN" });
    console.log(`Found ${schools.length} schools`);

    for (const school of schools) {
      console.log(`\n--------------------------------------------------`);
      console.log(`School: ${school.email} (ID: ${school._id})`);
      
      // 2. Count students for this school
      const studentCount = await Student.countDocuments({ school: school._id });
      console.log(`Total Students: ${studentCount}`);

      if (studentCount > 0) {
        // 3. List a few students to see their structure
        const students = await Student.find({ school: school._id }).limit(5);
        students.forEach(s => {
          console.log(`  - Name: ${s.name}`);
          console.log(`    Grade: "${s.grade}"`);
          console.log(`    ID: ${s._id}`);
        });
      } else {
          // Check if there are students with this school ID as string vs ObjectId
          const stringIdCount = await Student.countDocuments({ school: school._id.toString() });
          console.log(`Total Students (String ID match): ${stringIdCount}`);
      }
    }
    
    // 4. Check for orphaned students (no school or invalid school)
    const allStudents = await Student.find({}).limit(5);
    console.log(`\n--------------------------------------------------`);
    console.log("Sample of ALL students in DB (first 5):");
    allStudents.forEach(s => {
        console.log(`  - Name: ${s.name}, School ID: ${s.school}, Grade: ${s.grade}`);
    });


  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkStudents();