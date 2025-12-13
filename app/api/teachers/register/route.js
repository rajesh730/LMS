import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Teacher from "@/models/Teacher";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    const { 
      name, 
      email, 
      phone, 
      subject, 
      qualification, 
      gender, 
      address, 
      dateOfJoining,
      designation,
      experience,
      bloodGroup,
      password, 
      schoolId 
    } = body;

    // Validation
    if (!name || !email || !subject || !password || !schoolId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if User exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash Password for Login
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create User Account
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "TEACHER",
      schoolName: "N/A", // Not applicable for teacher
      status: "APPROVED", // Auto-approve
    });

    // 2. Create Teacher Profile
    const newTeacher = await Teacher.create({
      name,
      email,
      phone,
      subject,
      qualification, // Assuming we add this field to schema, or it will be ignored if strict
      gender,
      address,
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
      designation,
      experience,
      bloodGroup,
      visiblePassword: password, // Store plain text for admin visibility
      school: schoolId,
      roles: ["SUBJECT_TEACHER"],
    });

    return NextResponse.json(
      { 
        message: "Teacher registered successfully", 
        teacher: newTeacher 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Teacher registration error:", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
