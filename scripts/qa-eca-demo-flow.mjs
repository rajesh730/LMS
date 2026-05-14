import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });

const { default: connectDB } = await import("../lib/db.js");
const { default: User } = await import("../models/User.js");
const { default: SchoolConfig } = await import("../models/SchoolConfig.js");
const { default: Student } = await import("../models/Student.js");
const { default: ExternalOrganizer } = await import("../models/ExternalOrganizer.js");
const { default: EventProposal } = await import("../models/EventProposal.js");
const { default: Event } = await import("../models/Event.js");
const { default: EventSchoolInvitation } = await import("../models/EventSchoolInvitation.js");
const { default: ParticipationRequest } = await import("../models/ParticipationRequest.js");
const { default: Achievement } = await import("../models/Achievement.js");
const { default: SchoolShowcaseProfile } = await import("../models/SchoolShowcaseProfile.js");
const { generatePlatformStudentId } = await import("../lib/studentIdentity.js");
const {
  buildCertificateCode,
  buildCertificatePath,
} = await import("../lib/results.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(10, 0, 0, 0);
  return date;
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
  { email: "qa-school@singing-demo.local" },
  {
    email: "qa-school@singing-demo.local",
    role: "SCHOOL_ADMIN",
    schoolName: "QA Valley School",
    principalName: "Anita Sharma",
    principalPhone: "9800000001",
    schoolPhone: "01-5550001",
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
      grades: ["Grade 8", "Grade 9", "Grade 10"],
      teacherRoles: ["Mentor", "Club Lead", "Events Coordinator"],
    },
  },
  { new: true, upsert: true }
);

const organizer = await ExternalOrganizer.findOneAndUpdate(
  { slug: "eca-academy" },
  {
    $set: {
      organizationName: "ECA Academy",
      slug: "eca-academy",
      organizationType: "ACADEMY",
      partnerRoles: ["ORGANIZER_PARTNER"],
      description:
        "ECA Academy runs student extracurricular competitions and performance showcases.",
      website: "https://eca-academy.example",
      location: "Kathmandu",
      contactName: "Ramesh Karki",
      contactEmail: "events@eca-academy.example",
      contactPhone: "9800000002",
      verificationStatus: "VERIFIED",
      profileVisibility: "PUBLIC",
      trustLevel: "APPROVED_PARTNER",
    },
  },
  { new: true, upsert: true }
);

const proposal = await EventProposal.findOneAndUpdate(
  {
    organizationName: "ECA Academy",
    eventTitle: "ECA Inter-School Singing Competition",
  },
  {
    $set: {
      organizationName: "ECA Academy",
      organizationType: "ACADEMY",
      website: "https://eca-academy.example",
      location: "Kathmandu",
      contactName: "Ramesh Karki",
      contactEmail: "events@eca-academy.example",
      contactPhone: "9800000002",
      eventTitle: "ECA Inter-School Singing Competition",
      eventDescription:
        "A school-managed singing competition with audition, final performance, verified result publication, and digital certificates.",
      proposedRoles: ["ORGANIZER_PARTNER"],
      targetGrades: ["Grade 8", "Grade 9", "Grade 10"],
      expectedSchools: 5,
      expectedStudents: 50,
      preferredDate: daysFromNow(14),
      eventMode: "ONSITE",
      venue: "ECA Academy Hall",
      prizeDetails: "Winner, runner-up, third-place certificates and trophies.",
      dataAccessNeeds:
        "Only school-approved participant names, grades, and result data.",
      safetyNotes:
        "Schools control student registration and public visibility. Guardians are informed by schools.",
      status: "CONVERTED_TO_EVENT",
      organizer: organizer._id,
      reviewedBy: qaAdmin._id,
      reviewedAt: new Date(),
      adminNotes: "QA approved for demo flow.",
    },
  },
  { new: true, upsert: true }
);

