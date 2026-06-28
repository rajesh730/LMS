import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });
dotenv.config();

// Backfill the authoring-era snapshot (authorSchoolNameSnapshot / authorGrade /
// authorAcademicYear / authorAcademicYearStart) onto writings created before the
// snapshot existed. Idempotent: only touches docs whose snapshot is still empty,
// and never bumps updatedAt. See docs/ACADEMIC_YEAR_AND_PORTFOLIO.md.
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

// Pick the enrollment active for this article: same owning school and the
// authoring date inside [startedAt, endedAt]. Falls back to any enrollment at
// that school.
function pickEnrollment(student, article) {
  const entries = Array.isArray(student?.enrollments) ? student.enrollments : [];
  const atSchool = entries.filter((e) => idStr(e.school) === idStr(article.school));
  if (atSchool.length === 0) return null;

  const when = new Date(article.createdAt || article.publishedAt || Date.now());
  const inWindow = atSchool.find((e) => {
    const start = e.startedAt ? new Date(e.startedAt) : null;
    const end = e.endedAt ? new Date(e.endedAt) : null;
    if (start && when < start) return false;
    if (end && when > end) return false;
    return true;
  });

  return inWindow || atSchool[0];
}

function buildSnapshot(student, article, schoolNameById) {
  const enr = pickEnrollment(student, article);
  if (enr) {
    return {
      authorSchoolNameSnapshot:
        enr.schoolNameSnapshot || schoolNameById.get(idStr(article.school)) || "",
      authorGrade: enr.grade || student.grade || "",
      authorAcademicYear: enr.academicYear || "",
      authorAcademicYearStart: enr.academicYearStart ?? null,
    };
  }
  return {
    authorSchoolNameSnapshot: schoolNameById.get(idStr(article.school)) || "",
    authorGrade: student?.grade || "",
    authorAcademicYear: "",
    authorAcademicYearStart: null,
  };
}

async function backfillAuthorEra(db) {
  const articlesCol = db.collection("schoolmagazinearticles");
  const studentsCol = db.collection("students");
  const usersCol = db.collection("users");

  const articles = await articlesCol
    .find(
      {
        $or: [
          { authorSchoolNameSnapshot: { $exists: false } },
          { authorSchoolNameSnapshot: "" },
        ],
      },
      { projection: { school: 1, authorStudent: 1, createdAt: 1, publishedAt: 1 } }
    )
    .toArray();

  if (articles.length === 0) return { scanned: 0, modified: 0 };

  const studentIds = dedupeIds(articles.map((a) => a.authorStudent));
  const schoolIds = dedupeIds(articles.map((a) => a.school));

  const [students, schools] = await Promise.all([
    studentsCol
      .find(
        { _id: { $in: studentIds } },
        { projection: { grade: 1, school: 1, enrollments: 1 } }
      )
      .toArray(),
    usersCol
      .find({ _id: { $in: schoolIds } }, { projection: { schoolName: 1, name: 1 } })
      .toArray(),
  ]);

  const studentById = new Map(students.map((s) => [idStr(s._id), s]));
  const schoolNameById = new Map(
    schools.map((s) => [idStr(s._id), s.schoolName || s.name || ""])
  );

  const operations = [];
  for (const article of articles) {
    const student = studentById.get(idStr(article.authorStudent));
    if (!student) continue;
    operations.push({
      updateOne: {
        filter: { _id: article._id },
        update: { $set: buildSnapshot(student, article, schoolNameById) },
      },
    });
  }

  if (operations.length === 0) return { scanned: articles.length, modified: 0 };
  const result = await articlesCol.bulkWrite(operations);
  return { scanned: articles.length, modified: result.modifiedCount || 0 };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required for backfill.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
  });

  const { scanned, modified } = await backfillAuthorEra(mongoose.connection.db);

  await mongoose.disconnect();
  console.log(
    `Author-era backfill complete. Articles scanned: ${scanned}. Updated: ${modified}.`
  );
}

main().catch(async (error) => {
  console.error("Author-era backfill failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
