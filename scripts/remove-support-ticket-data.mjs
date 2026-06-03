import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function deleteCollectionData(db, name) {
  const exists = await db.listCollections({ name }).hasNext();
  if (!exists) return `${name}: collection not found`;

  await db.collection(name).drop();
  return `${name}: collection dropped`;
}

async function unsetLegacySettings(db) {
  const exists = await db.listCollections({ name: "platformsettings" }).hasNext();
  if (!exists) return "platformsettings: collection not found";

  const result = await db
    .collection("platformsettings")
    .updateMany({}, { $unset: { "defaults.allowSupportTickets": "" } });

  return `platformsettings: removed legacy support setting from ${result.modifiedCount}`;
}

async function removeLegacyIndicators(db) {
  const exists = await db
    .listCollections({ name: "usersurfaceseenstates" })
    .hasNext();
  if (!exists) return "usersurfaceseenstates: collection not found";

  const result = await db.collection("usersurfaceseenstates").deleteMany({
    surface: { $in: ["admin.support", "school.support"] },
  });

  return `usersurfaceseenstates: deleted ${result.deletedCount} legacy support states`;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is required to remove retired support ticket data."
    );
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
  });

  const db = mongoose.connection.db;
  const results = [];

  results.push(await deleteCollectionData(db, "supporttickets"));
  results.push(await unsetLegacySettings(db));
  results.push(await removeLegacyIndicators(db));

  console.log(results.join("\n"));
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
