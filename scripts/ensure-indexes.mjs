import dotenv from "dotenv";
import mongoose from "mongoose";

import Achievement from "../models/Achievement.js";
import ActivityLog from "../models/ActivityLog.js";
import AuditLog from "../models/AuditLog.js";
import Event from "../models/Event.js";
import EventNotice from "../models/EventNotice.js";
import EventRound from "../models/EventRound.js";
import EventSchoolInvitation from "../models/EventSchoolInvitation.js";
import FAQ from "../models/FAQ.js";
import Notice from "../models/Notice.js";
import ParticipationRequest from "../models/ParticipationRequest.js";
import RoundParticipant from "../models/RoundParticipant.js";
import RoundSubmission from "../models/RoundSubmission.js";
import SchoolConfig from "../models/SchoolConfig.js";
import SchoolMagazineArticle from "../models/SchoolMagazineArticle.js";
import SchoolPromotion from "../models/SchoolPromotion.js";
import SchoolShowcaseProfile from "../models/SchoolShowcaseProfile.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import User from "../models/User.js";
import Feedback from "../models/Feedback.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const models = [
  Achievement,
  ActivityLog,
  AuditLog,
  Event,
  EventNotice,
  EventRound,
  EventSchoolInvitation,
  FAQ,
  Notice,
  ParticipationRequest,
  RoundParticipant,
  RoundSubmission,
  SchoolConfig,
  SchoolMagazineArticle,
  SchoolPromotion,
  SchoolShowcaseProfile,
  Student,
  Teacher,
  User,
  Feedback,
];

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required to ensure database indexes.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
  });

  // Migration: the student roll-number index became partial (unique only among
  // ACTIVE students) so graduated/transferred students release their roll. The
  // old non-partial index must be dropped before the new one can be created.
  try {
    const studentIndexes = await Student.collection.indexes();
    const legacyRollIndex = studentIndexes.find(
      (ix) =>
        ix.name === "school_1_grade_1_rollNumber_1" &&
        !ix.partialFilterExpression
    );
    if (legacyRollIndex) {
      await Student.collection.dropIndex("school_1_grade_1_rollNumber_1");
      console.log("Migrated: dropped legacy non-partial student roll index.");
    }
  } catch (error) {
    console.warn("Roll-index migration check skipped:", error.message);
  }

  for (const model of models) {
    await model.createIndexes();
    console.log(`Ensured indexes for ${model.modelName}`);
  }

  await mongoose.disconnect();
  console.log("All declared indexes are ready.");
}

main().catch(async (error) => {
  console.error("Failed to ensure indexes:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
