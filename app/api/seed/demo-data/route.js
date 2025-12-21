import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Student from "@/models/Student";
import SchoolConfig from "@/models/SchoolConfig";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
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

    // 3. Create Students
    const studentCount = await Student.countDocuments({ school: schoolAdmin._id });
    if (studentCount === 0) {
        const students = [
            { firstName: "John", lastName: "Doe", grade: "Grade 9", rollNumber: "101" },
            { firstName: "Jane", lastName: "Smith", grade: "Grade 9", rollNumber: "102" },
            { firstName: "Bob", lastName: "Johnson", grade: "Grade 9", rollNumber: "103" },
            { firstName: "Alice", lastName: "Brown", grade: "Grade 10", rollNumber: "201" },
            { firstName: "Charlie", lastName: "Davis", grade: "Grade 8", rollNumber: "001" },
        ];

        for (const s of students) {
            const password = await bcrypt.hash("student123", 10);
            await Student.create({
                ...s,
                name: `${s.firstName} ${s.lastName}`,
                email: `${s.firstName.toLowerCase()}@school.com`,
                school: schoolAdmin._id,
                password,
                status: "ACTIVE"
            });
        }
        console.log("Created 5 Demo Students");
    }

    return NextResponse.json({ message: "Seed successful", schoolId: schoolAdmin._id });
  } catch (error) {
    console.error("Seed Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
