import dotenv from "dotenv";
import mongoose from "mongoose";

import EventRound from "../models/EventRound.js";
import RoundParticipant from "../models/RoundParticipant.js";
import ParticipationRequest from "../models/ParticipationRequest.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

// Round 1 is derived directly from the approved/enrolled participation roster.
// Historically the sync only ever *added* entries, so students that were later
// rejected or withdrawn left stale RoundParticipant rows behind — making the
// round count drift above the live participant list (e.g. 45 in round vs 14
// participants). This script prunes those orphaned round-1 entries.
//
// Usage:
//   node scripts/cleanup-orphaned-round-participants.mjs          (dry run)
//   node scripts/cleanup-orphaned-round-participants.mjs --apply  (delete)

const APPLY = process.argv.includes("--apply");

async function cleanup() {
  const rounds = await EventRound.find({ roundNumber: 1 })
    .select("_id event")
    .lean();

  let totalOrphans = 0;
  let affectedRounds = 0;

  for (const round of rounds) {
    const approved = await ParticipationRequest.find({
      event: round.event,
      status: { $in: ["APPROVED", "ENROLLED"] },
    })
      .select("student")
      .lean();

    const eligibleStudentIds = approved.map((request) => String(request.student));

    const orphans = await RoundParticipant.find({
      event: round.event,
      round: round._id,
      student: { $nin: eligibleStudentIds },
    })
      .select("_id")
      .lean();

    if (orphans.length === 0) continue;

    affectedRounds += 1;
    totalOrphans += orphans.length;
    console.log(
      `Event ${round.event} round 1: ${orphans.length} orphaned entrie(s) (${eligibleStudentIds.length} eligible)`
    );

    if (APPLY) {
      await RoundParticipant.deleteMany({
        _id: { $in: orphans.map((orphan) => orphan._id) },
      });
    }
  }

  return { totalOrphans, affectedRounds };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
  });

  const { totalOrphans, affectedRounds } = await cleanup();

  await mongoose.disconnect();
  console.log(
    `${APPLY ? "Removed" : "Would remove"} ${totalOrphans} orphaned round-1 participant(s) across ${affectedRounds} round(s).${
      APPLY ? "" : " Re-run with --apply to delete them."
    }`
  );
}

main().catch(async (error) => {
  console.error("Cleanup failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
