const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });
const ParticipationRequest = require("../models/ParticipationRequest");
const Event = require("../models/Event");
const User = require("../models/User");

async function checkParticipation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const requests = await ParticipationRequest.find({})
      .populate("event", "title")
      .populate("school", "email")
      .lean();

    console.log(`Found ${requests.length} requests.`);

    requests.forEach((r) => {
      console.log("------------------------------------------------");
      console.log(`Event: ${r.event?.title} (${r.event?._id})`);
      console.log(`School: ${r.school?.email} (${r.school?._id})`);
      console.log(`Student: ${r.student}`);
      console.log(`Status: ${r.status}`);
      console.log(`Contact Person: "${r.contactPerson}"`);
      console.log(`Contact Phone: "${r.contactPhone}"`);
      console.log(`Notes: "${r.notes}"`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkParticipation();
