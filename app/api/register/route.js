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

    console.log("=== REGISTRATION API RECEIVED ===");
    console.log("Email:", email);
    console.log("Password:", password ? "***" : "MISSING");
    console.log("School Name:", schoolName);
    console.log("Principal Name:", principalName);
    console.log("School Location:", schoolLocation);
    console.log("Education Levels:", educationLevels);
    console.log("School Config:", schoolConfig);
    console.log("================================");

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
      console.error("VALIDATION FAILED - Missing required fields:");
      console.error("  email:", !!email, email);
      console.error("  password:", !!password);
      console.error("  schoolName:", !!schoolName, schoolName);
      console.error("  principalName:", !!principalName, principalName);
      console.error("  schoolLocation:", !!schoolLocation, schoolLocation);
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

    console.log("Creating user with data:", {
      email,
      schoolName,
      principalName,
      schoolLocation,
      educationLevels,
      schoolConfig,
    });

    // Create the user/school first
    let newUser;
    try {
      console.log("BEFORE CREATE - schoolConfig being sent:", JSON.stringify(schoolConfig, null, 2));
      
      newUser = await User.create({
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
      
      console.log("✓ User created successfully:", newUser._id);
      console.log("AFTER CREATE - saved schoolConfig:", JSON.stringify(newUser.schoolConfig, null, 2));
      console.log("Full saved document:", JSON.stringify(newUser.toObject(), null, 2));
    } catch (userError) {
      console.error("❌ User creation failed:", userError.message);
      throw userError;
    }

    // Create grades automatically based on education levels
    const gradesToCreate = [];

    // School Level Grades (minGrade to maxGrade)
    if (educationLevels?.school && schoolConfig?.schoolLevel) {
      const minGrade = schoolConfig.schoolLevel.minGrade || 1;
      const maxGrade = schoolConfig.schoolLevel.maxGrade || 10;
      for (let i = minGrade; i <= maxGrade; i++) {
        gradesToCreate.push({
          name: `Grade ${i}`,
          level: "SCHOOL",
          description: `Grade ${i} - School Level`,
          capacity: 40,
          school: newUser._id,
          subjects: [],
          teachers: [],
          students: [],
          isActive: true,
        });
      }
    }
    if (gradesToCreate.length > 0) {
      try {
        const createdGrades = await Grade.insertMany(gradesToCreate);
        console.log(`✓ Created ${createdGrades.length} grades for school ${newUser._id}`);
      } catch (gradeError) {
        console.error("❌ Grade creation failed:", gradeError.message);
        throw gradeError;
      }
    }

    // Create school configuration with faculties
    await SchoolConfig.findOneAndUpdate(
      { school: newUser._id },
      {
        school: newUser._id,
        teacherRoles: [
          "Subject Teacher",
          "Sports Teacher",
          "Librarian",
        ],
        educationLevels,
        schoolConfig,
      },
      { upsert: true, new: true }
    );

    console.log("=== REGISTRATION SUCCESSFUL ===");
    console.log("User created:", newUser.email);
    console.log("Grades created:", gradesToCreate.length);
    console.log("================================");

    return NextResponse.json(
      {
        message: "School registered successfully with automatic grade setup",
        gradesCreated: gradesToCreate.length,
        educationLevels: educationLevels,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("=== REGISTRATION ERROR ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    if (error.errors) {
      console.error("Validation errors:", error.errors);
    }
    console.error("================================");
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
