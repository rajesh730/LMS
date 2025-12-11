const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const ParticipationRequestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  school: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: String,
});

const StudentSchema = new mongoose.Schema({ name: String });
const Student =
  mongoose.models.Student || mongoose.model("Student", StudentSchema);
const ParticipationRequest =
  mongoose.models.ParticipationRequest ||
  mongoose.model("ParticipationRequest", ParticipationRequestSchema);

async function checkOrphanedRequests() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    // Find "Limit Student 1"
    const student = await Student.findOne({ name: "Limit Student 1" });
    if (!student) {
      console.log("Limit Student 1 not found");
      return;
    }
    console.log(`Limit Student 1 ID: ${student._id}`);

    // Find requests for this student
    const requests = await ParticipationRequest.find({ student: student._id });
    console.log(`Found ${requests.length} requests for Limit Student 1`);

    requests.forEach((r) => {
      console.log(`Request ID: ${r._id}`);
      console.log(`  Event ID in DB: ${r.event}`);
      console.log(`  Status: ${r.status}`);
    });
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

checkOrphanedRequests();
