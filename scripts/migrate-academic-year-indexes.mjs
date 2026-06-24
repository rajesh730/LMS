/**
 * Migrate indexes for the academic-year + transfer feature on the REAL database:
 *  - drop the legacy non-partial student roll index (so the new partial,
 *    ACTIVE-only unique index can build)
 *  - build indexes for Student, AcademicYear, StudentTransfer, SchoolConfig
 *
 *   node scripts/migrate-academic-year-indexes.mjs
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

import Student from "../models/Student.js";
import AcademicYear from "../models/AcademicYear.js";
import StudentTransfer from "../models/StudentTransfer.js";
import SchoolConfig from "../models/SchoolConfig.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`Connected to: ${mongoose.connection.name}`);

  // Drop the legacy non-partial roll index if present.
  try {
    const studentIndexes = await Student.collection.indexes();
    const legacy = studentIndexes.find(
      (ix) =>
        ix.name === "school_1_grade_1_rollNumber_1" &&
        !ix.partialFilterExpression
    );
    if (legacy) {
      await Student.collection.dropIndex("school_1_grade_1_rollNumber_1");
      console.log("Dropped legacy non-partial student roll index.");
    } else {
      console.log("No legacy roll index to drop (already migrated or fresh).");
    }
  } catch (error) {
    console.warn("Roll-index check skipped:", error.message);
  }

  for (const model of [Student, AcademicYear, StudentTransfer, SchoolConfig]) {
    await model.createIndexes();
    console.log(`Ensured indexes for ${model.modelName}`);
  }

  // Show the resulting student indexes for confirmation.
  const finalIndexes = await Student.collection.indexes();
  const rollIndex = finalIndexes.find(
    (ix) => ix.name === "school_1_grade_1_rollNumber_1"
  );
  console.log(
    "Student roll index:",
    rollIndex
      ? JSON.stringify({
          name: rollIndex.name,
          unique: rollIndex.unique,
          partialFilterExpression: rollIndex.partialFilterExpression,
        })
      : "missing"
  );

  await mongoose.disconnect();
  console.log("Migration complete.");
}

main().catch(async (error) => {
  console.error("Migration failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