const event = await Event.findOneAndUpdate(
  { title: "ECA Inter-School Singing Competition" },
  {
    $set: {
      title: "ECA Inter-School Singing Competition",
      description:
        "A partner-backed singing competition organized by ECA Academy, with school opt-in, school-managed student registration, and public certificate-backed results.",
      date: daysFromNow(14),
      registrationDeadline: daysFromNow(7),
      createdBy: qaAdmin._id,
      targetGroup: null,
      school: null,
      eventScope: "PLATFORM",
      ownerType: "PLATFORM",
      ownerId: qaAdmin._id,
      eventType: "COMPETITION",
      visibility: "PUBLIC",
      registrationMode: "THROUGH_SCHOOL",
      featuredOnLanding: true,
      isTalentFocused: true,
      publicHighlightsEnabled: true,
      publicResultsEnabled: true,
      partnerBrandingEnabled: true,
      partners: [
        {
          organizer: organizer._id,
          role: "ORGANIZER_PARTNER",
          displayName: "ECA Academy",
          website: "https://eca-academy.example",
          isPrimary: true,
        },
      ],
      sourceProposal: proposal._id,
      status: "APPROVED",
      lifecycleStatus: "COMPLETED",
      resultsPublished: true,
      eligibleGrades: ["Grade 8", "Grade 9", "Grade 10"],
      maxParticipants: 50,
      maxParticipantsPerSchool: 5,
      scorecardCriteria: [
        { label: "Vocal Quality", maxScore: 40 },
        { label: "Expression", maxScore: 30 },
        { label: "Stage Presence", maxScore: 30 },
      ],
    },
  },
  { new: true, upsert: true }
);

await EventProposal.findByIdAndUpdate(proposal._id, {
  linkedEvent: event._id,
});

await EventSchoolInvitation.findOneAndUpdate(
  { event: event._id, school: school._id },
  {
    $set: {
      event: event._id,
      school: school._id,
      status: "APPROVED",
      notifiedAt: new Date(),
      readAt: new Date(),
      decisionAt: new Date(),
      decisionBy: school._id,
      eventTitleSnapshot: event.title,
      createdBy: qaAdmin._id,
    },
  },
  { new: true, upsert: true }
);

const studentSeeds = [
  ["Aarav", "Shrestha", "Grade 8", "801", "WINNER", 95],
  ["Prisha", "Thapa", "Grade 9", "901", "RUNNER_UP", 91],
  ["Riya", "Basnet", "Grade 10", "1002", "THIRD_PLACE", 88],
  ["Mira", "Adhikari", "Grade 9", "903", "PARTICIPANT", 82],
  ["Saanvi", "Karki", "Grade 8", "802", "PARTICIPANT", 79],
];

const students = [];
for (const [firstName, lastName, grade, rollNumber] of studentSeeds) {
  const username = `qa${firstName.toLowerCase()}${rollNumber}`;
  const password = await bcrypt.hash("student123", 10);
  const student = await Student.findOneAndUpdate(
    { school: school._id, grade, rollNumber },
    {
      $setOnInsert: {
        platformStudentId: await generatePlatformStudentId(Student),
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email: `${username}@singing-demo.local`,
        username,
        password,
        school: school._id,
      },
      $set: {
        grade,
        status: "ACTIVE",
      },
    },
    { new: true, upsert: true }
  );
  students.push(student);
}

await ParticipationRequest.deleteMany({ event: event._id, school: school._id });

for (const student of students) {
  await ParticipationRequest.create({
    student: student._id,
    event: event._id,
    school: school._id,
    status: "APPROVED",
    requestedAt: new Date(),
    approvedAt: new Date(),
    approvedBy: school._id,
    enrollmentConfirmedAt: new Date(),
    studentNotifiedAt: new Date(),
    contactPerson: "QA School Coordinator",
    contactPhone: "9800000003",
    notes: "QA singing competition registration",
  });
}

event.participants = [
  {
    school: school._id,
    joinedAt: new Date(),
    contactPerson: "QA School Coordinator",
    contactPhone: "9800000003",
    expectedStudents: students.length,
    notes: "QA singing competition registration",
    students: students.map((student) => student._id),
  },
];
await event.save();

await Achievement.deleteMany({ event: event._id, school: school._id });

