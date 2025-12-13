import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Teacher from "@/models/Teacher";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    await connectDB();
    const { teachers, schoolId } = await req.json();

    if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
      return NextResponse.json(
        { message: "No teachers provided" },
        { status: 400 }
      );
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const teacherData of teachers) {
      try {
        // Validation
        if (!teacherData.name || !teacherData.email || !teacherData.subject) {
          throw new Error("Missing required fields (Name, Email, Subject)");
        }

        // Check if User exists
        const existingUser = await User.findOne({ email: teacherData.email });
        if (existingUser) {
          throw new Error(`User with email ${teacherData.email} already exists`);
        }

        // Hash Password
        // Use provided password or generate one if missing (though frontend generates it)
        const plainPassword = teacherData.password || "Teacher@123"; 
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // 1. Create User
        await User.create({
          name: teacherData.name,
          email: teacherData.email,
          password: hashedPassword,
          role: "TEACHER",
          schoolName: "N/A",
          status: "APPROVED",
        });

        // 2. Create Teacher
        const newTeacher = await Teacher.create({
          name: teacherData.name,
          email: teacherData.email,
          phone: teacherData.phone,
          subject: teacherData.subject,
          qualification: teacherData.qualification,
          gender: teacherData.gender,
          address: teacherData.address,
          dateOfJoining: teacherData.dateOfJoining ? new Date(teacherData.dateOfJoining) : undefined,
          designation: teacherData.designation,
          experience: teacherData.experience,
          bloodGroup: teacherData.bloodGroup,
          visiblePassword: plainPassword,
          school: schoolId,
          roles: ["SUBJECT_TEACHER"],
        });

        results.success.push({
          name: newTeacher.name,
          email: newTeacher.email,
        });

      } catch (error) {
        results.failed.push({
          teacher: teacherData,
          reason: error.message,
        });
      }
    }

    return NextResponse.json(
      { 
        message: "Bulk registration completed", 
        data: results 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Bulk teacher registration error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
