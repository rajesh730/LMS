const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/egrantha";

// Define all schemas
const UserSchema = new mongoose.Schema({
  email: String,
  schoolName: String,
});
const User = mongoose.models.User || mongoose.model("User", UserSchema);

const ClassroomSchema = new mongoose.Schema({
  name: String,
  capacity: Number,
  school: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});
const Classroom =
  mongoose.models.Classroom || mongoose.model("Classroom", ClassroomSchema);

const StudentSchema = new mongoose.Schema({
  name: String,
  email: String,
  grade: String,
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom" },
  school: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  parentEmail: String,
});
const Student =
  mongoose.models.Student || mongoose.model("Student", StudentSchema);

async function addStudentsToClass10A() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB\n");

    // Find Antigravity High school
    const school = await User.findOne({ email: "admin@antigravity.edu" });
    if (!school) {
      console.log("School not found!");
      return;
    }
    console.log(`Found school: ${school.schoolName} (${school._id})`);

    // Find Class 10A classroom
    const classroom = await Classroom.findOne({
      name: "Class 10A",
      school: school._id,
    });
    if (!classroom) {
      console.log("Classroom Class 10A not found!");
      return;
    }
    console.log(`Found classroom: ${classroom.name} (${classroom._id})\n`);

    // Sample students to add
    const studentsToAdd = [
      {
        name: "Ram Sharma",
        email: "ram@student.com",
        parentEmail: "ramparent@gmail.com",
      },
      {
        name: "Sita Thapa",
        email: "sita@student.com",
        parentEmail: "sitaparent@gmail.com",
      },
      {
        name: "Hari Gurung",
        email: "hari@student.com",
        parentEmail: "hariparent@gmail.com",
      },
      {
        name: "Gita Rai",
        email: "gita@student.com",
        parentEmail: "gitaparent@gmail.com",
      },
      {
        name: "Shyam Magar",
        email: "shyam@student.com",
        parentEmail: "shyamparent@gmail.com",
      },
    ];

    console.log("Adding students to Class 10A...");
    for (const s of studentsToAdd) {
      const existing = await Student.findOne({
        email: s.email,
        school: school._id,
      });
      if (existing) {
        console.log(`  Updating ${s.name} - assigning to Class 10A`);
        existing.classroom = classroom._id;
        existing.grade = "10";
        await existing.save();
      } else {
        console.log(`  Creating ${s.name}`);
        await Student.create({
          name: s.name,
          email: s.email,
          parentEmail: s.parentEmail,
          grade: "10",
          classroom: classroom._id,
          school: school._id,
        });
      }
    }

    console.log("\n✅ Done! Students added to Class 10A");

    // Verify
    const studentsInClass = await Student.find({ classroom: classroom._id });
    console.log(`\nStudents in Class 10A: ${studentsInClass.length}`);
    studentsInClass.forEach((s) => console.log(`  - ${s.name}`));

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}
addStudentsToClass10A();
