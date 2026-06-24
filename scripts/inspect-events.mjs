/** Read-only: list events with scope + participant counts (raw collections). */
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  console.log("DB:", mongoose.connection.name, "\n");

  const events = await db
    .collection("events")
    .find({})
    .project({ title: 1, eventScope: 1, status: 1, lifecycleStatus: 1, date: 1, resultsPublished: 1 })
    .sort({ createdAt: -1 })
    .limit(40)
    .toArray();

  for (const e of events) {
    const count = await db.collection("participationrequests").countDocuments({
      event: e._id,
      status: { $in: ["APPROVED", "ENROLLED"] },
    });
    console.log(
      `${String(e.eventScope || "UNSET").padEnd(9)} | parts:${String(count).padStart(3)} | ${
        e.resultsPublished ? "PUB " : "draft"
      } | ${e.date ? new Date(e.date).toLocaleDateString() : "no-date"} | ${e.title}`
    );
  }

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
