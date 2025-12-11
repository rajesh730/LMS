const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const StudentSchema = new mongoose.Schema({
  name: String,
  school: mongoose.Schema.Types.ObjectId,
});
const UserSchema = new mongoose.Schema({ email: String });

const Student =
  mongoose.models.Student || mongoose.model("Student", StudentSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function checkStudentSchool() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const studentName = "Student 1 of Class 10";
    const student = await Student.findOne({ name: studentName });

    if (!student) {
      console.log(`Student "${studentName}" not found`);
    } else {
      console.log(`Student: ${student.name}`);
      console.log(`Student ID: ${student._id}`);
      console.log(`Student School ID: ${student.school}`);

      const school = await User.findById(student.school);
      console.log(`School Email: ${school ? school.email : "Not Found"}`);
    }

    const limitStudent = await Student.findOne({ name: "Limit Student 1" });
    if (limitStudent) {
      console.log(`\nStudent: ${limitStudent.name}`);
      console.log(`Student School ID: ${limitStudent.school}`);
      const school = await User.findById(limitStudent.school);
      console.log(`School Email: ${school ? school.email : "Not Found"}`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

checkStudentSchool();
