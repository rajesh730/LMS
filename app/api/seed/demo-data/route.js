import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Student from "@/models/Student";
import SchoolConfig from "@/models/SchoolConfig";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import Achievement from "@/models/Achievement";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import bcrypt from "bcryptjs";
import { generatePlatformStudentId } from "@/lib/studentIdentity";
import { buildCertificateCode, buildCertificatePath } from "@/lib/results";

export async function POST() {
  try {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.ENABLE_DEMO_SEED !== "true"
    ) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // 1. Create School Admin
    const email = "demo@school.com";
    let schoolAdmin = await User.findOne({ email });
    
    if (!schoolAdmin) {
        const hashedPassword = await bcrypt.hash("password123", 10);
        schoolAdmin = await User.create({
            email,
            password: hashedPassword,
            role: "SCHOOL_ADMIN",
            schoolName: "Demo International School",
            status: "APPROVED"
        });
        console.log("Created Demo School Admin");
    }

    // 2. Create School Config
    let config = await SchoolConfig.findOne({ school: schoolAdmin._id });
    if (!config) {
        await SchoolConfig.create({
            school: schoolAdmin._id,
            grades: ["Grade 8", "Grade 9", "Grade 10"],
            subjects: ["Math", "Science", "English"]
        });
        console.log("Created School Config");
    }

    // 3. Create 10 Students
    const studentSeeds = [
      ["Aarav", "Shrestha", "Grade 8", "801"],
      ["Saanvi", "Karki", "Grade 8", "802"],
      ["Niraj", "Rai", "Grade 8", "803"],
      ["Prisha", "Thapa", "Grade 9", "901"],
      ["Anish", "Gurung", "Grade 9", "902"],
      ["Mira", "Adhikari", "Grade 9", "903"],
      ["Sujal", "Tamang", "Grade 10", "1001"],
      ["Riya", "Basnet", "Grade 10", "1002"],
      ["Bikash", "Maharjan", "Grade 10", "1003"],
      ["Kriti", "Pandey", "Grade 10", "1004"],
    ];

    const students = [];
    for (const [firstName, lastName, grade, rollNumber] of studentSeeds) {
      const username = `${firstName.toLowerCase()}${rollNumber}`;
      const password = await bcrypt.hash("student123", 10);
      const student = await Student.findOneAndUpdate(
        { school: schoolAdmin._id, grade, rollNumber },
        {
          $setOnInsert: {
            platformStudentId: await generatePlatformStudentId(Student),
            firstName,
            lastName,
            name: `${firstName} ${lastName}`,
            email: `${username}@demo-school.local`,
            username,
            password,
            school: schoolAdmin._id,
            status: "ACTIVE",
          },
        },
        { new: true, upsert: true }
      );
      students.push(student);
    }

    // 4. Create one public singing competition event
    const event = await Event.findOneAndUpdate(
      { title: "Demo Inter-School Singing Competition" },
      {
        $set: {
          description:
            "A pilot singing competition for school-managed registration, verified results, digital certificates, and public showcase review.",
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdBy: session.user.id,
          eventScope: "PLATFORM",
          ownerType: "PLATFORM",
          ownerId: session.user.id,
          eventType: "COMPETITION",
          visibility: "PUBLIC",
          status: "APPROVED",
          lifecycleStatus: "COMPLETED",
          registrationMode: "THROUGH_SCHOOL",
          publicHighlightsEnabled: true,
          featuredOnLanding: true,
          eligibleGrades: ["Grade 8", "Grade 9", "Grade 10"],
          maxParticipants: 50,
          maxParticipantsPerSchool: 5,
          resultsPublished: true,
          publicResultsEnabled: true,
        },
      },
      { new: true, upsert: true }
    );

    // 5. Register 5 students from the school
    const selectedStudents = students.slice(0, 5);
    for (const student of selectedStudents) {
      await ParticipationRequest.findOneAndUpdate(
        { event: event._id, school: schoolAdmin._id, student: student._id },
        {
          $set: {
            status: "APPROVED",
            approvedAt: new Date(),
            approvedBy: session.user.id,
            enrollmentConfirmedAt: new Date(),
            contactPerson: "Demo Coordinator",
            contactPhone: "9800000000",
          },
        },
        { new: true, upsert: true }
      );
    }

    // 6. Publish results and certificates
    const placements = [
      "WINNER",
      "RUNNER_UP",
      "THIRD_PLACE",
      "PARTICIPANT",
      "PARTICIPANT",
    ];
    await Achievement.deleteMany({ event: event._id, school: schoolAdmin._id });
    const now = new Date();
    const achievements = selectedStudents.map((student, index) => {
      const achievementId = new Achievement()._id;
      return {
        _id: achievementId,
        school: schoolAdmin._id,
        student: student._id,
        event: event._id,
        title: `${placements[index].replaceAll("_", " ")} - ${event.title}`,
        description:
          placements[index] === "PARTICIPANT"
            ? `${student.name} participated in the demo singing competition.`
            : `${student.name} earned ${placements[index].replaceAll("_", " ").toLowerCase()} in the demo singing competition.`,
        level: "PLATFORM",
        placement: placements[index],
        certificateCode: buildCertificateCode(achievementId, now),
        certificateIssuedAt: now,
        certificateUrl: buildCertificatePath(achievementId),
        isPublic: true,
        awardedAt: now,
      };
    });
    await Achievement.insertMany(achievements);

    // 7. Make the school showcase public
    await SchoolShowcaseProfile.findOneAndUpdate(
      { school: schoolAdmin._id },
      {
        $set: {
          tagline: "Recognizing student confidence through verified inter-school events.",
          summary:
            "Demo International School uses Pratyo to register students for verified competitions, publish trusted results, and share certificate-backed achievements with the community.",
          visibility: "PUBLIC",
          featuredEvents: [event._id],
          publicHighlights: [
            "5 students registered for the singing competition pilot.",
            "Published certificate-backed results for market feedback.",
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

    return NextResponse.json({
      message: "Seed successful",
      schoolId: schoolAdmin._id,
      eventId: event._id,
      studentsCreatedOrUpdated: students.length,
      registeredStudents: selectedStudents.length,
      certificatesIssued: achievements.length,
    });
  } catch (error) {
    console.error("Seed Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
