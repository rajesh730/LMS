import dotenv from "dotenv";
import mongoose from "mongoose";

import Achievement from "../models/Achievement.js";
import Event from "../models/Event.js";
import EventRound from "../models/EventRound.js";
import { buildCertificatePath } from "../lib/results.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

function getOwnershipType(event) {
  return event.eventScope === "SCHOOL" ? "SCHOOL_EVENT" : "PLATFORM_EVENT";
}

function getRegistrationStatus(event) {
  if (event.status !== "APPROVED") return "DRAFT";
  if (
    event.registrationDeadline &&
    new Date(event.registrationDeadline).getTime() < Date.now()
  ) {
    return "REGISTRATION_CLOSED";
  }
  return "OPEN_FOR_REGISTRATION";
}

async function getWorkflowStatus(event) {
  if (event.lifecycleStatus === "ARCHIVED") return "ARCHIVED";
  if (event.lifecycleStatus === "COMPLETED") return "COMPLETED";
  if (event.resultsPublished) return "RESULTS_PUBLISHED";

  const hasDraftResults = await Achievement.exists({
    event: event._id,
    certificateState: "CERTIFICATE_PREVIEW",
  });
  if (hasDraftResults) return "RESULTS_DRAFT";

  const hasRounds = await EventRound.exists({ event: event._id });
  if (hasRounds) return "ROUND_ACTIVE";

  return getRegistrationStatus(event);
}

async function backfillEvents() {
  const events = await Event.find({}).lean();
  const operations = [];

  for (const event of events) {
    operations.push({
      updateOne: {
        filter: { _id: event._id },
        update: {
          $set: {
            eventOwnershipType: getOwnershipType(event),
            eventWorkflowStatus: await getWorkflowStatus(event),
          },
        },
      },
    });
  }

  if (operations.length === 0) return 0;
  const result = await Event.bulkWrite(operations);
  return result.modifiedCount || 0;
}

async function backfillCertificates() {
  const achievements = await Achievement.find({})
    .select("_id certificateIssuedAt certificateUrl")
    .lean();
  const operations = achievements.map((achievement) => {
    const active = Boolean(achievement.certificateIssuedAt);
    return {
      updateOne: {
        filter: { _id: achievement._id },
        update: {
          $set: {
            certificateState: active
              ? "CERTIFICATE_ACTIVE"
              : "CERTIFICATE_PREVIEW",
            certificateUrl: active
              ? achievement.certificateUrl || buildCertificatePath(achievement._id)
              : "",
          },
        },
      },
    };
  });

  if (operations.length === 0) return 0;
  const result = await Achievement.bulkWrite(operations);
  return result.modifiedCount || 0;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required for backfill.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
  });

  const [eventsModified, certificatesModified] = await Promise.all([
    backfillEvents(),
    backfillCertificates(),
  ]);

  await mongoose.disconnect();
  console.log(
    `Backfill complete. Events updated: ${eventsModified}. Certificates updated: ${certificatesModified}.`
  );
}

main().catch(async (error) => {
  console.error("Backfill failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
