const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const StudentSchema = new mongoose.Schema({
  name: String,
  classroom: mongoose.Schema.Types.ObjectId,
});
const ClassroomSchema = new mongoose.Schema({ name: String });

const Student =
  mongoose.models.Student || mongoose.model("Student", StudentSchema);
const Classroom =
  mongoose.models.Classroom || mongoose.model("Classroom", ClassroomSchema);

async function checkStudentClassroom() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const student = await Student.findOne({ name: "Student 1 of Class 10" });
    if (student) {
      console.log(`Student: ${student.name}`);
      console.log(`Classroom ID: ${student.classroom}`);

      if (student.classroom) {
        const cls = await Classroom.findById(student.classroom);
        console.log(`Classroom Name: ${cls ? cls.name : "Not Found"}`);
      } else {
        console.log("No classroom assigned");
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

checkStudentClassroom();
