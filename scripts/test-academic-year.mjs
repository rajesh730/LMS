/**
 * Integration test for the academic-year + transfer system.
 * Runs against an ISOLATED scratch database (dbName override) so real data is
 * never touched. Drops the scratch DB at the end.
 *
 *   node scripts/test-academic-year.mjs
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";
import Student from "../models/Student.js";
import SchoolConfig from "../models/SchoolConfig.js";
import AcademicYear from "../models/AcademicYear.js";
import Achievement from "../models/Achievement.js";
import StudentTransfer from "../models/StudentTransfer.js";
import {
  getOrderedGrades,
  getGradeNumber,
  getNextGrade,
  nextAcademicYear,
} from "../lib/academicYear.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const SCRATCH_DB = "pravyo_aytest_scratch";

// ── tiny test harness ──────────────────────────────────────────────
let passed = 0;
let failed = 0;
function check(label, cond) {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}`);
  }
}
function section(title) {
  console.log(`\n=== ${title} ===`);
}

// ── enrollment helpers (mirror lib/studentEnrollment.js) ───────────
function makeEnrollmentEntry({
  school,
  schoolName = "",
  grade = "",
  rollNumber = "",
  academicYear = null,
  startedAt = new Date(),
}) {
  return {
    school,
    schoolNameSnapshot: schoolName || "",
    grade: grade || "",
    rollNumber: rollNumber ? String(rollNumber) : "",
    academicYear: academicYear?.year || "",
    academicYearStart: academicYear?.yearStart ?? null,
    status: "CURRENT",
    startedAt,
    endedAt: null,
  };
}
function closeCurrentEnrollments(student, status, endedAt = new Date()) {
  (student.enrollments || []).forEach((entry) => {
    if (entry.status === "CURRENT") {
      entry.status = status;
      entry.endedAt = endedAt;
    }
  });
}

async function resolveOrderedGrades(schoolId) {
  const [config, distinctGrades] = await Promise.all([
    SchoolConfig.findOne({ school: schoolId }).select("grades").lean(),
    Student.distinct("grade", {
      school: schoolId,
      isDeleted: { $ne: true },
      status: { $in: ["ACTIVE", "SUSPENDED"] },
    }),
  ]);
  return getOrderedGrades([...(config?.grades || []), ...(distinctGrades || [])]);
}

// ── promotion (mirror app/api/school/academic-year/promote POST) ───
async function promoteSchool(schoolId, schoolName, retainIds = []) {
  const retainSet = new Set(retainIds.map(String));
  const current = await AcademicYear.findOne({ school: schoolId, status: "ACTIVE" });
  const orderedGrades = await resolveOrderedGrades(schoolId);
  const next = nextAcademicYear({
    yearStart: current.yearStart,
    calendar: current.calendar,
  });

  const students = await Student.find({
    school: schoolId,
    status: "ACTIVE",
    isDeleted: { $ne: true },
  });
  students.sort(
    (a, b) => (getGradeNumber(b.grade) ?? 0) - (getGradeNumber(a.grade) ?? 0)
  );

  const summary = { promoted: 0, retained: 0, graduated: 0 };
  const failures = [];

  for (const student of students) {
    try {
      const isRetained = retainSet.has(String(student._id));
      const nextGrade = getNextGrade(student.grade, orderedGrades);

      if (isRetained) {
        closeCurrentEnrollments(student, "RETAINED");
        student.enrollments.push(
          makeEnrollmentEntry({
            school: schoolId,
            schoolName,
            grade: student.grade,
            rollNumber: student.rollNumber,
            academicYear: next,
          })
        );
        summary.retained += 1;
      } else if (nextGrade === null) {
        closeCurrentEnrollments(student, "GRADUATED");
        student.status = "ALUMNI";
        summary.graduated += 1;
      } else {
        closeCurrentEnrollments(student, "PROMOTED");
        student.grade = nextGrade;
        student.enrollments.push(
          makeEnrollmentEntry({
            school: schoolId,
            schoolName,
            grade: nextGrade,
            rollNumber: student.rollNumber,
            academicYear: next,
          })
        );
        summary.promoted += 1;
      }
      await student.save();
    } catch (err) {
      failures.push({
        name: student.name,
        grade: student.grade,
        roll: student.rollNumber,
        reason: err?.code === 11000 ? "roll conflict" : err.message,
      });
    }
  }

  await AcademicYear.updateOne(
    { _id: current._id },
    {
      $set: {
        status: "CLOSED",
        closedAt: new Date(),
        "summary.promoted": summary.promoted,
        "summary.retained": summary.retained,
        "summary.graduated": summary.graduated,
      },
    }
  );
  await AcademicYear.updateOne(
    { school: schoolId, yearStart: next.yearStart },
    {
      $setOnInsert: {
        school: schoolId,
        year: next.year,
        yearStart: next.yearStart,
        calendar: next.calendar,
        status: "ACTIVE",
        startedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return { summary, failures, next };
}

// ── transfer approve (mirror app/api/students/transfer/[id] PUT) ───
async function approveTransfer(transfer) {
  const student = await Student.findById(transfer.student);
  const toSchoolId = transfer.toSchool;
  const toGrade = transfer.toGrade || student.grade;
  const rollNumber = transfer.toRollNumber || student.rollNumber;

  const rollClash = await Student.findOne({
    school: toSchoolId,
    grade: toGrade,
    rollNumber,
    status: "ACTIVE",
    isDeleted: { $ne: true },
    _id: { $ne: student._id },
  }).select("_id");
  if (rollClash) return { error: "roll clash at target" };

  const toSchool = await User.findById(toSchoolId).select("schoolName name").lean();
  const toYear = await AcademicYear.findOne({ school: toSchoolId, status: "ACTIVE" });

  // unique username per school
  let username = `${student.firstName.toLowerCase()}.t${Date.now() % 100000}`;
  closeCurrentEnrollments(student, "TRANSFERRED");
  student.enrollments.push(
    makeEnrollmentEntry({
      school: toSchoolId,
      schoolName: toSchool?.schoolName || toSchool?.name || "",
      grade: toGrade,
      rollNumber,
      academicYear: toYear,
    })
  );
  student.school = toSchoolId;
  student.grade = toGrade;
  student.rollNumber = rollNumber;
  student.username = username;
  student.status = "ACTIVE";
  await student.save();

  transfer.status = "APPROVED";
  transfer.decidedAt = new Date();
  await transfer.save();
  return { ok: true };
}

// ── test data builders ─────────────────────────────────────────────
let counter = 0;
async function makeSchool(name) {
  const school = await User.create({
    email: `aytest_${Date.now()}_${counter++}@test.local`,
    password: "x",
    role: "SCHOOL_ADMIN",
    schoolName: name,
    status: "APPROVED",
  });
  const grades = Array.from({ length: 10 }, (_, i) => `Grade ${i + 1}`);
  await SchoolConfig.create({ school: school._id, grades, academicCalendar: "AD" });
  await AcademicYear.create({
    school: school._id,
    year: "2025-26",
    yearStart: 2025,
    calendar: "AD",
    status: "ACTIVE",
    startedAt: new Date(),
  });
  return school;
}

async function makeStudent(school, schoolName, { name, grade, roll }) {
  const first = name.split(" ")[0];
  const ay = { year: "2025-26", yearStart: 2025 };
  return Student.create({
    firstName: first,
    lastName: "Test",
    name,
    username: `${first.toLowerCase()}.${grade.replace(/\D/g, "")}.${roll}.${counter++}`,
    password: "x",
    platformStudentId: `STU-2025-${String(100000 + counter++).slice(-6)}`,
    dateOfBirth: new Date("2010-05-15"),
    grade,
    rollNumber: String(roll),
    school: school._id,
    status: "ACTIVE",
    enrollments: [
      makeEnrollmentEntry({
        school: school._id,
        schoolName,
        grade,
        rollNumber: roll,
        academicYear: ay,
      }),
    ],
  });
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI required");
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: SCRATCH_DB,
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`Connected to scratch DB: ${SCRATCH_DB}`);

  // Build the indexes the models declare (validates unique constraints).
  await Promise.all([
    Student.createIndexes(),
    AcademicYear.createIndexes(),
    StudentTransfer.createIndexes(),
    SchoolConfig.createIndexes(),
  ]);

  try {
    section("Setup: two schools, 2025-26 session");
    const orbit = await makeSchool("Orbit English School");
    const next = await makeSchool("Next Public School");
    check("Orbit created", !!orbit);
    check("Next created", !!next);

    // Orbit students
    const asha = await makeStudent(orbit, "Orbit English School", { name: "Asha Rai", grade: "Grade 9", roll: 1 });
    const bikash = await makeStudent(orbit, "Orbit English School", { name: "Bikash KC", grade: "Grade 10", roll: 1 });
    const farhan = await makeStudent(orbit, "Orbit English School", { name: "Farhan Ali", grade: "Grade 10", roll: 2 });
    const chitra = await makeStudent(orbit, "Orbit English School", { name: "Chitra Devi", grade: "Grade 9", roll: 2 });
    const dev = await makeStudent(orbit, "Orbit English School", { name: "Dev Thapa", grade: "Grade 6", roll: 1 });
    const esha = await makeStudent(orbit, "Orbit English School", { name: "Esha Lama", grade: "Grade 7", roll: 1 });
    // Next school has one student (to verify isolation)
    const gita = await makeStudent(next, "Next Public School", { name: "Gita Sharma", grade: "Grade 8", roll: 1 });

    // Asha earns a 2025 chess win at Orbit (must survive a future transfer)
    await Achievement.create({
      school: orbit._id,
      student: asha._id,
      title: "Chess Championship Winner",
      level: "PLATFORM",
      placement: "WINNER",
      awardedAt: new Date("2025-09-10"),
      isPublic: true,
    });

    section("Promotion: Orbit 2025-26 -> 2026-27 (Chitra repeats, Farhan repeats Grade 10)");
    const result = await promoteSchool(orbit._id, "Orbit English School", [
      chitra._id,
      farhan._id,
    ]);
    console.log("  summary:", JSON.stringify(result.summary));
    if (result.failures.length) console.log("  failures:", JSON.stringify(result.failures));

    const ashaAfter = await Student.findById(asha._id).lean();
    const bikashAfter = await Student.findById(bikash._id).lean();
    const farhanAfter = await Student.findById(farhan._id).lean();
    const chitraAfter = await Student.findById(chitra._id).lean();
    const devAfter = await Student.findById(dev._id).lean();
    const eshaAfter = await Student.findById(esha._id).lean();

    check("no promotion failures (roll collisions)", result.failures.length === 0);
    check("Asha promoted Grade 9 -> Grade 10", ashaAfter.grade === "Grade 10" && ashaAfter.status === "ACTIVE");
    check("Asha has new CURRENT enrollment for 2026-27", ashaAfter.enrollments.some((e) => e.status === "CURRENT" && e.academicYearStart === 2026 && e.grade === "Grade 10"));
    check("Asha old enrollment marked PROMOTED", ashaAfter.enrollments.some((e) => e.status === "PROMOTED" && e.academicYearStart === 2025));
    check("Bikash (Grade 10) graduated -> ALUMNI", bikashAfter.status === "ALUMNI");
    check("Bikash enrollment marked GRADUATED, no new CURRENT", bikashAfter.enrollments.some((e) => e.status === "GRADUATED") && !bikashAfter.enrollments.some((e) => e.status === "CURRENT"));
    check("Farhan retained in Grade 10 (failed boards)", farhanAfter.grade === "Grade 10" && farhanAfter.status === "ACTIVE" && farhanAfter.enrollments.some((e) => e.status === "RETAINED"));
    check("Chitra retained in Grade 9", chitraAfter.grade === "Grade 9" && chitraAfter.enrollments.some((e) => e.status === "RETAINED"));
    check("Dev promoted Grade 6 -> Grade 7", devAfter.grade === "Grade 7");
    check("Esha promoted Grade 7 -> Grade 8", eshaAfter.grade === "Grade 8");
    check("summary = 3 promoted, 2 retained, 1 graduated", result.summary.promoted === 3 && result.summary.retained === 2 && result.summary.graduated === 1);

    const orbitYears = await AcademicYear.find({ school: orbit._id }).sort({ yearStart: 1 }).lean();
    check("Orbit has 2025 CLOSED + 2026 ACTIVE", orbitYears.length === 2 && orbitYears[0].status === "CLOSED" && orbitYears[1].status === "ACTIVE");
    check("Orbit 2025 summary frozen", orbitYears[0].summary.graduated === 1 && orbitYears[0].summary.promoted === 3);
    const activeCount = await AcademicYear.countDocuments({ school: orbit._id, status: "ACTIVE" });
    check("exactly one ACTIVE year for Orbit (unique index)", activeCount === 1);

    section("Isolation: Next Public School untouched");
    const gitaAfter = await Student.findById(gita._id).lean();
    const nextYears = await AcademicYear.find({ school: next._id }).lean();
    check("Gita still Grade 8 ACTIVE", gitaAfter.grade === "Grade 8" && gitaAfter.status === "ACTIVE");
    check("Next still on 2025-26 ACTIVE (not promoted)", nextYears.length === 1 && nextYears[0].status === "ACTIVE" && nextYears[0].yearStart === 2025);

    section("Transfer: Asha (now Grade 10 at Orbit) -> Next Public School");
    const transfer = await StudentTransfer.create({
      student: asha._id,
      platformStudentId: ashaAfter.platformStudentId,
      fromSchool: orbit._id,
      toSchool: next._id,
      requestedBy: next._id,
      status: "PENDING",
      toGrade: "Grade 10",
      toRollNumber: "5",
      studentNameSnapshot: "Asha Rai",
    });
    // duplicate pending should be blocked by partial unique index
    let dupBlocked = false;
    try {
      await StudentTransfer.create({
        student: asha._id,
        platformStudentId: ashaAfter.platformStudentId,
        fromSchool: orbit._id,
        toSchool: next._id,
        requestedBy: next._id,
        status: "PENDING",
        toGrade: "Grade 10",
      });
    } catch (e) {
      dupBlocked = e?.code === 11000;
    }
    check("duplicate PENDING transfer blocked (unique index)", dupBlocked);

    const approveRes = await approveTransfer(transfer);
    check("transfer approved", approveRes.ok === true);

    const ashaMoved = await Student.findById(asha._id).lean();
    check("Asha now belongs to Next Public School", String(ashaMoved.school) === String(next._id));
    check("Asha is Grade 10 roll 5 at new school", ashaMoved.grade === "Grade 10" && ashaMoved.rollNumber === "5");
    check("Asha enrollment shows TRANSFERRED at Orbit + CURRENT at Next", ashaMoved.enrollments.some((e) => e.status === "TRANSFERRED" && String(e.school) === String(orbit._id)) && ashaMoved.enrollments.some((e) => e.status === "CURRENT" && String(e.school) === String(next._id)));

    const distinctSchools = new Set(ashaMoved.enrollments.map((e) => String(e.school)));
    check("Asha journey spans 2 schools", distinctSchools.size === 2);

    const ashaAchievements = await Achievement.find({ student: asha._id }).lean();
    check("2025 Orbit chess win still on Asha's profile after transfer", ashaAchievements.length === 1 && String(ashaAchievements[0].school) === String(orbit._id));

    check("Asha removed from Orbit active roster", !(await Student.findOne({ school: orbit._id, _id: asha._id })));
    check("Asha visible in Orbit history via enrollments", !!(await Student.findOne({ "enrollments.school": orbit._id, _id: asha._id })));

    section("RESULTS");
    console.log(`\n${passed} passed, ${failed} failed\n`);
  } finally {
    await mongoose.connection.dropDatabase();
    console.log(`Dropped scratch DB: ${SCRATCH_DB}`);
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("Test run error:", err);
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
