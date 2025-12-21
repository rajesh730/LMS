import mongoose from "mongoose";
import User from "./models/User.js";
import SchoolConfig from "./models/SchoolConfig.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function checkSchoolConfig() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const configs = await SchoolConfig.find({});
    console.log(`Found ${configs.length} SchoolConfig documents`);
    
    for (const config of configs) {
      console.log(`\nConfig for School ID: ${config.school}`);
      console.log("Grades:", config.grades);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkSchoolConfig();