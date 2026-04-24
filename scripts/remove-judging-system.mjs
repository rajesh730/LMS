import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/egrantha";

async function dropCollectionIfExists(db, name) {
  const collections = await db.listCollections({ name }).toArray();
  if (collections.length > 0) {
    await db.dropCollection(name);
    return true;
  }
  return false;
}

async function main() {
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });

  const { db } = mongoose.connection;

  const [eventsResult, submissionsResult] = await Promise.all([
    db.collection("events").updateMany(
      {},
      {
        $unset: {
          judgingCriteria: "",
          judgeUsers: "",
          judgeTeachers: "",
        },
      }
    ),
    db.collection("talentsubmissions").updateMany(
      {},
      {
        $unset: {
          judgingStatus: "",
        },
      }
    ),
  ]);

  const droppedScorecards = await dropCollectionIfExists(db, "scorecards");

  console.log(
    JSON.stringify(
      {
        eventsModified: eventsResult.modifiedCount,
        talentSubmissionsModified: submissionsResult.modifiedCount,
        droppedScorecards,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Failed to remove judging system:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
