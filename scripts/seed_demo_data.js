const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/egrantha";

// --- Schemas ---
const UserSchema = new mongoose.Schema({
  email: String,
  schoolName: String,
  role: String,
  password: String,
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
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom" },
  school: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  parentEmail: String,
  rollNumber: String,
});
const Student =
  mongoose.models.Student || mongoose.model("Student", StudentSchema);

const EventSchema = new mongoose.Schema({
  title: String,
  description: String,
  date: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  school: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, default: "PUBLISHED" },
});
const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);

const ParticipationRequestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  school: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN", "ENROLLED"],
  },
  requestedAt: { type: Date, default: Date.now },
});
const ParticipationRequest =
  mongoose.models.ParticipationRequest ||
  mongoose.model("ParticipationRequest", ParticipationRequestSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    // 1. Find School Admin
    let school = await User.findOne({ role: "SCHOOL_ADMIN" });
    if (!school) {
      console.log("No SCHOOL_ADMIN found. Creating one...");
      school = await User.create({
        email: "admin@demo.edu",
        password: "password123", // In real app this should be hashed
        role: "SCHOOL_ADMIN",
        schoolName: "Demo High School",
      });
    }
    console.log(`Using School: ${school.schoolName} (${school._id})`);

    // 2. Create Classrooms
    const classNames = ["Class 8", "Class 9", "Class 10"];
    const classrooms = {};

    for (const name of classNames) {
      let classroom = await Classroom.findOne({ name, school: school._id });
      if (!classroom) {
        classroom = await Classroom.create({
          name,
          capacity: 40,
          school: school._id,
        });
        console.log(`Created ${name}`);
      } else {
        console.log(`Found ${name}`);
      }
      classrooms[name] = classroom;
    }

    // 3. Create Students
    const students = [];
    for (const name of classNames) {
      const classroom = classrooms[name];
      for (let i = 1; i <= 5; i++) {
        const email = `student${i}_${name.replace(
          " ",
          ""
        )}@demo.edu`.toLowerCase();
        let student = await Student.findOne({ email });
        if (!student) {
          student = await Student.create({
            name: `Student ${i} of ${name}`,
            email,
            classroom: classroom._id,
            school: school._id,
            rollNumber: `${name.split(" ")[1]}${i.toString().padStart(2, "0")}`,
            parentEmail: `parent${i}_${name.replace(
              " ",
              ""
            )}@demo.edu`.toLowerCase(),
          });
          console.log(`Created ${student.name}`);
        }
        students.push(student);
      }
    }

    // 4. Create Event
    let event = await Event.findOne({
      title: "Science Fair 2025",
      school: school._id,
    });
    if (!event) {
      event = await Event.create({
        title: "Science Fair 2025",
        description: "Annual Science Fair for all students.",
        date: new Date("2025-12-20"),
        createdBy: school._id,
        school: school._id,
        status: "PUBLISHED",
      });
      console.log("Created Event: Science Fair 2025");
    } else {
      console.log("Found Event: Science Fair 2025");
    }

    // 5. Create Participation Requests
    // Clear existing requests for this event to avoid duplicates/confusion during testing
    await ParticipationRequest.deleteMany({ event: event._id });
    console.log("Cleared existing participation requests for this event.");

    // Distribute statuses
    const statuses = ["PENDING", "APPROVED", "REJECTED", "UNREGISTERED"];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const status = statuses[i % statuses.length];

      if (status !== "UNREGISTERED") {
        await ParticipationRequest.create({
          student: student._id,
          event: event._id,
          school: school._id,
          status: status,
        });
        console.log(`Created ${status} request for ${student.name}`);
      }
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();
