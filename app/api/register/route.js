import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";
import User from "@/models/User";

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

    await User.create({
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
    });

    return NextResponse.json(
      { message: "School registered successfully" },
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
