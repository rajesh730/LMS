import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";
import User from "@/models/User";
import SchoolConfig from "@/models/SchoolConfig";
import { buildGradeLabels, normalizeSchoolLevelConfig } from "@/lib/schoolGrades";
import { sendSchoolRegistrationReceivedEmail } from "@/lib/emailService";

function getCurrentNepaliYearApprox() {
  const today = new Date();
  const nepaliNewYearHasStarted =
    today.getMonth() > 3 || (today.getMonth() === 3 && today.getDate() >= 14);
  return today.getFullYear() + (nepaliNewYearHasStarted ? 57 : 56);
}

function isValidEstablishedYear(value, calendar = "AD") {
  const cleanedValue = String(value || "").trim();
  if (!/^\d{4}$/.test(cleanedValue)) return false;

  const year = Number.parseInt(cleanedValue, 10);
  const currentAdYear = new Date().getFullYear();
  const currentBsYear = getCurrentNepaliYearApprox();

  if (calendar === "BS") return year >= 1957 && year <= currentBsYear;
  return year >= 1900 && year <= currentAdYear;
}

export async function POST(req) {
  try {
    const {
      email,
      password,
      schoolName,
      principalName,
      principalPhone,
      schoolLocation,
      province,
      district,
      municipality,
      ward,
      tole,
      streetAddress,
      postalCode,
      schoolPhone,
      website,
      establishedYear,
      establishedYearCalendar = "AD",
      schoolConfig: submittedSchoolConfig,
    } = await req.json();

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

    if (!["AD", "BS"].includes(establishedYearCalendar)) {
      return NextResponse.json(
        { message: "Choose AD or BS for established year." },
        { status: 400 }
      );
    }

    if (
      establishedYear &&
      !isValidEstablishedYear(establishedYear, establishedYearCalendar)
    ) {
      return NextResponse.json(
        { message: `Established year must be a valid ${establishedYearCalendar} year.` },
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
    const educationLevels = { school: true };
    const schoolConfig = normalizeSchoolLevelConfig(submittedSchoolConfig);
    const grades = buildGradeLabels(schoolConfig);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      schoolName,
      role: "SCHOOL_ADMIN",
      status: "PENDING",
      principalName,
      principalPhone,
      schoolLocation,
      province,
      district,
      municipality,
      ward,
      tole,
      streetAddress,
      postalCode,
      schoolPhone,
      website,
      establishedYear,
      establishedYearCalendar,
      educationLevels,
      schoolConfig,
    });

    await SchoolConfig.findOneAndUpdate(
      { school: newUser._id },
      {
        school: newUser._id,
        teacherRoles: [],
        teacherRolesCustomized: false,
        grades,
        educationLevels,
        schoolConfig,
      },
      { upsert: true, new: true }
    );

    // Fire-and-forget confirmation; failures are logged inside the helper
    // and must not fail the registration itself.
    sendSchoolRegistrationReceivedEmail(email, schoolName);

    return NextResponse.json(
      {
        message: "School registered successfully",
        educationLevels,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
