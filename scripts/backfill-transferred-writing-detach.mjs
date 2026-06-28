import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });
dotenv.config();

// Retroactively applies the transfer-detach rule to writing authored by students
// who transferred BEFORE that rule shipped. A piece whose owning school is no
// longer the author's current school must not appear on that school's live
// student wall or the cross-school global wall. Public/portfolio visibility
// (`isPublished`) and any published magazine archive are intentionally left
// intact. Idempotent. See docs/ACADEMIC_YEAR_AND_PORTFOLIO.md.
//
// Uses raw collections (not the Mongoose models) so it runs under plain Node
// without the app's "@/..." path-alias resolution.

const idStr = (v) => (v == null ? "" : String(v));

function dedupeIds(ids) {
  const map = new Map();
  for (const id of ids) {
    if (id != null) map.set(idStr(id), id);
  }
  return [...map.values()];
}

async function detachTransferredWriting(db) {
  const articlesCol = db.collection("schoolmagazinearticles");
  const studentsCol = db.collection("students");

  // Only consider pieces still flagged onto a live school surface.
  const articles = await articlesCol
    .find(
      {
        isDeleted: { $ne: true },
        $or: [{ showOnSchoolWall: true }, { isGlobalWallPublished: true }],
      },
      { projection: { school: 1, authorStudent: 1 } }
    )
    .toArray();

  if (articles.length === 0) return { scanned: 0, detached: 0 };

  const authorIds = dedupeIds(articles.map((a) => a.authorStudent));
  const students = await studentsCol
    .find({ _id: { $in: authorIds } }, { projection: { school: 1 } })
    .toArray();
  const currentSchoolByAuthor = new Map(
    students.map((s) => [idStr(s._id), idStr(s.school)])
  );

  const operations = [];
  for (const article of articles) {
    const currentSchool = currentSchoolByAuthor.get(idStr(article.authorStudent));
    // Author has moved on from the school this piece was written at.
    if (currentSchool && currentSchool !== idStr(article.school)) {
      operations.push({
        updateOne: {
          filter: { _id: article._id },
          update: {
            $set: { showOnSchoolWall: false, isGlobalWallPublished: false },
          },
        },
      });
    }
  }

  if (operations.length === 0) return { scanned: articles.length, detached: 0 };
  const result = await articlesCol.bulkWrite(operations);
  return { scanned: articles.length, detached: result.modifiedCount || 0 };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required for backfill.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
  });

  const { scanned, detached } = await detachTransferredWriting(
    mongoose.connection.db
  );

  await mongoose.disconnect();
  console.log(
    `Transferred-writing detach complete. Live pieces scanned: ${scanned}. Detached: ${detached}.`
  );
}

main().catch(async (error) => {
  console.error("Transferred-writing detach failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
