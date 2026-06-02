import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });
dotenv.config();

const REMOVED_COLLECTIONS = [
  "platformchallenges",
  "platformchallengesubmissions",
  "publicfeedreactions",
];

async function deleteCollectionData(db, name) {
  const exists = await db.listCollections({ name }).hasNext();
  if (!exists) return `${name}: collection not found`;

  const result = await db.collection(name).deleteMany({});
  return `${name}: deleted ${result.deletedCount}`;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required to remove retired Pulse data.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
  });

  const db = mongoose.connection.db;
  const results = [];

  for (const collection of REMOVED_COLLECTIONS) {
    results.push(await deleteCollectionData(db, collection));
  }

  const seenExists = await db
    .listCollections({ name: "usersurfaceseenstates" })
    .hasNext();
  if (seenExists) {
    const result = await db.collection("usersurfaceseenstates").deleteMany({
      surface: {
        $in: ["student.pratyoPulse", "school.pratyoPulse", "admin.challenges"],
      },
    });
    results.push(
      `usersurfaceseenstates: deleted ${result.deletedCount} retired surface states`
    );
  }

  const articlesExists = await db
    .listCollections({ name: "schoolmagazinearticles" })
    .hasNext();
  if (articlesExists) {
    const result = await db.collection("schoolmagazinearticles").deleteMany({
      submissionSource: "PLATFORM_CHALLENGE",
    });
    results.push(
      `schoolmagazinearticles: deleted ${result.deletedCount} retired challenge articles`
    );
  }

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
