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

  const [eventsResult, clubsResult, profilesResult, submissionsResult, showcasesResult] =
    await Promise.all([
      db.collection("events").updateMany({}, { $unset: { categories: "" } }),
      db.collection("clubs").updateMany({}, { $unset: { categories: "" } }),
      db.collection("talentprofiles").updateMany({}, { $unset: { categories: "" } }),
      db.collection("talentsubmissions").updateMany({}, { $unset: { category: "" } }),
      db.collection("schoolshowcaseprofiles").updateMany(
        {},
        {
          $unset: {
            featuredCategories: "",
            "highlightMetrics.activeCategories": "",
          },
        }
      ),
    ]);

  const droppedTalentCategories = await dropCollectionIfExists(db, "talentcategories");

  console.log(
    JSON.stringify(
      {
        eventsModified: eventsResult.modifiedCount,
        clubsModified: clubsResult.modifiedCount,
        talentProfilesModified: profilesResult.modifiedCount,
        talentSubmissionsModified: submissionsResult.modifiedCount,
        showcaseProfilesModified: showcasesResult.modifiedCount,
        droppedTalentCategories,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Failed to remove talent categories:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
