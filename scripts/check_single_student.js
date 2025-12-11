const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const StudentSchema = new mongoose.Schema({ name: String });
const Student =
  mongoose.models.Student || mongoose.model("Student", StudentSchema);

async function checkStudent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const studentId = "6939acb02f4486a8abe4fae0";
    const student = await Student.findById(studentId);

    if (student) {
      console.log(`Student found: ${student._id}`);
    } else {
      console.log(`Student ${studentId} NOT found`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

checkStudent();