const now = new Date();
const achievements = [];
for (const [index, student] of students.entries()) {
  const [, , , , placement, totalScore] = studentSeeds[index];
  const achievementId = new mongoose.Types.ObjectId();
  const scorecard = [
    { label: "Vocal Quality", maxScore: 40, score: Math.round(totalScore * 0.4) },
    { label: "Expression", maxScore: 30, score: Math.round(totalScore * 0.3) },
    { label: "Stage Presence", maxScore: 30, score: Math.round(totalScore * 0.3) },
  ];

  achievements.push({
    _id: achievementId,
    school: school._id,
    student: student._id,
    event: event._id,
    submission: null,
    title: `${placement.replaceAll("_", " ")} - ${event.title}`,
    description:
      placement === "PARTICIPANT"
        ? `${student.name} participated in the ECA Academy singing competition.`
        : `${student.name} earned ${placement
            .replaceAll("_", " ")
            .toLowerCase()} in the ECA Academy singing competition.`,
    level: "PLATFORM",
    placement,
    scorecard,
    totalScore,
    scorePercentage: totalScore,
    certificateCode: buildCertificateCode(achievementId, now),
    certificateIssuedAt: now,
    certificateUrl: buildCertificatePath(achievementId),
    isPublic: true,
    awardedAt: now,
  });
}

await Achievement.insertMany(achievements);

await SchoolShowcaseProfile.findOneAndUpdate(
  { school: school._id },
  {
    $set: {
      tagline: "Building confidence through verified stage performance.",
      summary:
        "QA Valley School joined the ECA Academy singing competition through a school-managed participation workflow and now has certificate-backed public results.",
      visibility: "PUBLIC",
      featuredEvents: [event._id],
      publicHighlights: [
        "5 students represented the school in the ECA Academy singing competition.",
        "Aarav Shrestha won the singing competition with a verified digital certificate.",
      ],
      highlightMetrics: {
        eventsHosted: 0,
        eventsParticipated: 1,
        awardsCount: achievements.length,
        studentParticipationRate: 50,
      },
    },
  },
  { new: true, upsert: true }
);

const winner = await Achievement.findOne({
  event: event._id,
  placement: "WINNER",
})
  .populate("student", "name grade")
  .populate("school", "schoolName")
  .populate("event", "title visibility resultsPublished")
  .lean();

const publicEvent = await Event.findOne({
  _id: event._id,
  visibility: "PUBLIC",
  status: "APPROVED",
  lifecycleStatus: { $ne: "ARCHIVED" },
  resultsPublished: true,
}).lean();

const publicResults = await Achievement.find({
  event: event._id,
  isPublic: true,
  certificateIssuedAt: { $ne: null },
}).lean();

assert(proposal.linkedEvent?.toString() === event._id.toString(), "Proposal did not link to event");
assert(publicEvent, "Public event is not visible with published results");
assert(publicResults.length === achievements.length, "Public result count mismatch");
assert(winner, "Winner was not created");
assert(winner.certificateUrl, "Winner certificate URL missing");
assert(winner.certificateIssuedAt, "Winner certificate issue date missing");

console.log(
  JSON.stringify(
    {
      ok: true,
      flow: "ECA Academy request -> platform event -> school opt-in -> student registration -> winner -> certificate",
      organizer: organizer.organizationName,
      proposalId: proposal._id.toString(),
      eventId: event._id.toString(),
      eventUrl: `/events/${event._id}`,
      schoolId: school._id.toString(),
      registeredStudents: students.length,
      publicResults: publicResults.length,
      winner: {
        name: winner.student?.name,
        grade: winner.student?.grade,
        school: winner.school?.schoolName,
        placement: winner.placement,
        certificateCode: winner.certificateCode,
        certificateUrl: winner.certificateUrl,
      },
      demoAccounts: {
        superAdmin: "qa-superadmin@egrantha.local / password123",
        schoolAdmin: "qa-school@singing-demo.local / password123",
        student: `${students[0].username} / student123`,
      },
    },
    null,
    2
  )
);

await mongoose.connection.close();
