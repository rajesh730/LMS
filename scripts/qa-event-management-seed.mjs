import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });

const { default: connectDB } = await import("../lib/db.js");
const { default: User } = await import("../models/User.js");
const { default: Student } = await import("../models/Student.js");
const { default: SchoolConfig } = await import("../models/SchoolConfig.js");
const { default: Event } = await import("../models/Event.js");
const { default: ParticipationRequest } = await import("../models/ParticipationRequest.js");
const { default: EventRound } = await import("../models/EventRound.js");
const { default: RoundParticipant } = await import("../models/RoundParticipant.js");
const { default: RoundSubmission } = await import("../models/RoundSubmission.js");
const { default: EventNotice } = await import("../models/EventNotice.js");
const { default: Achievement } = await import("../models/Achievement.js");
const { generatePlatformStudentId } = await import("../lib/studentIdentity.js");

function daysFromNow(days) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  next.setHours(10, 0, 0, 0);
  return next;
}

async function upsertUser(filter, data, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate(
    filter,
    {
      $set: {
        ...data,
        password: hashedPassword,
      },
    },
    { new: true, upsert: true }
  );
}

await connectDB();

const qaAdmin = await upsertUser(
  { email: "qa-superadmin@egrantha.local" },
  {
    email: "qa-superadmin@egrantha.local",
    role: "SUPER_ADMIN",
    name: "QA Super Admin",
    status: "APPROVED",
  },
  "password123"
);

const school = await upsertUser(
  { email: "qa-school@eventflow.local" },
  {
    email: "qa-school@eventflow.local",
    role: "SCHOOL_ADMIN",
    schoolName: "Orbit English Secondary School",
    principalName: "Rajesh Raj Pandey",
    principalPhone: "9863777171",
    schoolPhone: "9863777171",
    schoolLocation: "Kathmandu, Nepal",
    status: "APPROVED",
    educationLevels: { school: true },
    schoolConfig: { schoolLevel: { minGrade: 1, maxGrade: 10 } },
  },
  "password123"
);

await SchoolConfig.findOneAndUpdate(
  { school: school._id },
  {
    $set: {
      school: school._id,
      grades: ["Grade 9", "Grade 10"],
      teacherRoles: ["Mentor", "Events Coordinator"],
    },
  },
  { upsert: true, new: true }
);

const studentSeeds = [
  ["Raj", "Pandey", "Grade 9", "901"],
  ["Rajesh Raj", "Pandey", "Grade 10", "1001"],
];

const students = [];
for (const [firstName, lastName, grade, rollNumber] of studentSeeds) {
  const username = `qa${firstName.toLowerCase().replace(/\s+/g, "")}${rollNumber}`;
  const password = await bcrypt.hash("student123", 10);
  const student = await Student.findOneAndUpdate(
    { school: school._id, grade, rollNumber },
    {
      $setOnInsert: {
        platformStudentId: await generatePlatformStudentId(Student),
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email: `${username}@eventflow.local`,
        username,
        password,
        school: school._id,
      },
      $set: {
        status: "ACTIVE",
        grade,
      },
    },
    { upsert: true, new: true }
  );
  students.push(student);
}

const event = await Event.findOneAndUpdate(
  { title: "QA Singing Event Flow" },
  {
    $set: {
      title: "QA Singing Event Flow",
      description:
        "QA event for participants, rounds, notices, and certificate publishing.",
      date: daysFromNow(10),
      registrationDeadline: daysFromNow(4),
      createdBy: qaAdmin._id,
      eventScope: "PLATFORM",
      ownerType: "PLATFORM",
      ownerId: qaAdmin._id,
      eventType: "COMPETITION",
      visibility: "PUBLIC",
      registrationMode: "THROUGH_SCHOOL",
      publicHighlightsEnabled: true,
      partnerBrandingEnabled: false,
      status: "APPROVED",
      lifecycleStatus: "ACTIVE",
      resultsPublished: false,
      publicResultsEnabled: false,
      eligibleGrades: ["Grade 9", "Grade 10"],
      maxParticipants: 20,
      maxParticipantsPerSchool: 5,
      participants: [
        {
          school: school._id,
          joinedAt: new Date(),
          contactPerson: "Rajesh Raj Pandey",
          contactPhone: "9863777171",
          expectedStudents: students.length,
          notes: "QA registration seed",
          students: students.map((student) => student._id),
        },
      ],
    },
  },
  { upsert: true, new: true }
);

await Promise.all([
  ParticipationRequest.deleteMany({ event: event._id }),
  EventRound.deleteMany({ event: event._id }),
  RoundParticipant.deleteMany({ event: event._id }),
  RoundSubmission.deleteMany({ event: event._id }),
  EventNotice.deleteMany({ event: event._id }),
  Achievement.deleteMany({ event: event._id }),
]);

for (const student of students) {
  await ParticipationRequest.create({
    student: student._id,
    event: event._id,
    school: school._id,
    status: "APPROVED",
    requestedAt: new Date(),
    approvedAt: new Date(),
    approvedBy: qaAdmin._id,
    enrollmentConfirmedAt: new Date(),
    studentNotifiedAt: new Date(),
    contactPerson: "Rajesh Raj Pandey",
    contactPhone: "9863777171",
    notes: "QA registration seed",
  });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      eventId: event._id.toString(),
      schoolId: school._id.toString(),
      studentIds: students.map((student) => student._id.toString()),
      accounts: {
        superAdmin: "qa-superadmin@egrantha.local / password123",
        schoolAdmin: "qa-school@eventflow.local / password123",
      },
    },
    null,
    2
  )
);

await mongoose.connection.close();
