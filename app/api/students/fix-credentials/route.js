import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Fetch all students for this school
    const students = await Student.find({ school: session.user.id });
    
    let updatedCount = 0;
    let errors = [];

    for (const student of students) {
      try {
        // 1. Parse Name
        const nameParts = student.name.trim().split(/\s+/);
        let firstName = nameParts[0];
        let middleName = "";
        let lastName = "";

        if (nameParts.length === 1) {
            lastName = ""; 
        } else if (nameParts.length === 2) {
            lastName = nameParts[1];
        } else {
            lastName = nameParts[nameParts.length - 1];
            middleName = nameParts.slice(1, -1).join(" ");
        }

        // 2. Generate Credentials
        const cleanFirstName = firstName.replace(/[^a-zA-Z0-9]/g, "") || "Student";
        let username = `${cleanFirstName.toLowerCase()}${student.rollNumber}`;
        
        // Check for duplicate username (excluding self)
        // If duplicate exists, we append a counter to ensure uniqueness while keeping the base format
        let counter = 1;
        let originalUsername = username;
        while (await Student.findOne({ username, school: session.user.id, _id: { $ne: student._id } })) {
            username = `${originalUsername}_${counter}`;
            counter++;
        }

        const password = `${cleanFirstName}@123`;
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Update Student
        student.firstName = firstName;
        student.middleName = middleName;
        student.lastName = lastName;
        student.username = username;
        student.password = hashedPassword;
        student.visiblePassword = password;

        await student.save();
        updatedCount++;
      } catch (err) {
        console.error(`Failed to update student ${student._id}:`, err);
        errors.push({ id: student._id, name: student.name, error: err.message });
      }
    }

    return NextResponse.json({
      message: "Migration completed",
      total: students.length,
      updated: updatedCount,
      errors
    });

  } catch (error) {
    console.error("Migration Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
