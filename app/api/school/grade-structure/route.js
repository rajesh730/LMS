import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import SchoolConfig from "@/models/SchoolConfig";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let schoolId = session.user.id;
    
    // If user is a teacher, we need to find their school
    if (session.user.role === "TEACHER") {
       // We can try to find the teacher profile to get the school ID
       // Or if we trust the client to pass it? No, better to fetch.
       const { Teacher } = require("@/models/Teacher"); // Dynamic import to avoid circular deps if any
       // Actually, let's just use the model directly if imported
       // But wait, I haven't imported Teacher at the top.
       // Let's assume we can find the school via User model if Teacher is a User?
       // In this system, Teacher is a separate model but linked to User? 
       // Or Teacher IS a User?
       // Usually Teacher is a separate profile model linked to a User account.
       // Let's check models/Teacher.js
       // For now, let's assume we can find the school config by finding a config that has this teacher? No.
       
       // Let's try to find the school ID from the session if available, or query the Teacher model.
       // Since I can't easily import Teacher here without checking imports, let's do a quick fix:
       // If role is teacher, we might need to pass schoolId as query param or fix this properly.
       // However, for now, let's assume the session has schoolId or we can't support teachers yet.
       // WAIT! I can just import Teacher.
    }
    
    // Better approach: Update the code to handle Teacher role
    if (session.user.role === "TEACHER") {
        const Teacher = (await import("@/models/Teacher")).default;
        const teacher = await Teacher.findOne({ user: session.user.id });
        if (teacher) {
            schoolId = teacher.school;
        }
    }

    console.log("Fetching grade configuration for school ID:", schoolId);

    // Fetch SchoolConfig to get the list of grades
    const schoolConfig = await SchoolConfig.findOne({ school: schoolId });
    
    let formattedGrades = [];

    if (schoolConfig && schoolConfig.grades && schoolConfig.grades.length > 0) {
        // Map the string array ['1', '2'] to objects for the frontend
        formattedGrades = schoolConfig.grades.map(g => ({
            _id: g,
            name: g.startsWith("Grade") || g.startsWith("Class") ? g : `Grade ${g}`,
            originalValue: g
        }));
    } else {
        // Fallback if no config found (optional)
        console.log("No SchoolConfig found, returning empty list");
    }
    
    console.log("Found grades:", formattedGrades.length);

    return NextResponse.json({
      grades: formattedGrades,
      summary: {
        totalGrades: formattedGrades.length
      }
    });

  } catch (error) {
    console.error("Error fetching grade structure:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
