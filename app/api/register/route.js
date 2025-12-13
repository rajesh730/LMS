import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";
import User from "@/models/User";
import Grade from "@/models/Grade";
import SchoolConfig from "@/models/SchoolConfig";

export async function POST(req) {
  try {
    const {
      email,
      password,
      schoolName,
      principalName,
      principalPhone,
      schoolLocation,
      schoolPhone,
      website,
      establishedYear,
      educationLevels,
      schoolConfig,
    } = await req.json();

    // Rate limit by IP to reduce abuse of registration endpoint
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rate = await applyRateLimit({
      key: `register:${ip}`,
      windowMs: 10 * 60 * 1000,
      max: 10,
    });
    if (!rate.ok) {
      return NextResponse.json(
        { message: `Too many attempts. Try again in ${rate.retryAfter}s.` },
        { status: 429 }
      );
    }

    if (
      !email ||
      !password ||
      !schoolName ||
      !principalName ||
      !schoolLocation
    ) {
      return NextResponse.json(
        { message: "Required fields are missing" },
        { status: 400 }
      );
    }

    const strongPassword = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!strongPassword.test(password)) {
      return NextResponse.json(
        {
          message:
            "Password must be at least 8 characters and include a letter and a number.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user/school first
    const newUser = await User.create({
      email,
      password: hashedPassword,
      schoolName,
      role: "SCHOOL_ADMIN",
      status: "PENDING",
      principalName,
      principalPhone,
      schoolLocation,
      schoolPhone,
      website,
      establishedYear,
      educationLevels,
      schoolConfig,
    });

    // Create grades automatically based on education levels
    const gradesToCreate = [];

    // School Level Grades (1 to maxGrade)
    if (educationLevels?.school && schoolConfig?.schoolLevel?.maxGrade) {
      const minGrade = schoolConfig?.schoolLevel?.minGrade || 1;
      const maxGrade = schoolConfig?.schoolLevel?.maxGrade || 10;
      for (let i = minGrade; i <= maxGrade; i++) {
        gradesToCreate.push({
          name: `Grade ${i}`,
          level: "SCHOOL",
          description: `Grade ${i} - School Level`,
          capacity: 40,
          school: newUser._id,
          subjects: schoolConfig?.schoolLevel?.subjects || [],
          teachers: [],
          students: [],
          isActive: true,
        });
      }
    }

    // High School Grades (11-12)
    if (educationLevels?.highSchool) {
      gradesToCreate.push({
        name: "Grade 11",
        level: "HIGH_SCHOOL",
        description: "Grade 11 - Higher Secondary",
        capacity: 35,
        school: newUser._id,
        subjects: schoolConfig?.highSchool?.faculties || [],
        teachers: [],
        students: [],
        isActive: true,
      });

      gradesToCreate.push({
        name: "Grade 12",
        level: "HIGH_SCHOOL",
        description: "Grade 12 - Higher Secondary",
        capacity: 35,
        school: newUser._id,
        subjects: schoolConfig?.highSchool?.faculties || [],
        teachers: [],
        students: [],
        isActive: true,
      });
    }

    // Bachelor Level
    if (educationLevels?.bachelor) {
      gradesToCreate.push({
        name: "Bachelor",
        level: "BACHELOR",
        description: "Bachelor Degree Programs",
        capacity: 50,
        school: newUser._id,
        subjects: schoolConfig?.bachelor?.faculties || [],
        teachers: [],
        students: [],
        isActive: true,
      });
    }

    // Create all grades at once
    if (gradesToCreate.length > 0) {
      await Grade.insertMany(gradesToCreate);
    }

    // Create school configuration with faculties
    await SchoolConfig.findOneAndUpdate(
      { school: newUser._id },
      {
        school: newUser._id,
        teacherRoles: [
          "Class Teacher",
          "Subject Teacher",
          "Sports Teacher",
          "Librarian",
        ],
        educationLevels,
        schoolConfig,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(
      {
        message: "School registered successfully with automatic grade setup",
        gradesCreated: gradesToCreate.length,
        educationLevels: educationLevels,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
