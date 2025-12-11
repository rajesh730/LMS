const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const ParticipationRequestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  school: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: String,
  contactPerson: String,
  contactPhone: String,
  notes: String,
});

const StudentSchema = new mongoose.Schema({ name: String, grade: String });
const EventSchema = new mongoose.Schema({ title: String });
const UserSchema = new mongoose.Schema({ email: String });

const ParticipationRequest =
  mongoose.models.ParticipationRequest ||
  mongoose.model("ParticipationRequest", ParticipationRequestSchema);
const Student =
  mongoose.models.Student || mongoose.model("Student", StudentSchema);
const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function checkEventParticipation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const eventId = "6939c6589e7bf11a1d170eeb"; // From screenshot
    // We need to find the school. Let's look for any request for this event to find the school.

    const anyRequest = await ParticipationRequest.findOne({ event: eventId });
    if (!anyRequest) {
      console.log("No requests found for this event at all.");
      return;
    }

    const schoolId = anyRequest.school;
    console.log(`Checking for Event: ${eventId} and School: ${schoolId}`);

    const requests = await ParticipationRequest.find({
      event: eventId,
      school: schoolId,
    })
      .populate("student", "name grade")
      .lean();

    console.log(`Found ${requests.length} requests.`);

    const relevantRequests = requests.filter((r) =>
      ["PENDING", "APPROVED", "REJECTED"].includes(r.status)
    );
    console.log(
      `Relevant requests (PENDING/APPROVED/REJECTED): ${relevantRequests.length}`
    );

    const selectedIds = relevantRequests
      .map((r) => {
        if (!r.student) return null;
        const sId = r.student._id.toString();
        return sId;
      })
      .filter(Boolean);

    console.log("Selected IDs that should be in frontend:", selectedIds);

    if (requests.length > 0) {
      console.log("Sample Request:", JSON.stringify(requests[0], null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

checkEventParticipation();
