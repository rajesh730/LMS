import dotenv from "dotenv";
import mongoose from "mongoose";

import Achievement from "../models/Achievement.js";
import ActivityLog from "../models/ActivityLog.js";
import AuditLog from "../models/AuditLog.js";
import Event from "../models/Event.js";
import EventNotice from "../models/EventNotice.js";
import EventProposal from "../models/EventProposal.js";
import EventRound from "../models/EventRound.js";
import EventSchoolInvitation from "../models/EventSchoolInvitation.js";
import ExternalOrganizer from "../models/ExternalOrganizer.js";
import FAQ from "../models/FAQ.js";
import Notice from "../models/Notice.js";
import ParticipationRequest from "../models/ParticipationRequest.js";
import PlatformChallenge from "../models/PlatformChallenge.js";
import PlatformChallengeSubmission from "../models/PlatformChallengeSubmission.js";
import RoundParticipant from "../models/RoundParticipant.js";
import RoundSubmission from "../models/RoundSubmission.js";
import SchoolConfig from "../models/SchoolConfig.js";
import SchoolMagazineArticle from "../models/SchoolMagazineArticle.js";
import SchoolPromotion from "../models/SchoolPromotion.js";
import SchoolShowcaseProfile from "../models/SchoolShowcaseProfile.js";
import Student from "../models/Student.js";
import SupportTicket from "../models/SupportTicket.js";
import Teacher from "../models/Teacher.js";
import User from "../models/User.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const models = [
  Achievement,
  ActivityLog,
  AuditLog,
  Event,
  EventNotice,
  EventProposal,
  EventRound,
  EventSchoolInvitation,
  ExternalOrganizer,
  FAQ,
  Notice,
  ParticipationRequest,
  PlatformChallenge,
  PlatformChallengeSubmission,
  RoundParticipant,
  RoundSubmission,
  SchoolConfig,
  SchoolMagazineArticle,
  SchoolPromotion,
  SchoolShowcaseProfile,
  Student,
  SupportTicket,
  Teacher,
  User,
];

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required to ensure database indexes.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
  });

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
