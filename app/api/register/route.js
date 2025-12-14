import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";
import User from "@/models/User";
import Grade from "@/models/Grade";
import SchoolConfig from "@/models/SchoolConfig";
import Faculty from "@/models/Faculty";

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

    // High School Grades (11-12)
    if (educationLevels?.highSchool) {
      gradesToCreate.push({
        name: "Grade 11",
        level: "HIGH_SCHOOL",
        description: "Grade 11 - Higher Secondary",
        capacity: 35,
        school: newUser._id,
        subjects: [],
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
        subjects: [],
        teachers: [],
        students: [],
        isActive: true,
      });
    }

    // Bachelor Level
    if (educationLevels?.bachelor) {
      const startYear = schoolConfig?.bachelor?.startingYear || 1;
      const endYear = schoolConfig?.bachelor?.endingYear || 4;
      const totalYears = endYear - startYear + 1;
      
      if (schoolConfig?.bachelor?.hasSemesters) {
        // Create semesters (2 per year)
        const totalSemesters = totalYears * 2;
        for (let i = 1; i <= totalSemesters; i++) {
          gradesToCreate.push({
            name: `Semester ${i}`,
            level: "BACHELOR",
            description: `Semester ${i} - Bachelor Level`,
            capacity: 50,
            school: newUser._id,
            subjects: [],
            teachers: [],
            students: [],
            isActive: true,
          });
        }
      } else {
        // Create year-based structure
        for (let i = startYear; i <= endYear; i++) {
          gradesToCreate.push({
            name: `Year ${i}`,
            level: "BACHELOR",
            description: `Year ${i} - Bachelor Level`,
            capacity: 50,
            school: newUser._id,
            subjects: [],
            teachers: [],
            students: [],
            isActive: true,
          });
        }
      }
    }

    // Create all grades at once
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

    // AUTO-CREATE FACULTIES from schoolConfig
    const facultiesToCreate = [];

    // Parse high school faculties
    if (educationLevels?.highSchool && schoolConfig?.highSchool?.faculties) {
      const faculties = schoolConfig.highSchool.faculties
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      console.log(`Processing ${faculties.length} high school faculties:`, faculties);

      faculties.forEach(faculty => {
        facultiesToCreate.push({
          name: faculty,
          normalizedName: faculty.toLowerCase().trim().replace(/\s+/g, ' '),
          school: newUser._id,
          educationLevels: ['HigherSecondary'],
          status: 'ACTIVE',
          createdBy: newUser._id,
        });
      });
    }

    // Parse bachelor faculties
    if (educationLevels?.bachelor && schoolConfig?.bachelor?.faculties) {
      const faculties = schoolConfig.bachelor.faculties
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      console.log(`Processing ${faculties.length} bachelor faculties:`, faculties);

      faculties.forEach(faculty => {
        facultiesToCreate.push({
          name: faculty,
          normalizedName: faculty.toLowerCase().trim().replace(/\s+/g, ' '),
          school: newUser._id,
          educationLevels: ['Bachelor'],
          status: 'ACTIVE',
          createdBy: newUser._id,
        });
      });
    }

    // Create faculties (avoiding duplicates)
    if (facultiesToCreate.length > 0) {
      console.log(`Creating ${facultiesToCreate.length} total faculties...`);
      try {
        const createdFaculties = await Faculty.insertMany(facultiesToCreate, { ordered: false });
        console.log(`✓ Successfully created ${createdFaculties.length} faculties for school ${newUser._id}`);
      } catch (error) {
        // Ignore duplicate key errors (some faculties might already exist)
        if (error.code !== 11000) {
          console.error('❌ Faculty creation error:', error.message);
          throw error;
        } else {
          console.log('⚠ Some faculties already existed, skipped duplicates');
        }
      }
    } else {
      console.log('ℹ No faculties configured for this school');
    }

    console.log("=== REGISTRATION SUCCESSFUL ===");
    console.log("User created:", newUser.email);
    console.log("Grades created:", gradesToCreate.length);
    console.log("Faculties created:", facultiesToCreate.length);
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
