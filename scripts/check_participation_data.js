const mongoose = require("mongoose");
const ParticipationRequest = require("../models/ParticipationRequest");
const Event = require("../models/Event");
const School = require("../models/User"); // Assuming School is User with role SCHOOL_ADMIN
require("dotenv").config({ path: ".env.local" });

async function checkParticipationData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    // Find the most recent participation requests
    const requests = await ParticipationRequest.find()
      .sort({ requestedAt: -1 })
      .limit(10)
      .populate("event", "title")
      .populate("school", "schoolName");

    console.log("Recent Participation Requests:");
    requests.forEach((req) => {
      console.log(`
        ID: ${req._id}
        Event: ${req.event?.title}
        School: ${req.school?.schoolName}
        Student: ${req.student}
        Contact Person: "${req.contactPerson}"
        Contact Phone: "${req.contactPhone}"
        Notes: "${req.notes}"
        Status: ${req.status}
      `);
    });

    // Check if there are any requests with contact info
    const requestsWithContact = await ParticipationRequest.find({
      contactPerson: { $exists: true, $ne: "" },
    }).limit(5);

    console.log("\nRequests with Contact Info:");
    requestsWithContact.forEach((req) => {
      console.log(`
        ID: ${req._id}
        Contact Person: "${req.contactPerson}"
      `);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkParticipationData();
