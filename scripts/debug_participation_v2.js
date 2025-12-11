const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const ParticipationRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN", "ENROLLED"],
    default: "PENDING",
  },
  contactPerson: String,
  contactPhone: String,
  notes: String,
  requestedAt: {
    type: Date,
    default: Date.now,
  },
});

const ParticipationRequest =
  mongoose.models.ParticipationRequest ||
  mongoose.model("ParticipationRequest", ParticipationRequestSchema);

// Minimal schemas for population
const EventSchema = new mongoose.Schema({ title: String });
const UserSchema = new mongoose.Schema({ email: String });
const StudentSchema = new mongoose.Schema({ name: String });

const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Student =
  mongoose.models.Student || mongoose.model("Student", StudentSchema);

async function checkParticipation() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("MONGODB_URI is missing in .env.local");
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const requests = await ParticipationRequest.find({})
      .populate("event", "title")
      .populate("school", "email")
      .populate("student", "name grade")
      .lean();

    console.log(`Found ${requests.length} requests.`);

    requests.forEach((r) => {
      console.log("------------------------------------------------");
      console.log(`ID: ${r._id}`);
      console.log(`Event: ${r.event?.title} (${r.event?._id})`);
      console.log(`School: ${r.school?.email} (${r.school?._id})`);
      console.log(`Student: ${JSON.stringify(r.student)}`);
      console.log(`Status: ${r.status}`);
      console.log(`Contact Person: "${r.contactPerson}"`);
      console.log(`Contact Phone: "${r.contactPhone}"`);
      console.log(`Notes: "${r.notes}"`);
    });
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected");
  }
}

checkParticipation();
